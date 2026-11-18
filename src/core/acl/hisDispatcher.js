/**
 * Anti-Corruption Layer (ACL) Central Dispatcher
 * Coordinates:
 *  1. Canonical HL7 FHIR R4 Mapping (`Patient` + `Appointment`)
 *  2. Per-Facility Circuit Breaker Fault Isolation (Bulkhead per facility)
 *  3. Pluggable Adapter Registry (Open-Closed Principle for ASR-04)
 */

const config = require('../config');
const CanonicalModelMapper = require('./canonicalModel');
const CircuitBreaker = require('./circuitBreaker');
const DaNangJsonAdapter = require('./adapters/daNangJsonAdapter');
const HueXmlAdapter = require('./adapters/hueXmlAdapter');
const QuangNamCustomAdapter = require('./adapters/quangNamCustomAdapter');

class HisIntegrationDispatcher {
  constructor() {
    this.adapters = new Map();
    this.circuitBreakers = new Map();

    // Register initial 3 heterogeneous HIS adapters for the 12 clinics
    this.registerAdapter('FAC_DANANG', new DaNangJsonAdapter('FAC_DANANG', config.HIS_DANANG_URL));
    this.registerAdapter('FAC_HUE', new HueXmlAdapter('FAC_HUE', config.HIS_HUE_URL));
    this.registerAdapter('FAC_QUANGNAM', new QuangNamCustomAdapter('FAC_QUANGNAM', config.HIS_QUANGNAM_URL));
  }

  /**
   * Dynamically register a new HIS Adapter without touching Core Booking logic (ASR-04)
   */
  registerAdapter(facilityId, adapterInstance, cbOptions = {}) {
    this.adapters.set(facilityId, adapterInstance);
    this.circuitBreakers.set(facilityId, new CircuitBreaker(facilityId, cbOptions));
  }

  async syncAppointment(facilityId, bookingPayload) {
    const adapter = this.adapters.get(facilityId);
    const circuitBreaker = this.circuitBreakers.get(facilityId);

    if (!adapter || !circuitBreaker) {
      throw new Error(`NO_HIS_ADAPTER_REGISTERED_FOR_${facilityId}`);
    }

    // Translate internal domain payload -> Canonical HL7 FHIR R4 Bundle { Patient, Appointment }
    const canonicalBundle = CanonicalModelMapper.toCanonicalBundle(bookingPayload);

    // Execute outbound HIS call inside isolated per-facility Circuit Breaker
    return circuitBreaker.execute((timeoutBudgetMs) =>
      adapter.syncAppointment(canonicalBundle, timeoutBudgetMs)
    );
  }

  getCircuitStatus(facilityId) {
    const cb = this.circuitBreakers.get(facilityId);
    return cb ? cb.getStatus() : null;
  }

  getAllCircuitStatuses() {
    const statuses = {};
    for (const [facId, cb] of this.circuitBreakers.entries()) {
      statuses[facId] = cb.getStatus();
    }
    return statuses;
  }

  resetAllCircuits() {
    for (const [, cb] of this.circuitBreakers.entries()) {
      cb.reset();
    }
  }
}

module.exports = new HisIntegrationDispatcher();
