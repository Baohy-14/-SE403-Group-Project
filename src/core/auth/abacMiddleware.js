/**
 * Contextual ABAC (Attribute-Based Access Control) & Patient Consent Policy Engine
 * Enforces:
 * 1. PATIENT ownership check: user.id === record.patient_id
 * 2. RECEPTIONIST facility scope isolation: user.facility_id === record.facility_id
 *    (AND receptionists only receive administrative summary, NEVER sensitive clinical diagnosis!)
 * 3. DOCTOR inter-facility access requires Explicit Patient Consent (Nghị định 13/2023 Điều 11)
 * 4. 100% denied violations recorded into Tamper-Evident HMAC Audit Chain (ASR-03)
 */

const db = require('../db/database');
const auditService = require('../audit/auditService');

function checkMedicalRecordAccess(req, res, next) {
  const recordId = req.params.recordId || req.params.id;
  const user = req.user;

  if (!user) {
    return res.status(401).json({ success: false, error: 'UNAUTHORIZED' });
  }

  const rawRecord = db.getRawMedicalRecordById(recordId);
  if (!rawRecord) {
    return res.status(404).json({
      success: false,
      error: 'RECORD_NOT_FOUND',
      message: `Hồ sơ sức khỏe [${recordId}] không tồn tại.`
    });
  }

  // Policy 1: PATIENT may only read their own EHR
  if (user.role === 'PATIENT') {
    if (rawRecord.patient_id !== user.id) {
      const incident = auditService.logSecurityEvent({
        actorId: user.id,
        actorRole: user.role,
        facilityId: 'PATIENT_PORTAL',
        action: 'ACCESS_DENIED_PATIENT_CROSS_READ',
        targetResource: recordId,
        ipAddress: req.ip,
        status: 'DENIED_403',
        details: `Bệnh nhân [${user.username}] cố truy cập trái phép hồ sơ [${recordId}] của bệnh nhân khác.`
      });
      return res.status(403).json({
        success: false,
        error: 'PATIENT_OWNERSHIP_VIOLATION',
        incident_id: incident.id,
        message: 'Từ chối truy cập: Bạn chỉ được xem hồ sơ sức khỏe của chính mình.'
      });
    }
    req.rawMedicalRecord = rawRecord;
    req.abacViewScope = 'FULL_CLINICAL';
    return next();
  }

  // Policy 2: RECEPTIONIST is strictly scoped to their assigned clinic facility_id (ASR-03!)
  if (user.role === 'RECEPTIONIST') {
    if (!user.facility_id || user.facility_id !== rawRecord.facility_id) {
      const incident = auditService.logSecurityEvent({
        actorId: user.id,
        actorRole: user.role,
        facilityId: user.facility_id || 'UNASSIGNED',
        action: 'ACCESS_DENIED_CROSS_FACILITY_EHR',
        targetResource: recordId,
        ipAddress: req.ip,
        status: 'DENIED_403',
        details: `Lễ tân cơ sở [${user.facility_id}] cố xem hồ sơ [${recordId}] thuộc cơ sở [${rawRecord.facility_id}].`
      });
      return res.status(403).json({
        success: false,
        error: 'CROSS_FACILITY_ACCESS_FORBIDDEN',
        incident_id: incident.id,
        message: `Vi phạm ranh giới cơ sở: Lễ tân [${user.facility_id}] bị nghiêm cấm truy cập hồ sơ thuộc [${rawRecord.facility_id}].`
      });
    }

    // Same-facility receptionist only sees administrative metadata (Data Minimization - Nghị định 13/2023)
    req.rawMedicalRecord = rawRecord;
    req.abacViewScope = 'ADMIN_SUMMARY_ONLY';
    return next();
  }

  // Policy 3: DOCTOR at same facility OR inter-facility with active Patient Consent
  if (user.role === 'DOCTOR') {
    if (user.facility_id !== rawRecord.facility_id) {
      const consented = db.hasPatientConsent(rawRecord.patient_id, user.facility_id, 'READ_EHR');
      if (!consented) {
        const incident = auditService.logSecurityEvent({
          actorId: user.id,
          actorRole: user.role,
          facilityId: user.facility_id || 'UNKNOWN',
          action: 'ACCESS_DENIED_MISSING_PATIENT_CONSENT',
          targetResource: recordId,
          ipAddress: req.ip,
          status: 'DENIED_403',
          details: `Bác sĩ [${user.username}] tại [${user.facility_id}] chưa được bệnh nhân [${rawRecord.patient_id}] cấp quyền liên thông hồ sơ từ [${rawRecord.facility_id}].`
        });
        return res.status(403).json({
          success: false,
          error: 'MISSING_PATIENT_CONSENT',
          incident_id: incident.id,
          message: 'Bệnh nhân chưa cấp sự đồng ý (Consent) chia sẻ bệnh án liên cơ sở theo Nghị định 13/2023/NĐ-CP.'
        });
      }
    }
    req.rawMedicalRecord = rawRecord;
    req.abacViewScope = 'FULL_CLINICAL';
    return next();
  }

  // Policy 4: ADMIN / DIRECTOR do NOT automatically read raw clinical notes without explicit clinical role
  const incident = auditService.logSecurityEvent({
    actorId: user.id,
    actorRole: user.role,
    facilityId: user.facility_id || 'CENTRAL',
    action: 'ACCESS_DENIED_NON_CLINICAL_ROLE',
    targetResource: recordId,
    ipAddress: req.ip,
    status: 'DENIED_403',
    details: `Vai trò [${user.role}] không được phép xem chi tiết bệnh án lâm sàng cá nhân.`
  });
  return res.status(403).json({
    success: false,
    error: 'NON_CLINICAL_ROLE_FORBIDDEN',
    incident_id: incident.id,
    message: 'Nguyên tắc đặc quyền tối thiểu: Quản trị viên/Lãnh đạo chỉ xem thống kê ẩn danh, không xem bệnh án cá nhân.'
  });
}

module.exports = {
  checkMedicalRecordAccess
};
