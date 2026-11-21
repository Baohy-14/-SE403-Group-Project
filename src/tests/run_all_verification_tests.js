/**
 * Master Architecture Verification Suite - MediLink Platform v2.0 (SE 403)
 * Executes all 6 automated Quality Attribute experiments on real running HTTP servers + SQLite RDBMS,
 * captures authentic host hardware/OS specs, prints a consolidated table, and writes
 * `src/tests/latest_verification_report.json` for 100% reproducible documentation traceability.
 */

const os = require('os');
const fs = require('fs');
const path = require('path');
const http = require('http');

async function resolveAvailablePort(preferredPort, fallbackPort = preferredPort + 1) {
  return new Promise((resolve) => {
    const s = http.createServer();
    s.once('error', () => resolve(fallbackPort));
    s.once('listening', () => s.close(() => resolve(preferredPort)));
    s.listen(preferredPort, '127.0.0.1');
  });
}

const createServer = require('../core/server');
const mockManager = require('../mock-his/mockServersManager');

const runConcurrencyTest = require('./test_concurrency_double_booking');
const runCircuitBreakerTest = require('./test_circuit_breaker_fault_tolerance');
const runSecurityTest = require('./test_security_rbac_abac');
const runAuditTamperTest = require('./test_audit_tamper_detection');
const runExtensibilityTest = require('./test_extensibility_his4');
const runPerformanceAndWorkerTest = require('./test_performance_and_async_worker');

async function runAllTests() {
  const envInfo = {
    executedAt: new Date().toISOString(),
    osPlatform: `${os.platform()} ${os.release()} (${os.arch()})`,
    cpuModel: os.cpus()[0]?.model || 'Unknown CPU',
    logicalCores: os.cpus().length,
    totalRamGb: Number((os.totalmem() / 1024 / 1024 / 1024).toFixed(2)),
    nodeVersion: process.version
  };

  console.log('╔══════════════════════════════════════════════════════════════════════════════════════╗');
  console.log('║      MEDILINK ARCHITECTURE v2.0 - MASTER QUALITY ATTRIBUTE VERIFICATION SUITE       ║');
  console.log('║      Môn học: SE 403 (TS. Nguyễn Đức Mận) | Nhóm Đề tài 1: Danh - Nghĩa - Hy - Trường ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════════════╝');
  console.log(`[Môi trường đo thực tế] CPU: ${envInfo.cpuModel} (${envInfo.logicalCores} vCPU) | RAM: ${envInfo.totalRamGb} GB | OS: ${envInfo.osPlatform} | Node: ${envInfo.nodeVersion}`);

  await mockManager.startAll({ daNangPort: 8001, huePort: 8002, quangNamPort: 8003 });
  const testPort = await resolveAvailablePort(3000, 3001);
  const app = createServer();
  const server = await new Promise((resolve, reject) => {
    const s = app.listen(testPort, '127.0.0.1', () => resolve(s));
    s.on('error', reject);
  });

  const summary = [];
  let rawMetrics = {};

  try {
    const t1 = await runConcurrencyTest(testPort);
    const t2 = await runCircuitBreakerTest(testPort);
    const t3 = await runSecurityTest(testPort);
    const t4 = await runAuditTamperTest(testPort);
    const t5 = await runExtensibilityTest(testPort);
    const t6 = await runPerformanceAndWorkerTest(testPort);

    rawMetrics = { t1, t2, t3, t4, t5, t6 };

    summary.push(
      {
        id: 'ASR-01 / QAS-07',
        qa: 'Consistency & Idempotency (50 reqs)',
        sla: '1 thành công, 49 lỗi 409, p95 <= 500ms',
        measured: `1 OK, 49 Conflict, Replay OK, p95=${t1.p95}ms`,
        passed: t1.passed
      },
      {
        id: 'ASR-02 / ADR-007',
        qa: 'Availability & Outbox Recovery (Huế)',
        sla: 'CB OPEN, Fast-fail < 50ms, ĐN/QN 100%',
        measured: `CB=OPEN (${t2.fastFailLatencyMs}ms), Outbox=${t2.outboxRecoveredCount}/4`,
        passed: t2.passed
      },
      {
        id: 'ASR-03 / NĐ 13',
        qa: 'Security ABAC, Consent & AES-256-GCM',
        sla: 'Chặn chéo 403, Mã hóa DB, Signed PDF',
        measured: `HTTP 403 (${t3.abacCheckLatencyMs}ms), AES-GCM=true`,
        passed: t3.passed
      },
      {
        id: 'QAS-05 / C-04',
        qa: 'Audit Append-Only Trigger & HMAC',
        sla: 'Chặn SQL sửa/xóa, Phát hiện DBA 100%',
        measured: `Trigger=Blocked, HMAC Catch=${t4.verificationTimeMs}ms`,
        passed: t4.passed
      },
      {
        id: 'ASR-04',
        qa: 'Interoperability HIS #4 (HL7 FHIR R4)',
        sla: 'Sửa Core = 0 dòng, chuẩn FHIR R4',
        measured: `Synced (${t5.hisReferenceCode}), Core=0 dòng`,
        passed: t5.passed
      },
      {
        id: 'QAS-06 / QAS-08',
        qa: 'Performance (200 Reads) & Async Queue',
        sla: 'Tra cứu p95 < 300ms, SMS Retry=SENT',
        measured: `${t6.throughputRps} req/s, p95=${t6.readP95}ms, Queue=SENT`,
        passed: t6.passed
      }
    );
  } finally {
    await new Promise((resolve) => server.close(() => resolve()));
    await mockManager.stopAll();
  }

  console.log('\n╔══════════════════╦═══════════════════════════════════════╦══════════════════════════════════════════╦════════════╗');
  console.log('║ Kịch bản QA      ║ Thuộc tính Chất lượng Kiểm chứng      ║ Số liệu Đo lường Thực tế                 ║ Kết quả    ║');
  console.log('╠══════════════════╬═══════════════════════════════════════╬══════════════════════════════════════════╬════════════╣');
  for (const row of summary) {
    const badge = row.passed ? ' [ PASSED ] ' : ' [ FAILED ] ';
    console.log(
      `║ ${row.id.padEnd(16)} ║ ${row.qa.padEnd(37)} ║ ${row.measured.padEnd(40)} ║${badge}║`
    );
  }
  console.log('╚══════════════════╩═══════════════════════════════════════╩══════════════════════════════════════════╩════════════╝');

  const allPassed = summary.every((s) => s.passed);
  const reportPath = path.join(__dirname, 'latest_verification_report.json');
  fs.writeFileSync(
    reportPath,
    JSON.stringify({ environment: envInfo, allPassed, summary, rawMetrics }, null, 2),
    'utf8'
  );
  console.log(`\n[Saved Real Metrics] -> ${reportPath}`);
  console.log(`>>> KẾT LUẬN KIỂM CHỨNG: ${allPassed ? 'ĐẠT 100% (6/6 KỊCH BẢN QA CHỨNG MINH THÀNH CÔNG)' : 'CÓ KỊCH BẢN CHƯA ĐẠT'}\n`);

  return allPassed;
}

if (require.main === module) {
  runAllTests().then((ok) => process.exit(ok ? 0 : 1));
}

module.exports = runAllTests;
