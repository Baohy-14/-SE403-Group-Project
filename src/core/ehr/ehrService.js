/**
 * EHR & Medical Records Service
 * Manages sensitive health data in compliance with Nghị định 13/2023/NĐ-CP
 */

const db = require('../db/database');
const auditService = require('../audit/auditService');

class EhrService {
  /**
   * Get record by ID (access has been verified by abacMiddleware)
   */
  getRecordById(recordId, requestingUser) {
    const record = db.getMedicalRecordById(recordId);
    if (!record) return null;

    // Log successful read audit
    auditService.logSecurityEvent({
      actorId: requestingUser.id,
      actorRole: requestingUser.role,
      facilityId: requestingUser.facility_id || 'EXTERNAL',
      action: 'EHR_RECORD_READ',
      targetResource: recordId,
      ipAddress: '127.0.0.1',
      status: 'SUCCESS',
      details: `Truy xuất thông tin bệnh án thành công bởi [${requestingUser.username}]`
    });

    return record;
  }

  /**
   * Get all records for a patient
   */
  getRecordsByPatient(patientId) {
    return db.medicalRecords.filter(r => r.patient_id === patientId);
  }
}

module.exports = new EhrService();
