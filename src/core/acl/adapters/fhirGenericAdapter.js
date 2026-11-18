/**
 * Concrete Adapter 4: Generic HL7 FHIR R4 Adapter (Implements ASR-04 Extensibility)
 * Allows onboarding a 4th Clinic HIS (e.g., Phòng khám Quốc tế Hội An) speaking native
 * HL7 FHIR R4 `Appointment` & `Patient` with ZERO lines changed in Core Domain!
 */

const BaseHisAdapter = require('./baseAdapter');

class FhirGenericAdapter extends BaseHisAdapter {
  async syncAppointment(canonicalBundle, timeoutMs = 1500) {
    const { appointment } = canonicalBundle;
    const idemKey = appointment.identifier?.[0]?.value || appointment.id;

    const res = await fetch(`${this.baseUrl}/fhir/r4/Appointment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/fhir+json',
        'X-Idempotency-Key': idemKey
      },
      body: JSON.stringify(appointment),
      signal: AbortSignal.timeout(timeoutMs)
    });

    if (!res.ok) {
      throw new Error(`HIS_FHIR_R4_HTTP_${res.status}`);
    }

    const fhirCreated = await res.json();
    return {
      success: true,
      hisReferenceCode: fhirCreated.id || `FHIR-${Date.now()}`,
      protocol: 'HL7_FHIR_R4'
    };
  }
}

module.exports = FhirGenericAdapter;
