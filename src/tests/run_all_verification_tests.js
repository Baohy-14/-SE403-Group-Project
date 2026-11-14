/**
 * Master Verification Test Runner for MediLink Platform
 * Executes all Quality Attribute verification tests and outputs consolidated report
 */

const createServer = require('../core/server');
const mockManager = require('../mock-his/mockServersManager');

const runConcurrencyTest = require('./test_concurrency_double_booking');
const runCircuitBreakerTest = require('./test_circuit_breaker_fault_tolerance');
const runSecurityTest = require('./test_security_rbac_abac');
const runAuditTamperTest = require('./test_audit_tamper_detection');
const runExtensibilityTest = require('./test_extensibility_his4');

async function runAllTests() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║  MEDILINK ARCHITECTURE PROTOTYPE - MASTER VERIFICATION RUNNER    ║');
  console.log('║  CMUSE 403 - Group Project (Đề tài 1: MediLink Platform)         ║');
  console.log('║  Authors: Hy - Nghia - Danh - Truong                            ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');

  console.log('\n[*] Khởi động cụm 3 Mock HIS Servers (Đà Nẵng: 8001, Huế: 8002, Quảng Nam: 8003)...');
  await mockManager.startAll();

  console.log('[*] Khởi động MediLink Core Platform Server (Port: 3000)...');
  const app = createServer();
  const server = await new Promise(resolve => {
    const s = app.listen(3000, () => resolve(s));
  });

  const testReport = [];

  try {
    // Run Test 1
    const t1 = await runConcurrencyTest(3000);
    testReport.push({
      id: 'ASR-01',
      name: 'Chống Đặt trùng lịch (Concurrency 50 reqs)',
      expected: '1 thành công, 49 rejected (409), double-booking = 0%',
      actual: `${t1.successCount} thành công, ${t1.conflictCount} rejected, p95: ${t1.p95}ms`,
      passed: t1.passed
    });

    // Run Test 2
    const t2 = await runCircuitBreakerTest(3000);
    testReport.push({
      id: 'ASR-02',
      name: 'Chịu lỗi & Cách ly Sự cố HIS Huế (Availability)',
      expected: 'Đà Nẵng & Quảng Nam 100%, Circuit Breaker OPEN tại Huế',
      actual: `Đà Nẵng: OK, Quảng Nam: OK, Circuit Huế: ${t2.hueCbState}`,
      passed: t2.passed
    });

    // Run Test 3
    const t3 = await runSecurityTest(3000);
    testReport.push({
      id: 'ASR-03',
      name: 'Bảo mật & Phân quyền Ngữ cảnh (Contextual ABAC)',
      expected: 'Lễ tân Đà Nẵng xem bệnh án Huế bị chặn 403 Forbidden',
      actual: `Mã HTTP: ${t3.forbiddenStatus}, Audit Log Recorded: ${t3.auditRecorded}`,
      passed: t3.passed
    });

    // Run Test 4
    const t4 = await runAuditTamperTest(3000);
    testReport.push({
      id: 'ASR-05',
      name: 'Toàn vẹn Chuỗi Nhật ký Kiểm toán (HMAC Chain)',
      expected: 'Phát hiện ngay khi có can thiệp sửa đổi trái phép',
      actual: `Phát hiện gian lận: ${t4.detectedTamper ? 'CÓ (Chính xác)' : 'KHÔNG'}`,
      passed: t4.passed
    });

    // Run Test 5
    const t5 = await runExtensibilityTest(3000);
    testReport.push({
      id: 'ASR-04',
      name: 'Khả năng Mở rộng Tích hợp HIS thứ 4 (HL7 FHIR)',
      expected: 'Tích hợp qua ACL không sửa đổi Core Domain (0 lines)',
      actual: `Đồng bộ HIS 4: ${t5.success ? 'THÀNH CÔNG' : 'LỖI'}, FHIR Compliant: ${t5.fhirCompliant}`,
      passed: t5.passed
    });

  } finally {
    server.close();
    await mockManager.stopAll();
  }

  // Consolidated Results Table
  console.log('\n\n╔══════════════════════════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                     BẢNG TỔNG HỢP KẾT QUẢ KIỂM CHỨNG KIẾN TRÚC MEDILINK (PROTOTYPE)             ║');
  console.log('╠═════════╦════════════════════════════════════════╦══════════════════════════════════╦════════════╣');
  console.log('║ Mã ASR  ║ Thuộc tính chất lượng kiểm chứng     ║ Kết quả đo lường thực tế         ║ Đánh giá   ║');
  console.log('╠═════════╬════════════════════════════════════════╬══════════════════════════════════╬════════════╣');
  for (const item of testReport) {
    const statusStr = item.passed ? ' [ PASSED ] ' : ' [ FAILED ] ';
    console.log(`║ ${item.id.padEnd(7)} ║ ${item.name.padEnd(36)} ║ ${item.actual.padEnd(32)} ║ ${statusStr} ║`);
  }
  console.log('╚═════════╩════════════════════════════════════════╩══════════════════════════════════╩════════════╝');

  const allPassed = testReport.every(t => t.passed);
  console.log(`\n>>> KẾT LUẬN TOÀN DIỆN: ${allPassed ? '100% CÁC THUỘC TÍNH CHẤT LƯỢNG ĐÃ ĐƯỢC CHỨNG MINH THÀNH CÔNG!' : 'CÓ TEST THẤT BẠI'}\n`);
  return allPassed;
}

if (require.main === module) {
  runAllTests().then((ok) => {
    process.exit(ok ? 0 : 1);
  });
}

module.exports = runAllTests;
