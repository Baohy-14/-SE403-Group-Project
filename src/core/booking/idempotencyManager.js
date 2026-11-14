/**
 * Idempotency Key Manager
 * Prevents duplicate bookings caused by network re-transmissions or double-clicking
 */

class IdempotencyManager {
  constructor(defaultTtlMs = 60000) {
    this.defaultTtlMs = defaultTtlMs;
    this.cache = new Map(); // key -> { result, expireAt, status }
  }

  get(key) {
    if (!key) return null;
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (entry.expireAt < Date.now()) {
      this.cache.delete(key);
      return null;
    }
    return entry;
  }

  set(key, result, ttlMs = this.defaultTtlMs) {
    if (!key) return;
    this.cache.set(key, {
      result,
      expireAt: Date.now() + ttlMs,
      cachedAt: new Date().toISOString()
    });
  }

  clear() {
    this.cache.clear();
  }
}

module.exports = new IdempotencyManager();
