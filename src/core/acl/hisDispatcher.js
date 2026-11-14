/**
 * HIS Integration Dispatcher (Anti-Corruption Layer Engine)
 * Manages Circuit Breakers, Translates to Canonical HL7 FHIR, and Routes to Adapters
 */

const CanonicalModelMapper = require('./canonicalModel');
const CircuitBreaker = require('./circuitBreaker');
const DaNangHisJsonAdapter = require('./adapters/daNangJsonAdapter');
const HueHisXmlAdapter = require('./adapters/hueXmlAdapter');
const QuangNamHisAdapter = require('./adapters/quangNamCustomAdapter');
const GenericFhirHisAdapter = require('./adapters/fhirGenericAdapter');

class HisDispatcher {
  constructor() {
    // Registry of adapters: facilityId -> adapter instance
    this.adapters = new Map();
    this.circuitBreakers = new Map();

    // Register built-in adapters
    this.registerAdapter('FAC_DANANG', new DaNangHisJsonAdapter());
    this.registerAdapter('FAC_HUE', new HueHisXmlAdapter());
    this.registerAdapter('FAC_QUANGNAM', new QuangNamHisAdapter());
    this.registerAdapter('FAC_HOIAN', new GenericFhirHisAdapter());
  }

  /**
   * Register or replace an adapter dynamically (Open-Closed Principle)
   */
  registerAdapter(facilityId, adapter) {
    this.adapters.set(facilityId, adapter);
    if (!this.circuitBreakers.has(facilityId)) {
      this.circuitBreakers.set(
        facilityId,
        new CircuitBreaker(`CB_${facilityId}`, {
          failureThreshold: 3,
          resetTimeoutMs: 5000,
          timeoutMs: 2000
        })
      );
    }
  }

  getAdapter(facilityId) {
    return this.adapters.get(facilityId);
  }

  getCircuitBreaker(facilityId) {
    return this.circuitBreakers.get(facilityId);
  }

  /**
   * Dispatch appointment sync to external HIS
   */
  async syncAppointment(facilityId, bookingData) {
    const adapter = this.adapters.get(facilityId);
    if (!adapter) {
      throw new Error(`No HIS Adapter registered for facility [${facilityId}]`);
    }

    const cb = this.circuitBreakers.get(facilityId);

    // 1. Map to Canonical HL7 FHIR Model
    const fhirAppointment = CanonicalModelMapper.toFhirAppointment(bookingData);

    // 2. Execute via Circuit Breaker with Fallback
    return await cb.execute(
      async () => {
        return await adapter.syncAppointment(fhirAppointment);
      },
      async (error) => {
        // Fallback action: Graceful degradation
        return {
          success: false,
          isDegraded: true,
          circuitBreakerState: cb.state,
          hisReferenceCode: `FALLBACK-OUTBOX-${Date.now()}`,
          message: `HIS cơ sở [${facilityId}] tạm thời không phản hồi (${error.message}). Lịch hẹn đã được đưa vào Outbox Queue để đồng bộ tự động khi kết nối phục hồi.`
        };
      }
    );
  }

  /**
   * Get all circuit breaker statuses
   */
  getAllCircuitStatuses() {
    const statuses = {};
    for (const [facilityId, cb] of this.circuitBreakers) {
      statuses[facilityId] = cb.getState();
    }
    return statuses;
  }
}

module.exports = new HisDispatcher();
