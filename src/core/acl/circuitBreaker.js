/**
 * Per-Facility Circuit Breaker & Bulkhead Fault Isolator (Implements ASR-02 & ADR-007)
 * Finite State Machine: CLOSED -> OPEN -> HALF_OPEN -> CLOSED
 * Protects MediLink Core from cascading failure / thread starvation when any facility HIS
 * (e.g. HIS Huế) goes offline or hangs for 2 hours!
 */

const config = require('../config');

class CircuitBreaker {
  constructor(name, options = {}) {
    this.name = name;
    this.failureThreshold = options.failureThreshold || config.CB_FAILURE_THRESHOLD;
    this.resetTimeoutMs = options.resetTimeoutMs || config.CB_RESET_TIMEOUT_MS;
    this.timeoutBudgetMs = options.timeoutBudgetMs || config.HIS_TIMEOUT_MS;
    this.halfOpenSuccessThreshold = options.halfOpenSuccessThreshold || 2;

    this.state = 'CLOSED';
    this.failureCount = 0;
    this.halfOpenSuccesses = 0;
    this.openedAt = null;
    this.lastError = null;
    this.metrics = {
      totalCalls: 0,
      succeeded: 0,
      failed: 0,
      fastFailedOpen: 0
    };
  }

  canAttempt() {
    if (this.state === 'CLOSED' || this.state === 'HALF_OPEN') {
      return true;
    }
    if (this.state === 'OPEN') {
      const elapsed = Date.now() - (this.openedAt || 0);
      if (elapsed >= this.resetTimeoutMs) {
        this.state = 'HALF_OPEN';
        this.halfOpenSuccesses = 0;
        return true;
      }
      return false;
    }
    return false;
  }

  async execute(actionFn) {
    this.metrics.totalCalls += 1;

    if (!this.canAttempt()) {
      this.metrics.fastFailedOpen += 1;
      const err = new Error(`CIRCUIT_OPEN_FAST_FAIL [${this.name}]`);
      err.code = 'CIRCUIT_OPEN';
      throw err;
    }

    let timeoutHandle = null;
    try {
      const timeoutPromise = new Promise((_, reject) => {
        timeoutHandle = setTimeout(() => {
          const tErr = new Error(`HIS_TIMEOUT_EXCEEDED_${this.timeoutBudgetMs}MS [${this.name}]`);
          tErr.code = 'HIS_TIMEOUT';
          reject(tErr);
        }, this.timeoutBudgetMs);
        if (typeof timeoutHandle.unref === 'function') timeoutHandle.unref();
      });

      const result = await Promise.race([actionFn(this.timeoutBudgetMs), timeoutPromise]);
      clearTimeout(timeoutHandle);
      this.onSuccess();
      return result;
    } catch (err) {
      if (timeoutHandle) clearTimeout(timeoutHandle);
      this.onFailure(err);
      throw err;
    }
  }

  onSuccess() {
    this.metrics.succeeded += 1;
    if (this.state === 'HALF_OPEN') {
      this.halfOpenSuccesses += 1;
      if (this.halfOpenSuccesses >= this.halfOpenSuccessThreshold) {
        this.state = 'CLOSED';
        this.failureCount = 0;
        this.openedAt = null;
        this.lastError = null;
      }
    } else {
      this.failureCount = 0;
      this.lastError = null;
    }
  }

  onFailure(err) {
    this.metrics.failed += 1;
    this.failureCount += 1;
    this.lastError = err.message;

    if (this.state === 'HALF_OPEN' || this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      this.openedAt = Date.now();
    }
  }

  reset() {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.halfOpenSuccesses = 0;
    this.openedAt = null;
    this.lastError = null;
  }

  getStatus() {
    // Allow automatic inspection transition if reset window passed
    if (this.state === 'OPEN' && Date.now() - (this.openedAt || 0) >= this.resetTimeoutMs) {
      this.state = 'HALF_OPEN';
      this.halfOpenSuccesses = 0;
    }
    return {
      facility: this.name,
      state: this.state,
      failureCount: this.failureCount,
      failureThreshold: this.failureThreshold,
      lastError: this.lastError,
      metrics: { ...this.metrics }
    };
  }
}

module.exports = CircuitBreaker;
