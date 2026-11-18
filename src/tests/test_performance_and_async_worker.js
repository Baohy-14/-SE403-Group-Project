/**
 * Test 6 (QAS-06 & QAS-08 / ADR-006):
 * Peak Query Latency Benchmark (200 Concurrent Reads) & Async Notification Worker Resilience
 */

const db = require('../core/db/database');
const backgroundWorker = require('../worker/backgroundWorker');

function percentile(sortedArr, p) {
  if (sortedArr.length === 0) return 0;
  const idx = Math.min(sortedArr.length - 1, Math.ceil((p / 100) * sortedArr.length) - 1);
  return sortedArr[Math.max(0, idx)];
}

async function runPerformanceAndWorkerTest(port = 3000) {
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log('\n[TEST 6 - QAS-06 & QAS-08] Kiểm chứng Hiệu năng Tải đọc (200 Concurrent Reads) & Hàng đợi Nhắc lịch Bất đồng bộ...');

  await fetch(`${baseUrl}/admin/reset`, { method: 'POST' });
  db.sqlite.exec('DELETE FROM notification_jobs');

  // Part A: 200 concurrent slot search requests (QAS-06 target: p95 < 300ms)
  const readCount = 200;
  const benchStartNs = process.hrtime.bigint();
  const readPromises = Array.from({ length: readCount }, () => {
    const t0 = process.hrtime.bigint();
    return fetch(`${baseUrl}/api/slots?facility_id=FAC_DANANG`).then(async (res) => {
      await res.json();
      return { ok: res.ok, ms: Number(process.hrtime.bigint() - t0) / 1e6 };
    });
  });

  const readResults = await Promise.all(readPromises);
  const totalBenchSec = Number(process.hrtime.bigint() - benchStartNs) / 1e9;
  const readLatencies = readResults.map((r) => r.ms).sort((a, b) => a - b);
  const readP50 = Number(percentile(readLatencies, 50).toFixed(2));
  const readP95 = Number(percentile(readLatencies, 95).toFixed(2));
  const readP99 = Number(percentile(readLatencies, 99).toFixed(2));
  const throughputRps = Math.round(readCount / totalBenchSec);

  // Part B: Async Notification Queue Resilience when SMS/Zalo Gateway fails twice (QAS-08)
  db.resetSlot('DOC_101', '2026-11-22 15:00', 'FAC_DANANG');
  backgroundWorker.injectSmsGatewayFailures(2);

  const bookStartNs = process.hrtime.bigint();
  const bookRes = await fetch(`${baseUrl}/api/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Client-Id': 'notif_test_user' },
    body: JSON.stringify({
      doctor_id: 'DOC_101',
      slot_time: '2026-11-22 15:00',
      patient_id: 'user_pat_01',
      facility_id: 'FAC_DANANG'
    })
  });
  const bookingLatencyDuringSmsOutageMs = Number(
    (Number(process.hrtime.bigint() - bookStartNs) / 1e6).toFixed(2)
  );
  const bookJson = await bookRes.json();
  const jobId = bookJson.booking.notification_job_id;

  // Attempt 1 (fails -> RETRY_SCHEDULED), Attempt 2 (fails -> RETRY_SCHEDULED), Attempt 3 (succeeds -> SENT!)
  await backgroundWorker.processNotificationBatch(5);
  await new Promise((r) => setTimeout(r, 70));
  await backgroundWorker.processNotificationBatch(5);
  await new Promise((r) => setTimeout(r, 130));
  await backgroundWorker.processNotificationBatch(5);

  const finalJob = db.sqlite
    .prepare('SELECT status, attempts FROM notification_jobs WHERE id = ?')
    .get(jobId);

  const passed =
    readResults.every((r) => r.ok) &&
    readP95 < 300 &&
    bookRes.status === 201 &&
    finalJob &&
    finalJob.status === 'SENT' &&
    finalJob.attempts === 2; // 2 failed attempts recorded before 3rd succeeded

  console.log(`   -> Benchmark 200 Concurrent Slot Reads: Throughput=${throughputRps} req/s | p50=${readP50}ms | p95=${readP95}ms | p99=${readP99}ms`);
  console.log(`   -> Cô lập lỗi Cổng SMS/Zalo: Đặt lịch vẫn hoàn tất trong ${bookingLatencyDuringSmsOutageMs}ms | Worker tự retry 2 lần lỗi -> Trạng thái cuối: [${finalJob?.status}]`);

  return {
    passed,
    readCount,
    throughputRps,
    readP50,
    readP95,
    readP99,
    bookingLatencyDuringSmsOutageMs,
    notificationFinalStatus: finalJob?.status,
    notificationRetriesBeforeSuccess: finalJob?.attempts
  };
}

if (require.main === module) {
  const createServer = require('../core/server');
  const mockManager = require('../mock-his/mockServersManager');
  (async () => {
    await mockManager.startAll();
    const srv = await new Promise((r) => {
      const s = createServer().listen(3000, '127.0.0.1', () => r(s));
    });
    try {
      const res = await runPerformanceAndWorkerTest(3000);
      process.exit(res.passed ? 0 : 1);
    } finally {
      srv.close();
      await mockManager.stopAll();
    }
  })();
}

module.exports = runPerformanceAndWorkerTest;
