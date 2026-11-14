/**
 * Circuit Breaker Pattern Implementation
 * Prevents cascading failures when external HIS systems are unresponsive
 * States: CLOSED, OPEN, HALF_OPEN
 */

class CircuitBreaker {
  constructor(name, options = {}) {
    this.name = name;
    this.failureThreshold = options.failureThreshold || 3;
    this.resetTimeoutMs = options.resetTimeoutMs || 5000; // 5s before entering HALF_OPEN
    this.timeoutMs = options.timeoutMs || 2000;

    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.successCount = 0;
  }

  async execute(actionFn, fallbackFn) {
    const now = Date.now();

    // Check if OPEN state has expired and should transition to HALF_OPEN
    if (this.state === 'OPEN') {
      if (now - this.lastFailureTime > this.resetTimeoutMs) {
        this.state = 'HALF_OPEN';
        this.successCount = 0;
      } else {
        // Fast-fail: Circuit is OPEN
        if (fallbackFn) {
          return fallbackFn(new Error(`CircuitBreaker [${this.name}] is OPEN (Fast-Fail)`));
        }
        const err = new Error(`CircuitBreaker [${this.name}] is OPEN (Fast-Fail). External service is down.`);
        err.isCircuitBreakerOpen = true;
        throw err;
      }
    }

    try {
      // Execute action with timeout
      const result = await Promise.race([
        actionFn(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`Timeout after ${this.timeoutMs}ms calling ${this.name}`)), this.timeoutMs)
        )
      ]);

      // Success handling
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure(err);
      if (fallbackFn) {
        return fallbackFn(err);
      }
      throw err;
    }
  }

  onSuccess() {
    this.failureCount = 0;
    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= 2) {
        this.state = 'CLOSED';
      }
    }
  }

  onFailure(err) {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === 'HALF_OPEN' || this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
    }
  }

  getState() {
    return {
      name: this.name,
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime ? new Date(this.lastFailureTime).toISOString() : null
    };
  }

  // Force state (useful for tests)
  forceState(newState) {
    this.state = newState;
    if (newState === 'OPEN') {
      this.lastFailureTime = Date.now();
    }
  }
}

module.exports = CircuitBreaker;
