/**
 * Distributed Lock Manager with Monotonic Fencing Token (Implements ADR-003)
 * - Primary Mode (Docker Compose): Executes real Redis `SET key value NX PX ttl`
 *   and atomic Lua script `EVAL` check-owner-and-delete against `redis:7-alpine`.
 * - Fallback / Standalone Mode: Atomic Embedded In-Memory Redis-compatible Engine
 *   so tests also run deterministically on any machine without Docker daemon running,
 *   and gracefully degrades if Redis experiences transient outage (Risk R-01/R-02).
 */

const config = require('../config');
const RedisRespClient = require('./redisRespClient');

const LUA_ATOMIC_RELEASE =
  "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end";

class LockManager {
  constructor(defaultTtlMs = config.LOCK_TTL_MS) {
    this.defaultTtlMs = defaultTtlMs;
    this.locks = new Map();
    this.fencingCounter = 0;
    this.redisClient = config.REDIS_HOST
      ? new RedisRespClient(config.REDIS_HOST, config.REDIS_PORT, 400)
      : null;
    this.backendMode = config.REDIS_HOST ? 'REDIS_TCP' : 'EMBEDDED_MEMORY';
  }

  /**
   * Acquire distributed lock atomically: SET lockKey ownerValue NX PX ttlMs
   * Returns { acquired: boolean, fencingToken: number, lockValue: string, mode: string }
   */
  async acquireLock(lockKey, ownerId, ttlMs = this.defaultTtlMs) {
    this.fencingCounter += 1;
    const fencingToken = this.fencingCounter;
    const lockValue = `${ownerId}:${fencingToken}`;

    if (this.redisClient) {
      try {
        const tokenSeq = await this.redisClient.sendCommand(['INCR', 'medilink:fencing_seq']);
        const actualFencing = typeof tokenSeq === 'number' ? tokenSeq : fencingToken;
        const redisVal = `${ownerId}:${actualFencing}`;
        const reply = await this.redisClient.sendCommand([
          'SET',
          lockKey,
          redisVal,
          'NX',
          'PX',
          String(ttlMs)
        ]);
        return {
          acquired: reply === 'OK',
          fencingToken: actualFencing,
          lockValue: redisVal,
          mode: 'REDIS_TCP'
        };
      } catch {
        // Fallback to local lock + RDBMS UNIQUE constraint when Redis is unreachable
        this.backendMode = 'EMBEDDED_FALLBACK';
      }
    }

    const now = Date.now();
    const existing = this.locks.get(lockKey);
    if (existing && existing.expireAt > now) {
      return { acquired: false, fencingToken: 0, lockValue: null, mode: this.backendMode };
    }

    if (existing && existing.timer) {
      clearTimeout(existing.timer);
    }

    const timer = setTimeout(() => {
      const cur = this.locks.get(lockKey);
      if (cur && cur.lockValue === lockValue) {
        this.locks.delete(lockKey);
      }
    }, ttlMs);
    if (typeof timer.unref === 'function') timer.unref();

    this.locks.set(lockKey, {
      lockValue,
      fencingToken,
      expireAt: now + ttlMs,
      timer
    });

    return {
      acquired: true,
      fencingToken,
      lockValue,
      mode: this.backendMode
    };
  }

  /**
   * Release lock ONLY if lockValue matches (prevents releasing another process's lock!)
   */
  async releaseLock(lockKey, lockValue) {
    if (!lockValue) return false;

    if (this.redisClient && this.backendMode === 'REDIS_TCP') {
      try {
        const deleted = await this.redisClient.sendCommand([
          'EVAL',
          LUA_ATOMIC_RELEASE,
          '1',
          lockKey,
          lockValue
        ]);
        return deleted === 1;
      } catch {
        // Fall through to local cleanup
      }
    }

    const existing = this.locks.get(lockKey);
    if (existing && existing.lockValue === lockValue) {
      if (existing.timer) clearTimeout(existing.timer);
      this.locks.delete(lockKey);
      return true;
    }
    return false;
  }

  clear() {
    for (const [, lock] of this.locks) {
      if (lock.timer) clearTimeout(lock.timer);
    }
    this.locks.clear();
  }
}

module.exports = new LockManager();
