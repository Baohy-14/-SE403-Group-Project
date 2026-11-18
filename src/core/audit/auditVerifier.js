/**
 * Cryptographic Audit Chain Integrity Verifier (Architecture v2 - Risk R-03 Mitigation)
 * Recomputes HMAC-SHA256 hashes from Genesis block (id=1) through the latest entry
 * to detect any unauthorized SQL modification, row deletion, or hash chain break.
 */

const db = require('../db/database');
const auditService = require('./auditService');
const { GENESIS_HASH } = require('./auditService');

class AuditVerifier {
  verifyChainIntegrity() {
    const startNs = process.hrtime.bigint();
    const rows = db.sqlite.prepare('SELECT * FROM audit_logs ORDER BY id ASC').all();

    let expectedPrevHash = GENESIS_HASH;
    let expectedNextId = 1;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      // Detect deleted row gap in append-only sequence
      if (i > 0 && row.id !== expectedNextId) {
        const elapsedMs = Number(process.hrtime.bigint() - startNs) / 1e6;
        return {
          isValid: false,
          checkedBlocks: i + 1,
          totalBlocks: rows.length,
          tamperedBlockId: row.id,
          reason: 'DELETED_RECORD_SEQUENCE_GAP',
          verificationTimeMs: Number(elapsedMs.toFixed(3))
        };
      }
      expectedNextId = row.id + 1;

      if (row.prev_hash !== expectedPrevHash) {
        const elapsedMs = Number(process.hrtime.bigint() - startNs) / 1e6;
        return {
          isValid: false,
          checkedBlocks: i + 1,
          totalBlocks: rows.length,
          tamperedBlockId: row.id,
          reason: 'BROKEN_PREV_HASH_POINTER',
          expectedPrevHash,
          actualPrevHash: row.prev_hash,
          verificationTimeMs: Number(elapsedMs.toFixed(3))
        };
      }

      const recomputedHash = auditService.computeHmac({
        prevHash: row.prev_hash,
        timestamp: row.timestamp,
        actorId: row.actor_id,
        actorRole: row.actor_role,
        facilityId: row.facility_id,
        action: row.action,
        targetResource: row.target_resource,
        ipAddress: row.ip_address,
        status: row.status,
        details: row.details
      });

      if (recomputedHash !== row.current_hash) {
        const elapsedMs = Number(process.hrtime.bigint() - startNs) / 1e6;
        return {
          isValid: false,
          checkedBlocks: i + 1,
          totalBlocks: rows.length,
          tamperedBlockId: row.id,
          reason: 'HMAC_SIGNATURE_MISMATCH',
          storedHash: row.current_hash,
          recomputedHash,
          verificationTimeMs: Number(elapsedMs.toFixed(3))
        };
      }

      expectedPrevHash = row.current_hash;
    }

    const elapsedMs = Number(process.hrtime.bigint() - startNs) / 1e6;
    return {
      isValid: true,
      checkedBlocks: rows.length,
      totalBlocks: rows.length,
      headHash: expectedPrevHash,
      verificationTimeMs: Number(elapsedMs.toFixed(3))
    };
  }
}

module.exports = new AuditVerifier();
