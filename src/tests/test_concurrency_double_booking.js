/**
 * Verification Test 1: Concurrency & Double-Booking Prevention (ASR-01)
 * Stimulus: 50 concurrent patients attempt to book the exact same slot.
 * Expected Response:
 * - Exactly 1 booking succeeds (HTTP 201).
 * - Exactly 49 bookings are rejected (HTTP 409 Conflict).
 * - Zero double-booking (Double-booking rate = 0.00%).
 * - Response measure: p95 latency < 800ms.
 */

const createServer = require('../core/server');
const mockManager = require('../mock-his/mockServersManager');

async function runConcurrencyTest(appPort = 3000) {
  console.log('\n============================================================');
  console.log(' [TEST 1] Concurrency & Double-Booking Prevention (ASR-01)');
  console.log('============================================================');

  const BASE_URL = `http://localhost:${appPort}`;

  // Reset state
  await fetch(`${BASE_URL}/admin/reset`, { method: 'POST' });

  const targetDoctor = 'DOC_101';
  const targetSlot = '2026-11-20 08:00';
  const CONCURRENT_REQUESTS = 50;

  console.log(`- Sending ${CONCURRENT_REQUESTS} simultaneous booking requests for Doctor: ${targetDoctor}, Slot: ${targetSlot}...`);

  const startTime = Date.now();
  const latencies = [];

  // Create 50 concurrent promises
  const bookingPromises = Array.from({ length: CONCURRENT_REQUESTS }, (_, idx) => {
    const patientId = `patient_test_${idx + 1}`;
    const reqStart = Date.now();

    return fetch(`${BASE_URL}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `idemp-test-conc-${idx + 1}`
      },
      body: JSON.stringify({
        doctor_id: targetDoctor,
        slot_time: targetSlot,
        patient_id: patientId,
        patient_name: `Bệnh nhân thử nghiệm #${idx + 1}`,
        facility_id: 'FAC_DANANG'
      })
    }).then(async (res) => {
      const duration = Date.now() - reqStart;
      latencies.push(duration);
      let data = {};
      try { data = await res.json(); } catch {}
      return { status: res.status, data, duration };
    }).catch(err => {
      return { status: 500, error: err.message, duration: Date.now() - reqStart };
    });
  });

  const results = await Promise.all(bookingPromises);
  const totalDuration = Date.now() - startTime;

  // Analysis
  const successCount = results.filter(r => r.status === 201).length;
  const conflictCount = results.filter(r => r.status === 409).length;
  const otherCount = results.filter(r => r.status !== 201 && r.status !== 409).length;

  latencies.sort((a, b) => a - b);
  const p50 = latencies[Math.floor(latencies.length * 0.50)];
  const p95 = latencies[Math.floor(latencies.length * 0.95)];
  const p99 = latencies[Math.floor(latencies.length * 0.99)];

  console.log('\n--- KẾT QUẢ ĐO LƯỜNG THỰC TẾ (REAL METRICS) ---');
  console.log(`- Tổng số requests gửi đi:       ${CONCURRENT_REQUESTS}`);
  console.log(`- Số lượng đặt lịch THÀNH CÔNG:  ${successCount} (Kỳ vọng: 1)`);
  console.log(`- Số lượng bị TỪ CHỐI (409):     ${conflictCount} (Kỳ vọng: 49)`);
  console.log(`- Tỷ lệ Double-Booking:          ${successCount > 1 ? 'THẤT BẠI' : '0.00% (HOÀN HẢO)'}`);
  console.log(`- Độ trễ phản hồi p50:           ${p50} ms`);
  console.log(`- Độ trễ phản hồi p95:           ${p95} ms (Kỳ vọng: < 800ms)`);
  console.log(`- Độ trễ phản hồi p99:           ${p99} ms`);
  console.log(`- Tổng thời gian hoàn tất test:  ${totalDuration} ms`);

  // Assertions
  const passed = successCount === 1 && conflictCount === 49 && p95 < 800;

  if (passed) {
    console.log('\n>>> ĐÁNH GIÁ: [PASSED] Kiểm chứng ASR-01 ĐẠT 100% TIÊU CHÍ.');
  } else {
    console.log('\n>>> ĐÁNH GIÁ: [FAILED] Không đạt yêu cầu.');
  }

  return { passed, successCount, conflictCount, p95, totalDuration };
}

if (require.main === module) {
  (async () => {
    await mockManager.startAll();
    const app = createServer();
    const server = app.listen(3000, async () => {
      try {
        await runConcurrencyTest(3000);
      } finally {
        server.close();
        await mockManager.stopAll();
      }
    });
  })();
}

module.exports = runConcurrencyTest;
