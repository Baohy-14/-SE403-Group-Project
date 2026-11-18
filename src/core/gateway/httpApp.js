/**
 * Lightweight Zero-Dependency HTTP Application Router (Node.js 22 native node:http)
 * Provides Express-compatible req/res/middleware ergonomics without external npm bloat,
 * ensuring 100% deterministic startup in both Docker Alpine and standalone laptops.
 */

const http = require('http');
const { URL } = require('url');
const crypto = require('crypto');

function compilePath(pattern) {
  const paramNames = [];
  const regexSource = pattern
    .replace(/\/+$/, '')
    .replace(/:([a-zA-Z0-9_]+)/g, (_, name) => {
      paramNames.push(name);
      return '([^/]+)';
    });
  const finalRegex = new RegExp(`^${regexSource || '/'}/?$`);
  return { regex: finalRegex, paramNames };
}

function createHttpApp() {
  const routes = [];
  const prefixMiddlewares = [];

  function use(prefixOrFn, maybeFn) {
    if (typeof prefixOrFn === 'function') {
      prefixMiddlewares.push({ prefix: '/', fn: prefixOrFn });
    } else {
      prefixMiddlewares.push({ prefix: prefixOrFn, fn: maybeFn });
    }
  }

  function register(method, pattern, ...handlers) {
    const { regex, paramNames } = compilePath(pattern);
    routes.push({ method: method.toUpperCase(), pattern, regex, paramNames, handlers });
  }

  async function readBody(req) {
    return new Promise((resolve, reject) => {
      const chunks = [];
      let total = 0;
      req.on('data', (chunk) => {
        total += chunk.length;
        if (total > 2 * 1024 * 1024) {
          reject(new Error('PAYLOAD_TOO_LARGE'));
          req.destroy();
          return;
        }
        chunks.push(chunk);
      });
      req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      req.on('error', reject);
    });
  }

  const serverHandler = async (req, res) => {
    const requestId = req.headers['x-request-id'] || `req_${crypto.randomUUID().slice(0, 12)}`;
    res.setHeader('X-Request-Id', requestId);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');

    const parsedUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    req.path = parsedUrl.pathname;
    req.query = Object.fromEntries(parsedUrl.searchParams.entries());
    req.requestId = requestId;
    req.ip =
      (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
      req.socket?.remoteAddress ||
      '127.0.0.1';

    let currentStatus = 200;
    let responded = false;

    res.status = (code) => {
      currentStatus = code;
      return res;
    };

    res.json = (payload) => {
      if (responded) return res;
      responded = true;
      const body = JSON.stringify(payload);
      res.writeHead(currentStatus, {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(body)
      });
      res.end(body);
      return res;
    };

    res.send = (body, contentType = 'text/plain; charset=utf-8') => {
      if (responded) return res;
      responded = true;
      const buf = Buffer.isBuffer(body) ? body : Buffer.from(String(body), 'utf8');
      res.writeHead(currentStatus, {
        'Content-Type': contentType,
        'Content-Length': buf.length
      });
      res.end(buf);
      return res;
    };

    try {
      const rawBody = await readBody(req);
      req.rawBody = rawBody;
      const contentType = (req.headers['content-type'] || '').toLowerCase();
      if (rawBody && (contentType.includes('application/json') || contentType.includes('+json'))) {
        try {
          req.body = JSON.parse(rawBody);
        } catch {
          return res.status(400).json({
            success: false,
            error: 'INVALID_JSON',
            message: 'Payload JSON không hợp lệ.'
          });
        }
      } else {
        req.body = {};
      }

      // Execute matching prefix middlewares
      for (const mw of prefixMiddlewares) {
        if (req.path === mw.prefix || req.path.startsWith(mw.prefix === '/' ? '/' : `${mw.prefix}`)) {
          let nextCalled = false;
          await new Promise((resolve, reject) => {
            try {
              const maybePromise = mw.fn(req, res, (err) => {
                if (err) return reject(err);
                nextCalled = true;
                resolve();
              });
              if (maybePromise && typeof maybePromise.then === 'function') {
                maybePromise.then(() => {
                  if (responded) resolve();
                }).catch(reject);
              } else if (responded) {
                resolve();
              }
            } catch (err) {
              reject(err);
            }
          });
          if (responded || !nextCalled) return;
        }
      }

      // Match route
      let matchedRoute = null;
      let params = {};
      for (const route of routes) {
        if (route.method !== req.method.toUpperCase()) continue;
        const match = req.path.match(route.regex);
        if (match) {
          matchedRoute = route;
          route.paramNames.forEach((name, idx) => {
            params[name] = decodeURIComponent(match[idx + 1]);
          });
          break;
        }
      }

      if (!matchedRoute) {
        return res.status(404).json({
          success: false,
          error: 'ROUTE_NOT_FOUND',
          message: `Không tìm thấy endpoint [${req.method} ${req.path}]`
        });
      }

      req.params = params;

      // Run handler chain
      for (let i = 0; i < matchedRoute.handlers.length; i++) {
        const handler = matchedRoute.handlers[i];
        let nextCalled = false;
        await new Promise((resolve, reject) => {
          try {
            const maybePromise = handler(req, res, (err) => {
              if (err) return reject(err);
              nextCalled = true;
              resolve();
            });
            if (maybePromise && typeof maybePromise.then === 'function') {
              maybePromise.then(() => resolve()).catch(reject);
            } else if (responded || i === matchedRoute.handlers.length - 1) {
              resolve();
            }
          } catch (err) {
            reject(err);
          }
        });
        if (responded || (!nextCalled && i < matchedRoute.handlers.length - 1)) {
          break;
        }
      }
    } catch (err) {
      if (!responded) {
        res.status(err.statusCode || 500).json({
          success: false,
          error: err.code || 'INTERNAL_SERVER_ERROR',
          message: err.message || 'Lỗi hệ thống nội bộ.'
        });
      }
    }
  };

  return {
    use,
    get: (p, ...h) => register('GET', p, ...h),
    post: (p, ...h) => register('POST', p, ...h),
    put: (p, ...h) => register('PUT', p, ...h),
    patch: (p, ...h) => register('PATCH', p, ...h),
    delete: (p, ...h) => register('DELETE', p, ...h),
    listen: (port, hostOrCb, maybeCb) => {
      const server = http.createServer(serverHandler);
      if (typeof hostOrCb === 'function') {
        return server.listen(port, hostOrCb);
      }
      return server.listen(port, hostOrCb || '0.0.0.0', maybeCb);
    }
  };
}

module.exports = { createHttpApp };
