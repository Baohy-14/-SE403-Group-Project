/**
 * Hue Legacy HIS Integration Adapter
 * Protocol: SOAP / XML Service
 */

const BaseHisAdapter = require('./baseAdapter');
const config = require('../../config');

class HueHisXmlAdapter extends BaseHisAdapter {
  constructor() {
    super('FAC_HUE', 'Hue_Legacy_SOAP_HIS');
    this.endpoint = config.HIS_HUE_URL;
  }

  async syncAppointment(fhirAppointment) {
    // 1. Transform FHIR to SOAP / XML Envelope
    const doctorCode = fhirAppointment.participant[1]?.actor?.reference.replace('Practitioner/', '');
    const patientName = fhirAppointment.participant[0]?.actor?.display || 'Bệnh nhân';

    const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:his="http://huehospital.vn/his/ws">
  <soap:Header>
    <his:AuthToken>HUE-SOAP-CREDENTIALS-2026</his:AuthToken>
  </soap:Header>
  <soap:Body>
    <his:RegisterAppointmentRequest>
      <his:ExternalBookingId>${fhirAppointment.id}</his:ExternalBookingId>
      <his:DoctorId>${doctorCode}</his:DoctorId>
      <his:PatientFullName>${patientName}</his:PatientFullName>
      <his:ScheduledDateTime>${fhirAppointment.start}</his:ScheduledDateTime>
      <his:ClinicDepartment>NoiKhoa</his:ClinicDepartment>
    </his:RegisterAppointmentRequest>
  </soap:Body>
</soap:Envelope>`;

    // 2. HTTP POST with text/xml Content-Type
    const response = await fetch(`${this.endpoint}/ws/appointmentService.asmx`, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': 'http://huehospital.vn/his/ws/RegisterAppointment'
      },
      body: soapEnvelope
    });

    if (!response.ok) {
      throw new Error(`Hue HIS SOAP Error: ${response.status} ${response.statusText}`);
    }

    const xmlResponse = await response.text();

    // Simple regex parser for SOAP response
    const match = xmlResponse.match(/<his:HisReceptionTicketNumber>(.*?)<\/his:HisReceptionTicketNumber>/);
    const receptionCode = match ? match[1] : `HUE-SOAP-${Date.now()}`;

    return {
      success: true,
      hisReferenceCode: receptionCode,
      details: { rawXmlLength: xmlResponse.length }
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

module.exports = HueHisXmlAdapter;
