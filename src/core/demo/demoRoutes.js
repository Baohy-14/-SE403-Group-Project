/**
 * Demo Routes for MediLink Interactive Architecture Verification Dashboard
 */

const { renderDashboardHtml } = require('./demoView');
const db = require('../db/database');
const hisDispatcher = require('../acl/hisDispatcher');
const auditVerifier = require('../audit/auditVerifier');
const lockManager = require('../booking/lockManager');
const bookingService = require('../booking/bookingService');
const mockManager = require('../../mock-his/mockServersManager');
const backgroundWorker = require('../../worker/backgroundWorker');
const jwtService = require('../auth/jwtService');

let originalLog1Details = null;

function registerDemoRoutes(app) {
  // 1. Dashboard UI HTML
  app.get('/', (req, res) => {
    res.send(renderDashboardHtml(), 'text/html; charset=utf-8');
  });

  app.get('/demo', (req, res) => {
    res.send(renderDashboardHtml(), 'text/html; charset=utf-8');
  });

  // 2. Demo JWT Tokens for role switching
  app.get('/api/demo/tokens', (req, res) => {
    const tokens = {
      patient_1: jwtService.sign({ sub: 'user_pat_01', name: 'Nguyễn Văn An', role: 'PATIENT', facility_id: 'FAC_DANANG' }),
      patient_2: jwtService.sign({ sub: 'user_pat_02', name: 'Trần Thị Bình', role: 'PATIENT', facility_id: 'FAC_HUE' }),
      receptionist_danang: jwtService.sign({ sub: 'staff_dn_01', name: 'Lê Thu Ngân', role: 'RECEPTIONIST', facility_id: 'FAC_DANANG' }),
      doctor_danang: jwtService.sign({ sub: 'doc_dn_01', name: 'BS. Lê Viết Dũng', role: 'DOCTOR', facility_id: 'FAC_DANANG' }),
      admin: jwtService.sign({ sub: 'admin_01', name: 'Quản Trị Viên Hệ Thống', role: 'ADMIN', facility_id: 'ALL' })
    };
    res.json({ success: true, tokens });
  });

  // 3. Real-time Aggregated System State
  app.get('/api/demo/state', (req, res) => {
    const circuits = hisDispatcher.getAllCircuitStatuses();
    const auditVerification = auditVerifier.verifyChainIntegrity();
    const pendingOutbox = db.getPendingOutboxEvents(100);
    const dashboardStats = db.getDashboardStats();

    // Check if patient2 granted consent to FAC_DANANG
    const consentRow = db.sqlite.prepare(
      'SELECT is_active FROM patient_consents WHERE patient_id = ? AND granted_facility_id = ?'
    ).get('user_pat_02', 'FAC_DANANG');

    res.json({
      success: true,
      data: {
        lock_backend: lockManager.backendMode,
        circuits,
        audit_verification: auditVerification,
        pending_outbox_count: pendingOutbox.length,
        patient2_consent_danang: consentRow ? Boolean(consentRow.is_active) : false,
        dashboard_stats: dashboardStats
      }
    });
  });

  // 4. Concurrency Race Test (1 vs 1 or 20 concurrent requests)
  app.post('/api/demo/race-test', async (req, res) => {
    const { count = 2, slot_time = '2026-11-20 08:00', doctor_id = 'DOC_101', facility_id = 'FAC_DANANG' } = req.body;
    const numRequests = Math.min(Math.max(Number(count) || 2, 2), 50);

    // Reset this slot first so the race starts clean
    db.resetSlot(doctor_id, slot_time, facility_id);
    lockManager.clear();

    const startNs = process.hrtime.bigint();
    const promises = [];

    for (let i = 0; i < numRequests; i++) {
      const patientId = i === 0 ? 'user_pat_01' : (i === 1 ? 'user_pat_02' : `user_pat_${i}`);
      const patientName = i === 0 ? 'Nguyễn Văn An' : (i === 1 ? 'Trần Thị Bình' : `Khách Hàng #${i}`);
      const idemKey = `idem_race_${Date.now()}_${i}`;

      promises.push(
        (async () => {
          const reqStart = Date.now();
          try {
            const result = await bookingService.createBooking({
              doctorId: doctor_id,
              slotTime: slot_time,
              patientId,
              patientName,
              facilityId: facility_id,
              idempotencyKey: idemKey
            });
            return {
              clientIndex: i,
              patient: patientName,
              status: 201,
              message: 'Giữ chỗ thành công',
              bookingId: result.bookingId,
              fencingToken: result.fencingToken,
              durationMs: Date.now() - reqStart
            };
          } catch (err) {
            return {
              clientIndex: i,
              patient: patientName,
              status: err.statusCode || 409,
              error: err.code || 'SLOT_LOCKED_CONCURRENT_CONFLICT',
              message: err.message,
              durationMs: Date.now() - reqStart
            };
          }
        })()
      );
    }

    const results = await Promise.all(promises);
    const totalDurationMs = Number((process.hrtime.bigint() - startNs) / 1000000n);

    const successList = results.filter((r) => r.status === 201);
    const conflictList = results.filter((r) => r.status === 409);

    const doubleBookingRate = successList.length > 1
      ? ((successList.length - 1) / results.length) * 100
      : 0;

    res.json({
      success: true,
      stats: {
        total: results.length,
        success: successList.length,
        conflicts: conflictList.length,
        duration_ms: totalDurationMs,
        double_booking_rate: Number(doubleBookingRate.toFixed(2))
      },
      details: results
    });
  });

  // 5. Toggle Mock HIS Huế Chaos Mode
  app.post('/api/demo/toggle-his-hue', (req, res) => {
    const { mode, chaos } = req.body;
    const finalMode = chaos === true || mode === 'DOWN' ? 'DOWN' : 'UP';
    mockManager.setHueChaosMode(finalMode);
    res.json({ success: true, mode: finalMode });
  });

  // 6. Trigger Outbox Replay Worker Batch
  app.post('/api/demo/run-outbox', async (req, res) => {
    try {
      const syncedCount = await backgroundWorker.processOutboxBatch(10);
      res.json({ success: true, syncedCount: syncedCount || 0 });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 7. Simulate / Restore Root DBA Tamper on Audit Log #1
  app.post('/api/demo/tamper-audit', (req, res) => {
    const action = (req.body && req.body.action) ? req.body.action.toUpperCase() : 'TAMPER';
    const row1 = db.sqlite.prepare('SELECT id, details FROM audit_logs WHERE id = 1').get();

    if (!row1) {
      return res.status(404).json({ success: false, error: 'NO_AUDIT_LOGS' });
    }

    if (action === 'TAMPER') {
      if (!originalLog1Details) {
        originalLog1Details = row1.details;
      }
      db.simulateRootDbaTamper(1, '[ROOT_DBA_FORGED] Đã sửa trộm thời gian và chi tiết bệnh án!');
      res.json({ success: true, message: 'Đã giả lập can thiệp sửa đổi Log #1.' });
    } else {
      if (originalLog1Details) {
        db.simulateRootDbaTamper(1, originalLog1Details);
      }
      res.json({ success: true, message: 'Đã khôi phục bản gốc Log #1.' });
    }
  });
}

module.exports = { registerDemoRoutes };
