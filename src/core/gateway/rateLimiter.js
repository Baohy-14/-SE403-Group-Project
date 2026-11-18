/**
 * Token Bucket Rate Limiter Middleware (Architecture v2 - Risk R-01 Mitigation)
 * Protects Redis Lock Engine & Booking Core from F5 refresh storms / automated spam
 * per client IP / actor key, while allowing legitimate multi-patient bursts.
 */

class TokenBucketRateLimiter {
  constructor({ capacity = 60, refillPerSec = 10 } = {}) {
    this.capacity = capacity;
    this.refillPerSec = refillPerSec;
    this.buckets = new Map();
  }

  consume(key, cost = 1) {
    const now = Date.now();
    const bucket = this.buckets.get(key) || {
      tokens: this.capacity,
      lastRefill: now
    };

    const elapsedSec = Math.max(0, (now - bucket.lastRefill) / 1000);
    bucket.tokens = Math.min(this.capacity, bucket.tokens + elapsedSec * this.refillPerSec);
    bucket.lastRefill = now;

    if (bucket.tokens < cost) {
      this.buckets.set(key, bucket);
      const retryAfterSec = Math.ceil((cost - bucket.tokens) / this.refillPerSec);
      return { allowed: false, remaining: Math.floor(bucket.tokens), retryAfterSec };
    }

    bucket.tokens -= cost;
    this.buckets.set(key, bucket);
    return { allowed: true, remaining: Math.floor(bucket.tokens), retryAfterSec: 0 };
  }

  reset() {
    this.buckets.clear();
  }

  middleware() {
    return (req, res, next) => {
      // Key by X-Client-Id (if distinct patient session) or IP address
      const actorKey = req.headers['x-client-id'] || req.ip || '127.0.0.1';
      const check = this.consume(actorKey, 1);

      res.setHeader('X-RateLimit-Limit', String(this.capacity));
      res.setHeader('X-RateLimit-Remaining', String(check.remaining));

      if (!check.allowed) {
        res.setHeader('Retry-After', String(check.retryAfterSec));
        return res.status(429).json({
          success: false,
          error: 'RATE_LIMIT_EXCEEDED',
          message: 'Vượt quá giới hạn tần suất yêu cầu (Token Bucket). Vui lòng thử lại sau ít giây.',
          retry_after_sec: check.retryAfterSec
        });
      }
      next();
    };
  }
}

module.exports = TokenBucketRateLimiter;
