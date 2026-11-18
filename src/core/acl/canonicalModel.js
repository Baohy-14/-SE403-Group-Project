/**
 * HL7 FHIR Release 4 Canonical Data Model Mapper (Implements ADR-002 & MediLink Guide #3)
 * Standardizes BOTH `Patient` (including MPI <-> Local HIS Patient ID identifiers)
 * AND `Appointment` resources so Core Domain never knows legacy HIS schemas!
 */

class CanonicalModelMapper {
  /**
   * Map internal patient identity to HL7 FHIR R4 `Patient` Resource
   * Spec: https://hl7.org/fhir/R4/patient.html
   */
  static toFhirPatient(bookingPayload) {
    return {
      resourceType: 'Patient',
      id: bookingPayload.patientId,
      identifier: [
        {
          use: 'official',
          system: 'urn:medilink:mpi',
          value: bookingPayload.patientMpi || 'MPI-UNKNOWN'
        },
        {
          use: 'secondary',
          system: `urn:his:facility:${bookingPayload.facilityId}`,
          value: bookingPayload.localHisPatientId || bookingPayload.patientId
        }
      ],
      active: true,
      name: [
        {
          use: 'official',
          text: bookingPayload.patientName
        }
      ]
    };
  }

  /**
   * Map internal booking entity to HL7 FHIR R4 `Appointment` Resource
   * Spec: https://hl7.org/fhir/R4/appointment.html
   */
  static toFhirAppointment(bookingPayload) {
    // Convert "YYYY-MM-DD HH:mm" safely to ISO-8601 +07:00
    const normalizedTime = String(bookingPayload.slotTime).includes('T')
      ? bookingPayload.slotTime
      : `${String(bookingPayload.slotTime).replace(' ', 'T')}:00+07:00`;

    return {
      resourceType: 'Appointment',
      id: bookingPayload.bookingId,
      identifier: [
        {
          system: 'urn:medilink:idempotency',
          value: bookingPayload.idempotencyKey || bookingPayload.bookingId
        }
      ],
      status: 'booked',
      serviceCategory: [
        {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/service-category',
              code: '17',
              display: 'General Practice / Specialty Clinic'
            }
          ]
        }
      ],
      description: `Lịch khám MediLink tại cơ sở ${bookingPayload.facilityId}`,
      start: normalizedTime,
      participant: [
        {
          actor: {
            reference: `Patient/${bookingPayload.patientMpi || bookingPayload.patientId}`,
            identifier: {
              system: `urn:his:facility:${bookingPayload.facilityId}`,
              value: bookingPayload.localHisPatientId || bookingPayload.patientId
            },
            display: bookingPayload.patientName
          },
          status: 'accepted'
        },
        {
          actor: {
            reference: `Practitioner/${bookingPayload.doctorId}`,
            display: `Bác sĩ ${bookingPayload.doctorId}`
          },
          status: 'accepted'
        },
        {
          actor: {
            reference: `Location/${bookingPayload.facilityId}`,
            display: `Cơ sở ${bookingPayload.facilityId}`
          },
          status: 'accepted'
        }
      ]
    };
  }

  /**
   * Build canonical bundle containing both FHIR Patient & FHIR Appointment
   */
  static toCanonicalBundle(bookingPayload) {
    return {
      patient: this.toFhirPatient(bookingPayload),
      appointment: this.toFhirAppointment(bookingPayload)
    };
  }
}

module.exports = CanonicalModelMapper;
