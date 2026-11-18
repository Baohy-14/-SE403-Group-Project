/**
 * Tamper-Evident Append-Only Audit Service (Implements ADR-004 & Constraint C-04)
 * Persists every access/violation event into SQLite `audit_logs` (protected by SQLite
 * BEFORE UPDATE/DELETE triggers) AND links each entry via HMAC-SHA256 Cryptographic Hash Chain.
 */

const crypto = require('crypto');
const config = require('../config');
const db = require('../db/database');

const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

class AuditService {
  computeHmac({ prevHash, timestamp, actorId, actorRole, facilityId, action, targetResource, ipAddress, status, details }) {
    const canonicalPayload = [
      prevHash,
      timestamp,
      actorId,
      actorRole,
      facilityId,
      action,
      targetResource,
      ipAddress,
      status,
      details
    ].join('|');

    return crypto
      .createHmac('sha256', config.HMAC_AUDIT_SECRET)
      .update(canonicalPayload, 'utf8')
      .digest('hex');
  }

  logSecurityEvent({
    actorId = 'SYSTEM',
    actorRole = 'SYSTEM',
    facilityId = 'CENTRAL',
    action,
    targetResource,
    ipAddress = '127.0.0.1',
    status = 'SUCCESS',
    details = ''
  }) {
    const timestamp = new Date().toISOString();

    const lastRow = db.sqlite
      .prepare('SELECT current_hash FROM audit_logs ORDER BY id DESC LIMIT 1')
      .get();
    const prevHash = lastRow ? lastRow.current_hash : GENESIS_HASH;

    const currentHash = this.computeHmac({
      prevHash,
      timestamp,
      actorId,
      actorRole,
      facilityId,
      action,
      targetResource,
      ipAddress,
      status,
      details
    });

    const res = db.sqlite
      .prepare(
        `INSERT INTO audit_logs (
          timestamp, actor_id, actor_role, facility_id, action,
          target_resource, ip_address, status, details, prev_hash, current_hash
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        timestamp,
        actorId,
        actorRole,
        facilityId,
        action,
        targetResource,
        ipAddress,
        status,
        details,
        prevHash,
        currentHash
      );

    return {
      id: Number(res.lastInsertRowid),
      timestamp,
      actor_id: actorId,
      actor_role: actorRole,
      facility_id: facilityId,
      action,
      target_resource: targetResource,
      status,
      prev_hash: prevHash,
      current_hash: currentHash
    };
  }

  getLogs(limit = 200) {
    return db.sqlite
      .prepare('SELECT * FROM audit_logs ORDER BY id ASC LIMIT ?')
      .all(limit);
  }
}

module.exports = new AuditService();
module.exports.GENESIS_HASH = GENESIS_HASH;
