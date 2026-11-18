/**
 * Read-Through Slot & Catalog Cache with Immediate Write-Through Invalidation (Implements QAS-06)
 * Serves high-frequency `GET /api/slots` queries from memory (TTL = 15s) and immediately
 * invalidates affected facility/doctor keys whenever a booking is created or cancelled!
 */

class SlotReadCache {
  constructor(defaultTtlMs = 15000) {
    this.defaultTtlMs = defaultTtlMs;
    this.entries = new Map();
    this.hits = 0;
    this.misses = 0;
  }

  makeKey({ doctorId = '', facilityId = '', status = '' } = {}) {
    return `slots:${doctorId || '*'}:${facilityId || '*'}:${status || '*'}`;
  }

  get(queryFilter) {
    const key = this.makeKey(queryFilter);
    const entry = this.entries.get(key);
    if (!entry) {
      this.misses += 1;
      return null;
    }
    if (entry.expireAt <= Date.now()) {
      this.entries.delete(key);
      this.misses += 1;
      return null;
    }
    this.hits += 1;
    return entry.data;
  }

  set(queryFilter, data, ttlMs = this.defaultTtlMs) {
    const key = this.makeKey(queryFilter);
    this.entries.set(key, {
      data,
      expireAt: Date.now() + ttlMs
    });
  }

  /**
   * Immediately invalidate cached slot views upon booking creation, cancellation, or reset
   */
  invalidateAll() {
    this.entries.clear();
  }
}

module.exports = new SlotReadCache();
