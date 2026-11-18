/**
 * MediLink Central Platform - Main Application Server (Modular Monolith Core)
 * Exposes REST APIs across 6 bounded internal modules:
 *  - Gateway & Token Bucket Rate Limiter
 *  - Auth (HS256 JWT) & Contextual ABAC + Consent Guard
 *  - Booking & Distributed Concurrency Engine
 *  - EHR (AES-256-GCM Field Encryption + Pre-signed Lab File Storage)
 *  - Anti-Corruption Layer (HL7 FHIR R4 + Per-Facility Circuit Breakers)
 *  - Tamper-Evident Audit Log & Chain Verifier
 */

const { createHttpApp } = require('./gateway/httpApp');
const TokenBucketRateLimiter = require('./gateway/rateLimiter');
const config = require('./config');
const db = require('./db/database');
const jwtService = require('./auth/jwtService');
const { authenticate, requireRoles } = require('./auth/authMiddleware');
const { checkMedicalRecordAccess } = require('./auth/abacMiddleware');
const bookingService = require('./booking/bookingService');
const lockManager = require('./booking/lockManager');
const idempotencyManager = require('./booking/idempotencyManager');
const slotCache = require('./booking/slotCache');
const ehrService = require('./ehr/ehrService');
const labStorageService = require('./ehr/labStorageService');
const auditService = require('./audit/auditService');
const auditVerifier = require('./audit/auditVerifier');
const hisDispatcher = require('./acl/hisDispatcher');

