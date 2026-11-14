/**
 * Generic HL7 FHIR Integration Adapter (HIS #4 - Hoi An Clinic)
 * Proves ASR-04: Integrating a 4th HIS without modifying any Core Domain code
 */

const BaseHisAdapter = require('./baseAdapter');
const config = require('../../config');

class GenericFhirHisAdapter extends BaseHisAdapter {
  constructor(facilityId = 'FAC_HOIAN', endpoint = config.HIS_GENERIC4_URL) {
    super(facilityId, 'Generic_HL7_FHIR_R4_HIS');
    this.endpoint = endpoint;
  }

  async syncAppointment(fhirAppointment) {
    // Directly send HL7 FHIR Appointment JSON payload
    const response = await fetch(`${this.endpoint}/fhir/Appointment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/fhir+json',
        'Accept': 'application/fhir+json'
      },
      body: JSON.stringify(fhirAppointment)
    });

    if (!response.ok) {
      throw new Error(`HL7 FHIR HIS HTTP Error: ${response.status} ${response.statusText}`);
    }

    const fhirResponse = await response.json();
    return {
      success: true,
      hisReferenceCode: fhirResponse.id || `FHIR-HOIAN-${Date.now()}`,
      details: fhirResponse
    };
  }

  async checkHealth() {
    try {
      const res = await fetch(`${this.endpoint}/fhir/metadata`);
      return res.ok;
    } catch {
      return false;
    }
  }
}

module.exports = GenericFhirHisAdapter;
