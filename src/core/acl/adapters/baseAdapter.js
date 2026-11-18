/**
 * Port Interface: IHisIntegrationAdapter (Hexagonal / Ports-and-Adapters Pattern)
 * Every legacy or modern HIS Adapter MUST implement this contract.
 */

class BaseHisAdapter {
  constructor(facilityId, baseUrl) {
    if (new.target === BaseHisAdapter) {
      throw new Error('BaseHisAdapter is an abstract Port interface and cannot be instantiated directly.');
    }
    this.facilityId = facilityId;
    this.baseUrl = baseUrl;
  }

  /**
   * @param {{ patient: object, appointment: object }} canonicalBundle - HL7 FHIR R4 resources
   * @param {number} timeoutMs - Strict timeout budget enforced by ACL
   * @returns {Promise<{ success: boolean, hisReferenceCode: string, protocol: string }>}
   */
  async syncAppointment(canonicalBundle, timeoutMs = 1500) {
    throw new Error('Method syncAppointment(canonicalBundle, timeoutMs) must be implemented by concrete adapter.');
  }

  async checkHealth(timeoutMs = 1000) {
    const res = await fetch(`${this.baseUrl}/health`, {
      signal: AbortSignal.timeout(timeoutMs)
    });
    return res.ok;
  }
}

module.exports = BaseHisAdapter;
