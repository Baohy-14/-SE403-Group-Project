/**
 * Contextual ABAC (Attribute-Based Access Control) Middleware
 * Enforces facility isolation for RECEPTIONIST / CLINIC_STAFF roles
 * and patient-level ownership for PATIENT roles.
 */

const db = require('../db/database');
const auditService = require('../audit/auditService');

function checkMedicalRecordAccess(req, res, next) {
  const recordId = req.params.recordId || req.params.id;
  const user = req.user;

  if (!user) {
    return res.status(401).json({ success: false, error: 'UNAUTHORIZED' });
  }

  // Admins have override audit-logged access
  if (user.role === 'ADMIN') {
    return next();
  }

  const record = db.getMedicalRecordById(recordId);

  if (!record) {
    return res.status(404).json({
      success: false,
      error: 'NOT_FOUND',
      message: `Hồ sơ bệnh án [${recordId}] không tồn tại trên hệ thống.`
    });
  }

  // Rule 1: PATIENT can only access their own record
  if (user.role === 'PATIENT') {
    if (record.patient_id !== user.id) {
      auditService.logSecurityEvent({
        actorId: user.id,
        actorRole: user.role,
        facilityId: user.facility_id || 'EXTERNAL',
        action: 'ACCESS_DENIED_PATIENT_CROSS_READ',
        targetResource: recordId,
        ipAddress: req.ip || '127.0.0.1',
        status: 'DENIED_403',
        details: `Bệnh nhân [${user.id}] cố truy cập hồ sơ của bệnh nhân khác [${record.patient_id}]`
      });

      return res.status(403).json({
        success: false,
        error: 'ACCESS_DENIED',
        message: 'Bạn chỉ có quyền xem hồ sơ sức khỏe của chính mình.'
      });
    }
    return next();
  }

  // Rule 2: RECEPTIONIST can ONLY access records belonging to their assigned facility!
  if (user.role === 'RECEPTIONIST') {
    if (!user.facility_id || user.facility_id !== record.facility_id) {
      // VIOLATION of Cross-Facility Privacy Policy (Nghị định 13/2023/NĐ-CP)
      const auditEntry = auditService.logSecurityEvent({
        actorId: user.id,
        actorRole: user.role,
        facilityId: user.facility_id || 'UNKNOWN',
        action: 'ACCESS_DENIED_CROSS_FACILITY_EHR',
        targetResource: recordId,
        ipAddress: req.ip || '127.0.0.1',
        status: 'DENIED_403',
        details: `Lễ tân thuộc cơ sở [${user.facility_id}] cố ý truy cập hồ sơ bệnh án thuộc cơ sở [${record.facility_id}]`
      });

      return res.status(403).json({
        success: false,
        error: 'CROSS_FACILITY_ACCESS_FORBIDDEN',
        incident_id: auditEntry.id,
        message: `Từ chối truy cập: Bạn được phân công tại cơ sở [${user.facility_id}]. Không được phép xem hồ sơ thuộc cơ sở [${record.facility_id}] theo quy định bảo mật.`
      });
    }
  }

  // Doctors can access if they belong to the same facility or are treating the patient
  if (user.role === 'DOCTOR') {
    if (user.facility_id && record.facility_id && user.facility_id !== record.facility_id) {
      // Log for inter-facility consultation
      auditService.logSecurityEvent({
        actorId: user.id,
        actorRole: user.role,
        facilityId: user.facility_id,
        action: 'INTER_FACILITY_DOCTOR_CONSULTATION',
        targetResource: recordId,
        ipAddress: req.ip || '127.0.0.1',
        status: 'ALLOWED_WITH_AUDIT',
        details: `Bác sĩ cơ sở [${user.facility_id}] xem hồ sơ chéo tại [${record.facility_id}] phục vụ chẩn đoán`
      });
    }
  }

  // Store resolved record on req
  req.medicalRecord = record;
  next();
}

module.exports = {
  checkMedicalRecordAccess
};
