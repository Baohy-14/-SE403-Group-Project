/**
 * Native Zero-Dependency Redis RESP2 TCP Client (via Node.js node:net)
 * Connects directly to `redis:7-alpine` in Docker Compose to execute real
 * atomic `SET key token NX PX ttl`, `INCR`, and Lua `EVAL` unlock scripts!
 */

const net = require('net');

function encodeRespCommand(args) {
  let out = `*${args.length}\r\n`;
  for (const arg of args) {
    const str = String(arg);
    out += `$${Buffer.byteLength(str, 'utf8')}\r\n${str}\r\n`;
  }
  return out;
}

class RedisRespClient {
  constructor(host, port = 6379, connectTimeoutMs = 500) {
    this.host = host;
    this.port = port;
    this.connectTimeoutMs = connectTimeoutMs;
  }

  sendCommand(args) {
    return new Promise((resolve, reject) => {
      const socket = new net.Socket();
      let settled = false;
      let buffer = Buffer.alloc(0);

      const finish = (err, val) => {
        if (settled) return;
        settled = true;
        socket.destroy();
        if (err) reject(err);
        else resolve(val);
      };

      socket.setTimeout(this.connectTimeoutMs);
      socket.on('timeout', () => finish(new Error('REDIS_TCP_TIMEOUT')));
      socket.on('error', (err) => finish(err));

      socket.connect(this.port, this.host, () => {
        socket.write(encodeRespCommand(args));
      });

      socket.on('data', (chunk) => {
        buffer = Buffer.concat([buffer, chunk]);
        const str = buffer.toString('utf8');
        if (!str.includes('\r\n')) return;

        const prefix = str[0];
        const firstLineEnd = str.indexOf('\r\n');
        const head = str.slice(1, firstLineEnd);

        if (prefix === '+') {
          return finish(null, head); // Simple string e.g. +OK
        }
        if (prefix === '-') {
          return finish(new Error(head)); // Redis error
        }
        if (prefix === ':') {
          return finish(null, parseInt(head, 10)); // Integer reply
        }
        if (prefix === '$') {
          const len = parseInt(head, 10);
          if (len === -1) return finish(null, null); // Null bulk string (lock not acquired)
          const startByte = Buffer.byteLength(`$${head}\r\n`, 'utf8');
          if (buffer.length >= startByte + len + 2) {
            const val = buffer.subarray(startByte, startByte + len).toString('utf8');
            return finish(null, val);
          }
        }
      });
    });
  }
}

module.exports = RedisRespClient;
