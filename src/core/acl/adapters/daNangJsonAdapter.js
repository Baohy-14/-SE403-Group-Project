/**
 * Da Nang HIS Integration Adapter
 * Protocol: REST / JSON
 */

const BaseHisAdapter = require('./baseAdapter');
const config = require('../../config');

class DaNangHisJsonAdapter extends BaseHisAdapter {
  constructor() {
    super('FAC_DANANG', 'DaNang_Modern_REST_HIS');
    this.endpoint = config.HIS_DANANG_URL;
  }

  async syncAppointment(fhirAppointment) {
    // 1. Transform FHIR to Da Nang REST payload
    const daNangPayload = {
      hospital_code: 'HIS_DN_01',
      booking_ref: fhirAppointment.id,
      patient_name: fhirAppointment.participant[0]?.actor?.display || 'Bệnh nhân',
      doctor_code: fhirAppointment.participant[1]?.actor?.reference.replace('Practitioner/', ''),
      appointment_time: fhirAppointment.start,
      notes: fhirAppointment.comment
    };

    // 2. HTTP POST call
    const response = await fetch(`${this.endpoint}/api/appointments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'DANANG-HIS-SECRET-KEY-99'
      },
      body: JSON.stringify(daNangPayload)
    });

    if (!response.ok) {
      throw new Error(`DaNang HIS HTTP Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return {
      success: true,
      hisReferenceCode: data.his_appointment_id || `DN-ACK-${Date.now()}`,
      details: data
    };
  }

  async checkHealth() {
    try {
      const res = await fetch(`${this.endpoint}/health`);
      return res.ok;
    } catch {
      return false;
    }
  }
}

module.exports = DaNangHisJsonAdapter;
