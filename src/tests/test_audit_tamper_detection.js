/**
 * Test 4 (QAS-05 / C-04): Append-Only SQLite Trigger & Cryptographic HMAC Chain Tamper Detection
 * Verifies 2 layers of audit log protection:
 *  Layer 1: Standard SQL `UPDATE` and `DELETE` on `audit_logs` are blocked by SQLite Triggers.
 *  Layer 2: Even if a root DBA temporarily drops the trigger to alter a row on disk,
 *           `AuditVerifier` immediately detects the broken HMAC-SHA256 hash chain (< 5ms)!
 */

const db = require('../core/db/database');
const auditService = require('../core/audit/auditService');

async function runAuditTamperTest(port = 3000) {
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log('\n[TEST 4 - QAS-05 & C-04] Kiểm chứng Audit Log Append-Only Trigger & Chuỗi băm HMAC-SHA256...');

  // Ensure at least one audit log exists
  if (auditService.getLogs(5).length === 0) {
    auditService.logSecurityEvent({
      actorId: 'user_doc_dn',
      actorRole: 'DOCTOR',
      facilityId: 'FAC_DANANG',
      action: 'INITIAL_AUDIT_ANCHOR',
      targetResource: 'REC-DN-1122',
      status: 'SUCCESS',
      details: 'Khởi tạo chuỗi kiểm toán ban đầu.'
    });
  }

  // Layer 1: Attempt direct SQL UPDATE & DELETE -> Must throw APPEND_ONLY_AUDIT_VIOLATION!
  let sqlUpdateBlocked = false;
  let sqlDeleteBlocked = false;

  try {
    db.sqlite.exec(`UPDATE audit_logs SET details = 'XOA_DAU_VET' WHERE id = 1`);
  } catch (err) {
    sqlUpdateBlocked = String(err.message).includes('APPEND_ONLY_AUDIT_VIOLATION');
  }

  try {
    db.sqlite.exec(`DELETE FROM audit_logs WHERE id = 1`);
  } catch (err) {
    sqlDeleteBlocked = String(err.message).includes('APPEND_ONLY_AUDIT_VIOLATION');
  }

  // Verify baseline chain is valid
  const initialRes = await fetch(`${baseUrl}/api/audit/verify`);
  const initialJson = await initialRes.json();

  // Layer 2: Simulate privileged Root DBA bypassing trigger to alter row #1
  const originalRow = db.sqlite.prepare('SELECT details FROM audit_logs WHERE id = 1').get();
  db.simulateRootDbaTamper(1, '[ROOT_DBA_FORGED] Đã sửa thời gian truy xuất bệnh án VIP');

  const tamperRes = await fetch(`${baseUrl}/api/audit/verify`);
  const tamperJson = await tamperRes.json();

  // Restore original details so subsequent tests see a clean database
  db.simulateRootDbaTamper(1, originalRow.details);
  const restoredRes = await fetch(`${baseUrl}/api/audit/verify`);
  const restoredJson = await restoredRes.json();

  const detectedTamper =
    tamperRes.status === 409 &&
    tamperJson.verification.isValid === false &&
    tamperJson.verification.tamperedBlockId === 1 &&
    tamperJson.verification.reason === 'HMAC_SIGNATURE_MISMATCH';

  const passed =
    sqlUpdateBlocked &&
    sqlDeleteBlocked &&
    initialJson.verification.isValid === true &&
    detectedTamper &&
    restoredJson.verification.isValid === true;

  console.log(`   -> Chốt chặn 1 (SQLite Trigger): Chặn SQL UPDATE=${sqlUpdateBlocked} | Chặn SQL DELETE=${sqlDeleteBlocked}`);
  console.log(`   -> Chốt chặn 2 (Root DBA sửa đĩa): Phát hiện gian lận tại bản ghi #${tamperJson.verification.tamperedBlockId} (${tamperJson.verification.reason}) trong ${tamperJson.verification.verificationTimeMs}ms`);

  return {
    passed,
    sqlUpdateBlocked,
    sqlDeleteBlocked,
    detectedTamper,
    tamperedBlockId: tamperJson.verification.tamperedBlockId,
    verificationTimeMs: tamperJson.verification.verificationTimeMs
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
      const res = await runAuditTamperTest(3000);
      process.exit(res.passed ? 0 : 1);
    } finally {
      srv.close();
      await mockManager.stopAll();
    }
  })();
}

module.exports = runAuditTamperTest;
