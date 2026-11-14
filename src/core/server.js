/**
 * MediLink Platform - Main Express Application Server
 */

const express = require('express');
const config = require('./config');
const db = require('./db/database');
const bookingService = require('./booking/bookingService');
const lockManager = require('./booking/lockManager');
const idempotencyManager = require('./booking/idempotencyManager');
const ehrService = require('./ehr/ehrService');
const auditService = require('./audit/auditService');
const auditVerifier = require('./audit/auditVerifier');
const hisDispatcher = require('./acl/hisDispatcher');
const { authenticate, requireRoles } = require('./auth/authMiddleware');
const { checkMedicalRecordAccess } = require('./auth/abacMiddleware');

function createServer() {
  const app = express();
  app.use(express.json());

  // Simple Token Bucket Rate Limiter simulation at Gateway (Ingress defense for Risk R-01)
  const rateLimitMap = new Map();
  app.use('/api/bookings', (req, res, next) => {
    if (req.method === 'POST') {
      const clientIp = req.ip || '127.0.0.1';
      const now = Date.now();
      const clientBucket = rateLimitMap.get(clientIp) || { tokens: 100, lastRefill: now };
      
      // Refill tokens
      const elapsed = (now - clientBucket.lastRefill) / 1000;
      clientBucket.tokens = Math.min(100, clientBucket.tokens + elapsed * 10);
      clientBucket.lastRefill = now;

      if (clientBucket.tokens < 1) {
        return res.status(429).json({
          success: false,
          error: 'RATE_LIMIT_EXCEEDED',
          message: 'Quá nhiều yêu cầu đặt lịch từ IP của bạn trong thời gian ngắn. Vui lòng chờ vài giây.'
        });
      }

      clientBucket.tokens -= 1;
      rateLimitMap.set(clientIp, clientBucket);
    }
    next();
  });

  // Health and Observability
  app.get('/health', (req, res) => {
    res.json({
      status: 'UP',
      system: 'MediLink Central Platform',
      version: '1.0.0',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      circuit_breakers: hisDispatcher.getAllCircuitStatuses(),
      audit_records_count: db.auditLogs.length
    });
  });

  // ==================== DOCTORS & SLOTS ====================
  app.get('/api/facilities', (req, res) => {
    res.json({ success: true, data: db.facilities });
  });

  app.get('/api/doctors', (req, res) => {
    res.json({ success: true, data: db.doctors });
  });

  app.get('/api/slots', (req, res) => {
    const doctorId = req.query.doctor_id;
    let slots = db.slots;
    if (doctorId) {
      slots = slots.filter(s => s.doctor_id === doctorId);
    }
    res.json({ success: true, data: slots });
  });

  // ==================== BOOKINGS (ASR-01) ====================
  app.post('/api/bookings', async (req, res) => {
    const { doctor_id, slot_time, patient_id, patient_name, facility_id } = req.body;
    const idempotencyKey = req.headers['x-idempotency-key'] || req.body.idempotency_key;

    if (!doctor_id || !slot_time) {
      return res.status(400).json({
        success: false,
        error: 'BAD_REQUEST',
        message: 'doctor_id và slot_time là hai trường bắt buộc.'
      });
    }

    const result = await bookingService.createBooking({
      doctorId: doctor_id,
      slotTime: slot_time,
      patientId: patient_id,
      patientName: patient_name,
      facilityId: facility_id,
      idempotencyKey,
      clientIp: req.ip
    });

    return res.status(result.statusCode).json(result.data || result);
  });

  app.get('/api/bookings', (req, res) => {
    res.json({ success: true, data: bookingService.getAllBookings() });
  });

  // ==================== EHR & MEDICAL RECORDS (ASR-03) ====================
  app.get('/api/ehr/records/:recordId', authenticate, checkMedicalRecordAccess, (req, res) => {
    const record = ehrService.getRecordById(req.params.recordId, req.user);
    res.json({
      success: true,
      message: 'Tra cứu hồ sơ bệnh án thành công.',
      data: record
    });
  });

  // ==================== AUDIT CHAIN (ASR-05) ====================
  app.get('/api/audit/logs', authenticate, requireRoles('ADMIN'), (req, res) => {
    res.json({
      success: true,
      count: db.auditLogs.length,
      data: auditService.getLogs()
    });
  });

  app.get('/api/audit/verify', (req, res) => {
    const verification = auditVerifier.verifyChainIntegrity();
    res.json({
      success: verification.isValid,
      verification
    });
  });

  // ==================== TEST & ADMIN ENDPOINTS ====================
  // Simulate attacker modifying a log directly in the DB to test tamper detection
  app.post('/admin/audit/tamper', (req, res) => {
    if (db.auditLogs.length === 0) {
      return res.status(400).json({ error: 'No audit logs to tamper with' });
    }
    const index = req.body.index !== undefined ? req.body.index : db.auditLogs.length - 1;
    const log = db.auditLogs[index];
    if (log) {
      const original = log.details;
      log.details = '[TAMPERED_BY_MALICIOUS_ACTOR] Bệnh án đã bị sửa ngày giờ trái phép';
      return res.json({
        success: true,
        message: `Đã can thiệp sửa đổi trái phép bản ghi log #${index + 1}`,
        original,
        modified: log.details
      });
    }
    res.status(404).json({ error: 'Log index not found' });
  });

  // Reset data for clean test runs
  app.post('/admin/reset', (req, res) => {
    lockManager.clear();
    idempotencyManager.clear();
    db.resetSlot('DOC_101', '2026-11-20 08:00');
    db.resetSlot('DOC_202', '2026-11-20 09:00');
    db.resetSlot('DOC_303', '2026-11-20 10:00');
    db.resetSlot('DOC_404', '2026-11-20 14:00');
    // Reset circuit breakers
    for (const [, cb] of hisDispatcher.circuitBreakers) {
      cb.state = 'CLOSED';
      cb.failureCount = 0;
    }
    res.json({ success: true, message: 'MediLink environment reset to initial state' });
  });

  return app;
}

if (require.main === module) {
  const app = createServer();
  const port = config.PORT;
  app.listen(port, () => {
    console.log(`========================================================`);
    console.log(` MediLink Platform Backend Server running on port ${port}`);
    console.log(` Environment: ${config.NODE_ENV}`);
    console.log(` Health Check: http://localhost:${port}/health`);
    console.log(`========================================================`);
  });
}

module.exports = createServer;
