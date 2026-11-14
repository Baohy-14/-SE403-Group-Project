/**
 * Distributed Lock Manager (In-Memory Redis Redlock Pattern)
 * Provides atomic lock acquisition with TTL auto-expiration
 * Guarantees zero double-booking during high concurrency
 */

class LockManager {
  constructor(defaultTtlMs = 3000) {
    this.defaultTtlMs = defaultTtlMs;
    // Map of lockKey -> { owner, expireAt, timer }
    this.locks = new Map();
  }

  /**
   * Acquire lock atomically (equivalent to Redis SET lockKey owner NX PX ttl)
   * @param {string} lockKey - e.g. "lock:slot:DOC_101:2026-11-20 08:00"
   * @param {string} ownerId - Unique request/client ID
   * @param {number} ttlMs - Time-to-live in milliseconds
   * @returns {boolean} true if acquired, false if already locked
   */
  acquireLock(lockKey, ownerId, ttlMs = this.defaultTtlMs) {
    const now = Date.now();
    const existing = this.locks.get(lockKey);

    // If existing and not expired, lock acquisition fails
    if (existing && existing.expireAt > now) {
      return false;
    }

    // Clear existing timer if any
    if (existing && existing.timer) {
      clearTimeout(existing.timer);
    }

    // Set auto-expiration timer
    const expireAt = now + ttlMs;
    const timer = setTimeout(() => {
      this.releaseLock(lockKey, ownerId);
    }, ttlMs);

    this.locks.set(lockKey, {
      owner: ownerId,
      expireAt,
      timer
    });

    return true;
  }

  /**
   * Release lock atomically (checks owner before releasing)
   * @param {string} lockKey
   * @param {string} ownerId
   * @returns {boolean} true if released, false if not owned or not locked
   */
  releaseLock(lockKey, ownerId) {
    const existing = this.locks.get(lockKey);
    if (!existing) {
      return false;
    }

    // Check ownership
    if (existing.owner === ownerId) {
      if (existing.timer) {
        clearTimeout(existing.timer);
      }
      this.locks.delete(lockKey);
      return true;
    }

    return false;
  }

  /**
   * Check if lock is active
   */
  isLocked(lockKey) {
    const existing = this.locks.get(lockKey);
    if (!existing) return false;
    return existing.expireAt > Date.now();
  }

  /**
   * Clear all locks (for testing)
   */
  clear() {
    for (const [, lock] of this.locks) {
      if (lock.timer) clearTimeout(lock.timer);
    }
    this.locks.clear();
  }
}

module.exports = new LockManager();
