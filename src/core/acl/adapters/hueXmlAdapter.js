/**
 * Concrete Adapter 2: HIS Huế (Legacy Client-Server SOAP 1.1 / XML Envelope)
 * Translates HL7 FHIR R4 { Patient, Appointment } <-> Legacy Vietnamese XML tags:
 * `<MaBenhNhanYTe>HUE-BN-...</MaBenhNhanYTe>`, `<MaBacSi>`, `<GioKham>`.
 */

const BaseHisAdapter = require('./baseAdapter');

function escapeXml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

class HueXmlAdapter extends BaseHisAdapter {
  async syncAppointment(canonicalBundle, timeoutMs = 1500) {
    const { patient, appointment } = canonicalBundle;
    const localHuePatientCode =
      patient.identifier.find((i) => i.system.includes(this.facilityId))?.value || `HUE-BN-${patient.id}`;
    const doctorCode =
      appointment.participant
        .find((p) => p.actor.reference.startsWith('Practitioner/'))
        ?.actor.reference.replace('Practitioner/', '') || 'UNKNOWN';
    const idemKey = appointment.identifier?.[0]?.value || appointment.id;

    // Build SOAP 1.1 XML Envelope expected by Legacy Hue Clinic HIS
    const soapXmlEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:hue="http://his.hueclinic.vn/ws/2018">
  <soap:Header>
    <hue:IdempotencyToken>${escapeXml(idemKey)}</hue:IdempotencyToken>
  </soap:Header>
  <soap:Body>
    <hue:DangKyLichKhamRequest>
      <hue:MaThamChieuMediLink>${escapeXml(appointment.id)}</hue:MaThamChieuMediLink>
      <hue:MaBenhNhanYTe>${escapeXml(localHuePatientCode)}</hue:MaBenhNhanYTe>
      <hue:HoTenBenhNhan>${escapeXml(patient.name?.[0]?.text)}</hue:HoTenBenhNhan>
      <hue:MaBacSi>${escapeXml(doctorCode)}</hue:MaBacSi>
      <hue:ThoiGianBatDau>${escapeXml(appointment.start)}</hue:ThoiGianBatDau>
    </hue:DangKyLichKhamRequest>
  </soap:Body>
</soap:Envelope>`;

    const res = await fetch(`${this.baseUrl}/ws/AppointmentService.asmx`, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        SOAPAction: '"http://his.hueclinic.vn/ws/2018/DangKyLichKham"'
      },
      body: soapXmlEnvelope,
      signal: AbortSignal.timeout(timeoutMs)
    });

    if (!res.ok) {
      throw new Error(`HIS_HUE_SOAP_FAULT_HTTP_${res.status}`);
    }

    const xmlResponse = await res.text();
    const match = xmlResponse.match(/<MaTiepDonHue>([^<]+)<\/MaTiepDonHue>/);
    if (!match) {
      throw new Error('HIS_HUE_INVALID_SOAP_XML_RESPONSE');
    }

    return {
      success: true,
      hisReferenceCode: match[1],
      protocol: 'SOAP_XML'
    };
  }
}

module.exports = HueXmlAdapter;
