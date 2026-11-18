/**
 * Concrete Adapter 1: HIS Đà Nẵng (Modern REST / JSON Schema)
 * Translates HL7 FHIR R4 { Patient, Appointment } -> HIS Đà Nẵng REST JSON contract.
 * Demonstrates heterogeneous patient ID mapping: MPI -> `pat_uuid_dn_*`.
 */

const BaseHisAdapter = require('./baseAdapter');

class DaNangJsonAdapter extends BaseHisAdapter {
  async syncAppointment(canonicalBundle, timeoutMs = 1500) {
    const { patient, appointment } = canonicalBundle;
    const localPatId =
      patient.identifier.find((i) => i.system.includes(this.facilityId))?.value || patient.id;
    const doctorRef =
      appointment.participant.find((p) => p.actor.reference.startsWith('Practitioner/'))?.actor.reference || '';
    const idemKey = appointment.identifier?.[0]?.value || appointment.id;

    // Translate from HL7 FHIR R4 Canonical Model -> Da Nang HIS specific JSON payload
    const daNangPayload = {
      externalBookingUuid: appointment.id,
      patientUuid: localPatId,
      patientFullName: patient.name?.[0]?.text || 'Unknown',
      practitionerCode: doctorRef.replace('Practitioner/', ''),
      scheduledIsoStart: appointment.start,
      bookingChannel: 'MEDILINK_ONLINE'
    };

    const res = await fetch(`${this.baseUrl}/api/v2/appointments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Idempotency-Key': idemKey
      },
      body: JSON.stringify(daNangPayload),
      signal: AbortSignal.timeout(timeoutMs)
    });

    if (!res.ok) {
      throw new Error(`HIS_DANANG_HTTP_${res.status}`);
    }

    const data = await res.json();
    return {
      success: true,
      hisReferenceCode: data.dnConfirmationCode || `DN-${Date.now()}`,
      protocol: 'REST_JSON'
    };
  }
}

module.exports = DaNangJsonAdapter;
