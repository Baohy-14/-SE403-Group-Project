/**
 * Electronic Health Record (EHR) Domain Service
 * Decrypts AES-256-GCM clinical fields ONLY when ABAC grants FULL_CLINICAL scope,
 * enforces Data Minimization for receptionists, and issues short-lived Pre-signed URLs
 * for encrypted Lab PDF files stored in Object Storage (ADR-005).
 */

const db = require('../db/database');
const encryptionService = require('./encryptionService');
const labStorageService = require('./labStorageService');
const auditService = require('../audit/auditService');

class EhrService {
  getAuthorizedRecord(rawRecord, requestingUser, viewScope = 'FULL_CLINICAL', ipAddress = '127.0.0.1') {
    if (!rawRecord) return null;

    if (viewScope === 'ADMIN_SUMMARY_ONLY') {
      auditService.logSecurityEvent({
        actorId: requestingUser.id,
        actorRole: requestingUser.role,
        facilityId: requestingUser.facility_id || 'CENTRAL',
        action: 'EHR_ADMIN_METADATA_READ',
        targetResource: rawRecord.id,
        ipAddress,
        status: 'SUCCESS_MASKED',
        details: `Lễ tân [${requestingUser.username}] tra cứu thông tin hành chính hồ sơ [${rawRecord.id}] (đã ẩn trường bệnh lý nhạy cảm).`
      });

      return {
        id: rawRecord.id,
        patient_id: rawRecord.patient_id,
        patient_mpi: rawRecord.patient_mpi,
        patient_name: rawRecord.patient_name,
        facility_id: rawRecord.facility_id,
        doctor_id: rawRecord.doctor_id,
        created_at: rawRecord.created_at,
        data_classification: 'MASKED_FOR_RECEPTIONIST',
        diagnosis: '[REDACTED - CHỈ BÁC SĨ ĐIỀU TRỊ & BỆNH NHÂN ĐƯỢC XEM]',
        clinical_notes: '[REDACTED]',
        prescription: '[REDACTED]',
        lab_summary: '[REDACTED]',
        lab_report_presigned_url: null
      };
    }

    // Decrypt AES-256-GCM fields in memory for authorized Doctor / Patient
    const decrypted = {
      id: rawRecord.id,
      patient_id: rawRecord.patient_id,
      patient_mpi: rawRecord.patient_mpi,
      patient_name: rawRecord.patient_name,
      facility_id: rawRecord.facility_id,
      doctor_id: rawRecord.doctor_id,
      created_at: rawRecord.created_at,
      data_classification: rawRecord.sensitivity_level,
      diagnosis: encryptionService.decryptField(rawRecord.diagnosis_enc, rawRecord.id),
      clinical_notes: encryptionService.decryptField(rawRecord.clinical_notes_enc, rawRecord.id),
      prescription: encryptionService.decryptField(rawRecord.prescription_enc, rawRecord.id),
      lab_summary: encryptionService.decryptField(rawRecord.lab_summary_enc, rawRecord.id),
      lab_report_presigned_url: rawRecord.lab_file_key
        ? labStorageService.generatePresignedUrl(rawRecord.lab_file_key, requestingUser.id, 120)
        : null
    };

    auditService.logSecurityEvent({
      actorId: requestingUser.id,
      actorRole: requestingUser.role,
      facilityId: requestingUser.facility_id || 'PATIENT_SELF',
      action: 'EHR_SENSITIVE_CLINICAL_READ',
      targetResource: rawRecord.id,
      ipAddress,
      status: 'SUCCESS',
      details: `Giải mã & truy xuất bệnh án nhạy cảm [${rawRecord.id}] hợp lệ bởi [${requestingUser.username}].`
    });

    return decrypted;
  }

  createMedicalRecord({ patientId, patientMpi, patientName, facilityId, doctorId, diagnosis, clinicalNotes, prescription, labSummary, pdfContent }) {
    const recordId = `REC-${facilityId.replace('FAC_', '')}-${Date.now().toString().slice(-5)}`;
    let labFileKey = null;

    if (pdfContent) {
      labFileKey = `lab-${recordId.toLowerCase()}.pdf`;
      labStorageService.putEncryptedObject(labFileKey, Buffer.from(pdfContent, 'utf8'), 'application/pdf');
    }

    db.sqlite
      .prepare(
        `INSERT INTO medical_records (
          id, patient_id, patient_mpi, patient_name, facility_id, doctor_id,
          diagnosis_enc, clinical_notes_enc, prescription_enc, lab_summary_enc,
          lab_file_key, sensitivity_level, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'LEVEL_3_SENSITIVE_HEALTH', ?)`
      )
      .run(
        recordId,
        patientId,
        patientMpi || 'MPI-NEW',
        patientName,
        facilityId,
        doctorId,
        encryptionService.encryptField(diagnosis, recordId),
        encryptionService.encryptField(clinicalNotes || '', recordId),
        encryptionService.encryptField(prescription || '', recordId),
        encryptionService.encryptField(labSummary || '', recordId),
        labFileKey,
        new Date().toISOString()
      );

    return recordId;
  }
}

module.exports = new EhrService();