function createServer() {
  const app = createHttpApp();
  const bookingRateLimiter = new TokenBucketRateLimiter({
    capacity: config.RATE_LIMIT_CAPACITY,
    refillPerSec: config.RATE_LIMIT_REFILL_PER_SEC
  });

  // ==================== HEALTH & OBSERVABILITY ====================
  app.get('/health', (req, res) => {
    res.json({
      status: 'UP',
      system: 'MediLink Central Platform (Architecture v2)',
      version: '2.0.0',
      lock_backend: lockManager.backendMode,
      uptime_sec: Number(process.uptime().toFixed(2)),
      circuit_breakers: hisDispatcher.getAllCircuitStatuses(),
      audit_chain_head: auditVerifier.verifyChainIntegrity()
    });
  });

  // ==================== AUTHENTICATION (JWT HS256) ====================
  app.post('/api/auth/login', (req, res) => {
    const { username } = req.body;
    const user = db.getUserByUsername(username);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'INVALID_CREDENTIALS',
        message: 'Tài khoản không tồn tại.'
      });
    }

    const accessToken = jwtService.issueTokenForUser(user, 3600);
    res.json({
      success: true,
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 3600,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        facility_id: user.facility_id,
        mpi_id: user.mpi_id,
        full_name: user.full_name
      }
    });
  });

  // ==================== PUBLIC CATALOG (LEVEL 1 PUBLIC DATA) ====================
  app.get('/api/facilities', (req, res) => {
    res.json({ success: true, data: db.getFacilities() });
  });

  app.get('/api/doctors', (req, res) => {
    res.json({ success: true, data: db.getDoctors(req.query.facility_id || null) });
  });

  app.get('/api/slots', (req, res) => {
    const filter = {
      doctorId: req.query.doctor_id || null,
      facilityId: req.query.facility_id || null,
      status: req.query.status || null
    };
    let slots = slotCache.get(filter);
    const cacheStatus = slots ? 'HIT' : 'MISS';
    if (!slots) {
      slots = db.getSlots(filter);
      slotCache.set(filter, slots);
    }
    res.setHeader('X-Cache', cacheStatus);
    res.json({ success: true, cache: cacheStatus, data: slots });
  });

  // ==================== BOOKINGS (ASR-01 & ASR-02) ====================
  app.use('/api/bookings', (req, res, next) => {
    if (req.method === 'POST') {
      return bookingRateLimiter.middleware()(req, res, next);
    }
    return next();
  });

  app.post('/api/bookings', async (req, res) => {
    const { doctor_id, slot_time, patient_id, patient_mpi, patient_name, patient_phone, facility_id } = req.body;
    const idempotencyKey = req.headers['x-idempotency-key'] || req.body.idempotency_key || null;

    if (!doctor_id || !slot_time) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_REQUIRED_FIELDS',
        message: 'Bắt buộc cung cấp doctor_id và slot_time.'
      });
    }

    const result = await bookingService.createBooking({
      doctorId: doctor_id,
      slotTime: slot_time,
      patientId: patient_id || 'user_pat_01',
      patientMpi: patient_mpi || 'MPI-2026-0001',
      patientName: patient_name || 'Bệnh nhân MediLink',
      patientPhone: patient_phone || '0905123456',
      facilityId: facility_id || null,
      idempotencyKey,
      clientIp: req.ip
    });

    res.status(result.statusCode).json(result.data);
  });

  app.get('/api/bookings', authenticate, (req, res) => {
    // Receptionist only sees bookings at their own facility!
    const scopedFacility =
      req.user.role === 'RECEPTIONIST' ? req.user.facility_id : req.query.facility_id || null;
    res.json({
      success: true,
      facility_scope: scopedFacility || 'ALL',
      data: bookingService.getAllBookings(scopedFacility)
    });
  });

  app.delete('/api/bookings/:bookingId', authenticate, async (req, res) => {
    const cancelled = await bookingService.cancelBooking(req.params.bookingId, req.user, req.ip);
    res.json({
      success: true,
      message: 'Đã hủy lịch hẹn, hoàn cọc và mở lại khung giờ khám.',
      data: cancelled
    });
  });

  // ==================== EHR, CONSENT & LAB FILES (ASR-03 & ADR-005) ====================
  app.get('/api/ehr/records/:recordId', authenticate, checkMedicalRecordAccess, (req, res) => {
    const record = ehrService.getAuthorizedRecord(
      req.rawMedicalRecord,
      req.user,
      req.abacViewScope,
      req.ip
    );
    res.json({
      success: true,
      data: record
    });
  });

  // Pre-signed URL download endpoint for encrypted Lab PDF/DICOM objects (ADR-005)
  app.get('/api/ehr/files/:fileKey', (req, res) => {
    const { viewer, expires, sig } = req.query;
    const fileObj = labStorageService.verifyAndReadObject(
      req.params.fileKey,
      viewer,
      expires,
      sig
    );
    auditService.logSecurityEvent({
      actorId: viewer || 'PRESIGNED_VIEWER',
      actorRole: 'AUTHORIZED_VIEWER',
      facilityId: 'OBJECT_STORAGE',
      action: 'LAB_FILE_PRESIGNED_DOWNLOAD',
      targetResource: req.params.fileKey,
      ipAddress: req.ip,
      status: 'SUCCESS',
      details: `Tải tệp xét nghiệm mã hóa [${req.params.fileKey}] qua Pre-signed URL hợp lệ.`
    });
    res.status(200).send(fileObj.buffer, fileObj.mimeType);
  });

  // Explicit Patient Consent management (Nghị định 13/2023/NĐ-CP Điều 11)
  app.post('/api/ehr/consents', authenticate, requireRoles('PATIENT'), (req, res) => {
    const { facility_id, grant } = req.body;
    if (!facility_id) {
      return res.status(400).json({ success: false, error: 'MISSING_FACILITY_ID' });
    }
    db.setPatientConsent(req.user.id, facility_id, Boolean(grant), 'READ_EHR');
    auditService.logSecurityEvent({
      actorId: req.user.id,
      actorRole: req.user.role,
      facilityId: facility_id,
      action: grant ? 'CONSENT_GRANTED' : 'CONSENT_REVOKED',
      targetResource: `consent:${req.user.id}:${facility_id}`,
      ipAddress: req.ip,
      status: 'SUCCESS',
      details: `Bệnh nhân [${req.user.username}] ${grant ? 'cấp' : 'thu hồi'} quyền chia sẻ bệnh án cho cơ sở [${facility_id}].`
    });
    res.json({
      success: true,
      message: `Đã ${grant ? 'cấp' : 'thu hồi'} sự đồng ý chia sẻ hồ sơ cho [${facility_id}].`
    });
  });

  // ==================== EXECUTIVE DASHBOARD (UC-10) ====================
  app.get('/api/dashboard/summary', authenticate, requireRoles('DIRECTOR', 'ADMIN'), (req, res) => {
    res.json({
      success: true,
      data: db.getDashboardStats()
    });
  });

  // ==================== AUDIT LOGS & INTEGRITY VERIFIER (ASR-05) ====================
  app.get('/api/audit/logs', authenticate, requireRoles('ADMIN'), (req, res) => {
    const logs = auditService.getLogs(500);
    res.json({
      success: true,
      count: logs.length,
      data: logs
    });
  });

  app.get('/api/audit/verify', (req, res) => {
    const verification = auditVerifier.verifyChainIntegrity();
    res.status(verification.isValid ? 200 : 409).json({
      success: verification.isValid,
      verification
    });
  });

  // ==================== CONTROLLED TEST RESET ENDPOINT ====================
  app.post('/admin/reset', (req, res) => {
    lockManager.clear();
    idempotencyManager.clear();
    slotCache.invalidateAll();
    bookingRateLimiter.reset();
    hisDispatcher.resetAllCircuits();
    db.resetSlot('DOC_101', '2026-11-20 08:00', 'FAC_DANANG');
    db.resetSlot('DOC_202', '2026-11-20 09:00', 'FAC_HUE');
    db.resetSlot('DOC_303', '2026-11-20 10:00', 'FAC_QUANGNAM');
    db.resetSlot('DOC_404', '2026-11-20 14:00', 'FAC_HOIAN');
    res.json({ success: true, message: 'Đã đặt lại trạng thái môi trường kiểm thử MediLink.' });
  });

  return app;
}

if (require.main === module) {
  const app = createServer();
  app.listen(config.PORT, () => {
    console.log('==============================================================');
    console.log(` MediLink Core Platform v2.0 listening on port ${config.PORT}`);
    console.log(` Health Check: http://localhost:${config.PORT}/health`);
    console.log('==============================================================');
  });
}

module.exports = createServer;
