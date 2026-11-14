/**
 * Quang Nam HIS Integration Adapter
 * Protocol: Custom REST RPC
 */

const BaseHisAdapter = require('./baseAdapter');
const config = require('../../config');

class QuangNamHisAdapter extends BaseHisAdapter {
  constructor() {
    super('FAC_QUANGNAM', 'QuangNam_Custom_HIS');
    this.endpoint = config.HIS_QUANGNAM_URL;
  }

  async syncAppointment(fhirAppointment) {
    const customPayload = {
      action: 'BOOK_APPOINTMENT',
      version: '2.1',
      params: {
        ext_id: fhirAppointment.id,
        bs_id: fhirAppointment.participant[1]?.actor?.reference.replace('Practitioner/', ''),
        bn_ten: fhirAppointment.participant[0]?.actor?.display,
        gio_kham: fhirAppointment.start
      }
    };

    const response = await fetch(`${this.endpoint}/his/v1/booking`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Token QN-SECRET-55'
      },
      body: JSON.stringify(customPayload)
    });

    if (!response.ok) {
      throw new Error(`QuangNam HIS Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return {
      success: true,
      hisReferenceCode: data.ticket_no || `QN-${Date.now()}`,
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

module.exports = QuangNamHisAdapter;
