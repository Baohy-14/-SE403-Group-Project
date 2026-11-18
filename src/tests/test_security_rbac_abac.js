/**
 * Test 3 (ASR-03, C-01, C-02, C-03, ADR-004 & ADR-005):
 * Multi-Layer Healthcare Security & Nghị định 13/2023/NĐ-CP Compliance Suite
 * Verifies:
 *  1. Forged JWT signature rejected (401 Unauthorized)
 *  2. Receptionist Đà Nẵng reading Huế EHR blocked with 403 Forbidden + Audit Log recorded
 *  3. Same-facility Receptionist gets masked administrative metadata (Data Minimization)
 *  4. Inter-facility Doctor blocked until Patient grants explicit Consent (Điều 11 NĐ 13/2023)
 *  5. Raw SQLite `medical_records` column confirmed encrypted with AES-256-GCM (`enc:v1:...`)
 *  6. Encrypted Lab PDF accessed via short-lived Pre-signed URL; tampered URL rejected (403)
 */

const db = require('../core/db/database');

async function loginAs(baseUrl, username) {
  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username })
  });
  const data = await res.json();
  return data.access_token;
}

async function runSecurityTest(port = 3000) {
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log('\n[TEST 3 - ASR-03 & NĐ 13/2023] Kiểm chứng JWT, Contextual ABAC, Consent, Mã hóa AES-256-GCM & Pre-signed URL...');

  // Reset patient2 consent for FAC_DANANG to ensure clean test state
  db.setPatientConsent('user_pat_02', 'FAC_DANANG', false, 'READ_EHR');

  const [tokenRecDn, tokenDocDn, tokenPat2, tokenAdmin] = await Promise.all([
    loginAs(baseUrl, 'reception_dn'),
    loginAs(baseUrl, 'doctor_dn'),
    loginAs(baseUrl, 'patient2'),
    loginAs(baseUrl, 'admin')
  ]);

  // 1. Forged JWT Signature Check
  const forgedToken = `${tokenRecDn.slice(0, -6)}XXXXXX`;
  const forgedRes = await fetch(`${baseUrl}/api/ehr/records/REC-DN-1122`, {
    headers: { Authorization: `Bearer ${forgedToken}` }
  });

  // 2. Mandatory Scenario (c): Receptionist Đà Nẵng attempts to read Patient Record at Huế
  const abacStartNs = process.hrtime.bigint();
  const crossFacRes = await fetch(`${baseUrl}/api/ehr/records/REC-HUE-5544`, {
    headers: { Authorization: `Bearer ${tokenRecDn}` }
  });
  const abacCheckLatencyMs = Number((Number(process.hrtime.bigint() - abacStartNs) / 1e6).toFixed(2));
  const crossFacBody = await crossFacRes.json();

  // Verify audit entry recorded in SQLite
  const auditLogsRes = await fetch(`${baseUrl}/api/audit/logs`, {
    headers: { Authorization: `Bearer ${tokenAdmin}` }
  });
  const auditLogsJson = await auditLogsRes.json();
  const violationAudit = auditLogsJson.data.find(
    (l) => l.action === 'ACCESS_DENIED_CROSS_FACILITY_EHR' && l.target_resource === 'REC-HUE-5544'
  );

  // 3. Same-facility Receptionist check -> Masked clinical fields
  const sameFacRes = await fetch(`${baseUrl}/api/ehr/records/REC-DN-1122`, {
    headers: { Authorization: `Bearer ${tokenRecDn}` }
  });
  const sameFacJson = await sameFacRes.json();
  const maskedProperly =
    sameFacRes.status === 200 && String(sameFacJson.data.diagnosis).includes('[REDACTED');

  // 4. Inter-facility Doctor WITHOUT Consent (403) -> Patient Grants Consent -> Doctor Succeeds (200)
  const docNoConsentRes = await fetch(`${baseUrl}/api/ehr/records/REC-HUE-5544`, {
    headers: { Authorization: `Bearer ${tokenDocDn}` }
  });

  await fetch(`${baseUrl}/api/ehr/consents`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenPat2}`
    },
    body: JSON.stringify({ facility_id: 'FAC_DANANG', grant: true })
  });

  const docWithConsentRes = await fetch(`${baseUrl}/api/ehr/records/REC-HUE-5544`, {
    headers: { Authorization: `Bearer ${tokenDocDn}` }
  });
  const docWithConsentJson = await docWithConsentRes.json();

  // 5. Verify AES-256-GCM Ciphertext at rest directly in SQLite table!
  const rawDbRow = db.getRawMedicalRecordById('REC-HUE-5544');
  const encryptedAtRestVerified =
    rawDbRow.diagnosis_enc.startsWith('enc:v1:') &&
    !rawDbRow.diagnosis_enc.includes('Đái tháo đường') &&
    docWithConsentJson.data.diagnosis.includes('Đái tháo đường');

  // 6. Verify Pre-signed Object Storage URL for Lab PDF (Valid = 200, Tampered = 403)
  const presignedPath = docWithConsentJson.data.lab_report_presigned_url;
  const validPdfRes = await fetch(`${baseUrl}${presignedPath}`);
  const validPdfText = await validPdfRes.text();
  const tamperedPdfRes = await fetch(`${baseUrl}${presignedPath}00`);

  const passed =
    forgedRes.status === 401 &&
    crossFacRes.status === 403 &&
    Boolean(violationAudit) &&
    maskedProperly &&
    docNoConsentRes.status === 403 &&
    docWithConsentRes.status === 200 &&
    encryptedAtRestVerified &&
    validPdfRes.status === 200 &&
    validPdfText.includes('%PDF-1.4') &&
    tamperedPdfRes.status === 403;

  console.log(`   -> Token giả mạo chữ ký: HTTP ${forgedRes.status} | Lễ tân Đà Nẵng xem bệnh án Huế: HTTP ${crossFacRes.status} (${abacCheckLatencyMs}ms)`);
  console.log(`   -> Ghi vết vi phạm Audit Log: ID #${violationAudit?.id} (HMAC=${violationAudit?.current_hash.slice(0, 16)}...)`);
  console.log(`   -> Kiểm tra Consent liên cơ sở (NĐ 13/2023): Chưa cấp=${docNoConsentRes.status} | Đã cấp=${docWithConsentRes.status}`);
  console.log(`   -> Đối chiếu SQLite At-Rest: "${rawDbRow.diagnosis_enc.slice(0, 34)}..." (AES-256-GCM = ${encryptedAtRestVerified})`);
  console.log(`   -> Tải Lab PDF qua Pre-signed URL: Hợp lệ=${validPdfRes.status} | Sửa chữ ký=${tamperedPdfRes.status}`);

  return {
    passed,
    forbiddenStatus: crossFacRes.status,
    abacCheckLatencyMs,
    auditRecorded: Boolean(violationAudit),
    encryptedAtRestVerified,
    consentFlowVerified: docNoConsentRes.status === 403 && docWithConsentRes.status === 200,
    presignedUrlVerified: validPdfRes.status === 200 && tamperedPdfRes.status === 403
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
      const res = await runSecurityTest(3000);
      process.exit(res.passed ? 0 : 1);
    } finally {
      srv.close();
      await mockManager.stopAll();
    }
  })();
}

module.exports = runSecurityTest;
