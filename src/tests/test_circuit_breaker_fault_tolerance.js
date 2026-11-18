/**
 * Test 2 (ASR-02 & Architecture v2 ADR-007): HIS Huế Outage Fault Isolation & Outbox Recovery
 * Scenario:
 *  1. HIS Huế (SOAP/XML, Port 8002) crashes (`DOWN_503`).
 *  2. After 3 failed attempts, `CircuitBreaker(FAC_HUE)` trips to `OPEN`.
 *  3. Subsequent booking at Huế fast-fails the network call (< 50ms) and queues safely in `outbox_events`.
 *  4. Meanwhile, bookings at Đà Nẵng (8001) and Quảng Nam (8003) succeed 100% (`SYNCED`).
 *  5. When HIS Huế recovers (`UP`), `OutboxSyncWorker` replays queued Huế bookings with jitter -> `SYNCED`!
 */

const db = require('../core/db/database');
const hisDispatcher = require('../core/acl/hisDispatcher');
const mockManager = require('../mock-his/mockServersManager');
const backgroundWorker = require('../worker/backgroundWorker');

async function runCircuitBreakerTest(port = 3000) {
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log('\n[TEST 2 - ASR-02 & ADR-007] Kiểm chứng Cách ly Sự cố HIS Huế (Circuit Breaker) & Đồng bộ bù Outbox...');

  await fetch(`${baseUrl}/admin/reset`, { method: 'POST' });

  // Seed 4 distinct Hue slots so we can trigger 3 failures -> OPEN -> 4th fast-fail!
  const hueSlots = ['2026-11-21 08:00', '2026-11-21 08:30', '2026-11-21 09:00', '2026-11-21 09:30'];
  for (const st of hueSlots) {
    db.resetSlot('DOC_202', st, 'FAC_HUE');
  }
  db.resetSlot('DOC_101', '2026-11-21 10:00', 'FAC_DANANG');
  db.resetSlot('DOC_303', '2026-11-21 10:30', 'FAC_QUANGNAM');

  // Step 1: Inject Fault into Mock HIS Huế (simulating 2-hour clinic outage)
  mockManager.setHueChaosMode('DOWN_503');

  // Trigger 3 consecutive failures at Hue to trip Circuit Breaker -> OPEN
  for (let i = 0; i < 3; i++) {
    await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Client-Id': `hue_client_${i}` },
      body: JSON.stringify({
        doctor_id: 'DOC_202',
        slot_time: hueSlots[i],
        patient_id: 'user_pat_02',
        facility_id: 'FAC_HUE'
      })
    });
  }

  const hueStateDuringOutage = hisDispatcher.getCircuitStatus('FAC_HUE').state;

  // 4th request hits OPEN Circuit Breaker -> Fast-Fail network call & Outbox Queued!
  const fastFailStartNs = process.hrtime.bigint();
  const hue4Res = await fetch(`${baseUrl}/api/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Client-Id': 'hue_client_fastfail' },
    body: JSON.stringify({
      doctor_id: 'DOC_202',
      slot_time: hueSlots[3],
      patient_id: 'user_pat_02',
      facility_id: 'FAC_HUE'
    })
  });
  const fastFailLatencyMs = Number((Number(process.hrtime.bigint() - fastFailStartNs) / 1e6).toFixed(2));
  const hue4Body = await hue4Res.json();

  // Step 2: Prove Blast Radius Isolation - Đà Nẵng & Quảng Nam operate at 100% SYNCED!
  const [dnRes, qnRes] = await Promise.all([
    fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Client-Id': 'dn_iso_check' },
      body: JSON.stringify({
        doctor_id: 'DOC_101',
        slot_time: '2026-11-21 10:00',
        patient_id: 'user_pat_01',
        facility_id: 'FAC_DANANG'
      })
    }),
    fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Client-Id': 'qn_iso_check' },
      body: JSON.stringify({
        doctor_id: 'DOC_303',
        slot_time: '2026-11-21 10:30',
        patient_id: 'user_pat_01',
        facility_id: 'FAC_QUANGNAM'
      })
    })
  ]);
  const dnJson = await dnRes.json();
  const qnJson = await qnRes.json();

  const daNangOk = dnRes.status === 201 && dnJson.booking.his_sync_status === 'SYNCED';
  const quangNamOk = qnRes.status === 201 && qnJson.booking.his_sync_status === 'SYNCED';

  // Step 3: Restore HIS Huế & prove Rate-Controlled Outbox Recovery (Architecture v2)
  mockManager.setHueChaosMode('UP');
  // Simulate sleep window elapsed so Circuit Breaker transitions OPEN -> HALF_OPEN -> CLOSED
  const hueCb = hisDispatcher.circuitBreakers.get('FAC_HUE');
  hueCb.openedAt = Date.now() - hueCb.resetTimeoutMs - 100;

  const syncedByOutbox = await backgroundWorker.processOutboxBatch(10);
  const hueStateAfterRecovery = hisDispatcher.getCircuitStatus('FAC_HUE').state;

  const remainingPendingOutbox = db.sqlite
    .prepare(`SELECT COUNT(*) AS cnt FROM outbox_events WHERE facility_id = 'FAC_HUE' AND status = 'PENDING'`)
    .get().cnt;

  const passed =
    hueStateDuringOutage === 'OPEN' &&
    hue4Body.booking.his_sync_status === 'OUTBOX_QUEUED' &&
    fastFailLatencyMs < 50 &&
    daNangOk &&
    quangNamOk &&
    syncedByOutbox === 4 &&
    remainingPendingOutbox === 0 &&
    hueStateAfterRecovery === 'CLOSED';

  console.log(`   -> Trạng thái Circuit Breaker Huế khi HIS sập: [${hueStateDuringOutage}] | Fast-fail Outbox Latency: ${fastFailLatencyMs}ms`);
  console.log(`   -> Cô lập lỗi: Đà Nẵng=${dnJson.booking.his_sync_status} (${dnJson.booking.his_reference_code}) | Quảng Nam=${qnJson.booking.his_sync_status} (${qnJson.booking.his_reference_code})`);
  console.log(`   -> Sau khi HIS Huế phục hồi: Outbox đồng bộ bù thành công ${syncedByOutbox}/4 lịch hẹn | Circuit Huế -> [${hueStateAfterRecovery}]`);

  return {
    passed,
    hueCbStateDuringOutage: hueStateDuringOutage,
    fastFailLatencyMs,
    daNangOk,
    quangNamOk,
    outboxRecoveredCount: syncedByOutbox,
    hueCbStateAfterRecovery: hueStateAfterRecovery
  };
}

if (require.main === module) {
  const createServer = require('../core/server');
  (async () => {
    await mockManager.startAll();
    const srv = await new Promise((r) => {
      const s = createServer().listen(3000, '127.0.0.1', () => r(s));
    });
    try {
      const res = await runCircuitBreakerTest(3000);
      process.exit(res.passed ? 0 : 1);
    } finally {
      srv.close();
      await mockManager.stopAll();
    }
  })();
}

module.exports = runCircuitBreakerTest;
