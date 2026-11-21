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
    const userPat1 = db.getUserById('user_pat_01');
    const userPat2 = db.getUserById('user_pat_02');
    const userRecDn = db.getUserById('user_rec_dn');
    const userDocDn = db.getUserById('user_doc_dn');
    const userAdmin = db.getUserById('user_admin');

    const tokens = {
      patient_1: userPat1 ? jwtService.issueTokenForUser(userPat1) : jwtService.sign({ sub: 'user_pat_01', role: 'PATIENT' }),
      patient_2: userPat2 ? jwtService.issueTokenForUser(userPat2) : jwtService.sign({ sub: 'user_pat_02', role: 'PATIENT', facility_id: 'FAC_HUE' }),
      patient2: userPat2 ? jwtService.issueTokenForUser(userPat2) : jwtService.sign({ sub: 'user_pat_02', role: 'PATIENT', facility_id: 'FAC_HUE' }),
      receptionist_danang: userRecDn ? jwtService.issueTokenForUser(userRecDn) : jwtService.sign({ sub: 'user_rec_dn', role: 'RECEPTIONIST', facility_id: 'FAC_DANANG' }),
      doctor_danang: userDocDn ? jwtService.issueTokenForUser(userDocDn) : jwtService.sign({ sub: 'user_doc_dn', role: 'DOCTOR', facility_id: 'FAC_DANANG' }),
      admin: userAdmin ? jwtService.issueTokenForUser(userAdmin) : jwtService.sign({ sub: 'user_admin', role: 'ADMIN' })
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
            if (result.statusCode === 201) {
              return {
                clientIndex: i,
                patient: patientName,
                status: 201,
                message: 'Giữ chỗ thành công',
                bookingId: result.data?.booking?.id,
                fencingToken: result.data?.booking?.fencing_token,
                durationMs: Date.now() - reqStart
              };
            } else {
              return {
                clientIndex: i,
                patient: patientName,
                status: result.statusCode || 409,
                error: result.data?.error || 'SLOT_LOCKED_CONCURRENT_CONFLICT',
                message: result.data?.message || 'Khung giờ khám đã có người giữ chỗ',
                durationMs: Date.now() - reqStart
              };
            }
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

  // 5. Toggle Patient2 Consent for FAC_DANANG (Demo shortcut – no JWT required)
  app.post('/api/demo/toggle-consent', (req, res) => {
    const { grant } = req.body;
    const nowIso = new Date().toISOString();
    const existing = db.sqlite.prepare(
      'SELECT is_active FROM patient_consents WHERE patient_id = ? AND granted_facility_id = ?'
    ).get('user_pat_02', 'FAC_DANANG');

    if (existing) {
      db.sqlite.prepare(
        'UPDATE patient_consents SET is_active = ?, updated_at = ? WHERE patient_id = ? AND granted_facility_id = ?'
      ).run(grant ? 1 : 0, nowIso, 'user_pat_02', 'FAC_DANANG');
    } else {
      db.sqlite.prepare(
        'INSERT INTO patient_consents (patient_id, granted_facility_id, scope, is_active, updated_at) VALUES (?, ?, ?, ?, ?)'
      ).run('user_pat_02', 'FAC_DANANG', 'READ_EHR', grant ? 1 : 0, nowIso);
    }

    const afterRow = db.sqlite.prepare(
      'SELECT is_active FROM patient_consents WHERE patient_id = ? AND granted_facility_id = ?'
    ).get('user_pat_02', 'FAC_DANANG');

    res.json({
      success: true,
      patient_id: 'user_pat_02',
      facility_id: 'FAC_DANANG',
      is_active: Boolean(afterRow && afterRow.is_active),
      message: grant
        ? '✅ Bệnh nhân Trần Thị Bình đã cấp quyền chia sẻ bệnh án cho Cơ sở Đà Nẵng.'
        : '❌ Đã thu hồi quyền chia sẻ bệnh án khỏi Cơ sở Đà Nẵng.'
    });
  });

  // 6. Toggle Mock HIS Huế Chaos Mode & Circuit Breaker
  app.post('/api/demo/toggle-his-hue', (req, res) => {
    const { mode, chaos } = req.body;
    const isDown = chaos === true || mode === 'DOWN' || mode === 'DOWN_503';
    const finalMode = isDown ? 'DOWN_503' : 'UP';
    mockManager.setHueChaosMode(finalMode);

    const hueCb = hisDispatcher.circuitBreakers.get('FAC_HUE');
    if (isDown) {
      if (hueCb) {
        hueCb.state = 'OPEN';
        hueCb.openedAt = Date.now();
        hueCb.failureCount = 3;
      }
    } else {
      if (hueCb) {
        hueCb.reset();
      }
    }

    res.json({ success: true, mode: finalMode, circuit_state: hueCb ? hueCb.state : 'UNKNOWN' });
  });

  // 6.1 Book Appointment specifically at Huế to demonstrate Circuit Breaker & Outbox
  app.post('/api/demo/book-hue', async (req, res) => {
    try {
      const now = new Date();
      const slotTime = `2026-11-20 ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
      db.resetSlot('DOC_202', slotTime, 'FAC_HUE');

      const result = await bookingService.createBooking({
        doctorId: 'DOC_202',
        slotTime,
        patientId: 'user_pat_02',
        patientName: 'Trần Thị Bình',
        facilityId: 'FAC_HUE',
        idempotencyKey: `idem_hue_${Date.now()}`
      });

      res.status(result.statusCode).json(result.data);
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 7. Trigger Outbox Replay Worker Batch
  app.post('/api/demo/run-outbox', async (req, res) => {
    try {
      const syncedCount = await backgroundWorker.processOutboxBatch(10);
      res.json({ success: true, syncedCount: syncedCount || 0 });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 8. Simulate / Restore Root DBA Tamper on Audit Log #1
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
