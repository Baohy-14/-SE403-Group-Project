/**
 * Audit Log Integrity Verifier
 * Scans the HMAC chain from Genesis to latest block
 * Detects any tampering, deletion, or insertion
 */

const auditService = require('./auditService');
const db = require('../db/database');

const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

class AuditVerifier {
  /**
   * Verify complete audit chain
   * @returns {{ isValid: boolean, checkedCount: number, errorDetails: string|null, brokenAtIndex: number|null }}
   */
  verifyChainIntegrity() {
    const logs = db.auditLogs;

    if (logs.length === 0) {
      return {
        isValid: true,
        checkedCount: 0,
        errorDetails: null,
        brokenAtIndex: null
      };
    }

    let expectedPrevHash = GENESIS_HASH;

    for (let i = 0; i < logs.length; i++) {
      const entry = logs[i];

      // Check 1: prev_hash pointer matches previous block's current_hash
      if (entry.prev_hash !== expectedPrevHash) {
        return {
          isValid: false,
          checkedCount: i,
          brokenAtIndex: i + 1,
          errorDetails: `Đứt gãy liên kết chuỗi tại bản ghi #${i + 1}: prev_hash không khớp với current_hash của bản ghi liền trước.`
        };
      }

      // Check 2: Recompute hash using secret key and entry payload
      const recomputedHash = auditService.calculateHash(expectedPrevHash, {
        timestamp: entry.timestamp,
        actorId: entry.actorId,
        actorRole: entry.actorRole,
        facilityId: entry.facilityId,
        action: entry.action,
        targetResource: entry.targetResource,
        status: entry.status,
        details: entry.details
      });

      if (recomputedHash !== entry.current_hash) {
        return {
          isValid: false,
          checkedCount: i,
          brokenAtIndex: i + 1,
          errorDetails: `Phát hiện giả mạo dữ liệu tại bản ghi #${i + 1}: Nội dung đã bị chỉnh sửa trái phép (Mã băm thực tế: ${entry.current_hash} khác mã băm tính lại: ${recomputedHash}).`
        };
      }

      expectedPrevHash = entry.current_hash;
    }

    return {
      isValid: true,
      checkedCount: logs.length,
      latestHash: expectedPrevHash,
      errorDetails: null,
      brokenAtIndex: null
    };
  }
}

module.exports = new AuditVerifier();
