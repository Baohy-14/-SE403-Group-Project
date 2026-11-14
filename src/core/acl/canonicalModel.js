/**
 * HL7 FHIR Release 4 Canonical Data Model Mapper
 * Maps internal MediLink booking to standardized FHIR Appointment resource
 */

class CanonicalModelMapper {
  /**
   * Map MediLink booking entity to standard HL7 FHIR Appointment Resource
   * Specification: http://hl7.org/fhir/R4/appointment.html
   */
  static toFhirAppointment(booking) {
    return {
      resourceType: 'Appointment',
      id: booking.bookingId || booking.id,
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
      description: `Lịch khám tại cơ sở ${booking.facilityId}`,
      start: new Date(booking.slotTime).toISOString(),
      participant: [
        {
          actor: {
            reference: `Patient/${booking.patientId}`,
            display: booking.patientName
          },
          status: 'accepted'
        },
        {
          actor: {
            reference: `Practitioner/${booking.doctorId}`,
            display: `Bác sĩ ${booking.doctorId}`
          },
          status: 'accepted'
        },
        {
          actor: {
            reference: `Location/${booking.facilityId}`,
            display: `Phòng khám chi nhánh ${booking.facilityId}`
          },
          status: 'accepted'
        }
      ],
      comment: 'MediLink Centralized Booking System - HL7 FHIR Interoperability'
    };
  }

  /**
   * Map FHIR Response back to internal ACK
   */
  static fromFhirResponse(fhirPayload) {
    return {
      success: true,
      referenceCode: fhirPayload.id || `FHIR-${Date.now()}`,
      status: fhirPayload.status || 'confirmed'
    };
  }
}

module.exports = CanonicalModelMapper;
