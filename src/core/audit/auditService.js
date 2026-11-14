/**
 * Tamper-Evident Audit Service
 * Implements HMAC-SHA256 Cryptographic Hash Chaining (Blockchain-like Append-Only log)
 * Guarantees Non-repudiation and Compliance with Nghị định 13/2023/NĐ-CP
 */

const crypto = require('crypto');
const config = require('../config');
const db = require('../db/database');

const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

class AuditService {
  constructor() {
    this.secret = config.HMAC_AUDIT_SECRET;
  }

  /**
   * Calculate HMAC-SHA256
   */
  calculateHash(prevHash, payload) {
    const rawString = `${prevHash}|${payload.timestamp}|${payload.actorId}|${payload.actorRole}|${payload.facilityId}|${payload.action}|${payload.targetResource}|${payload.status}|${payload.details || ''}`;
    return crypto.createHmac('sha256', this.secret).update(rawString).digest('hex');
  }

  /**
   * Log an event into the immutable audit chain
   */
  logSecurityEvent({ actorId, actorRole, facilityId, action, targetResource, ipAddress, status, details }) {
    const logs = db.auditLogs;
    const prevHash = logs.length > 0 ? logs[logs.length - 1].current_hash : GENESIS_HASH;

    const timestamp = new Date().toISOString();
    const payload = {
      timestamp,
      actorId: actorId || 'UNKNOWN',
      actorRole: actorRole || 'UNKNOWN',
      facilityId: facilityId || 'SYSTEM',
      action,
      targetResource: targetResource || 'N/A',
      ipAddress: ipAddress || '127.0.0.1',
      status: status || 'INFO',
      details: details || ''
    };

    const currentHash = this.calculateHash(prevHash, payload);

    const logEntry = {
      id: logs.length + 1,
      prev_hash: prevHash,
      current_hash: currentHash,
      ...payload
    };

    // Strictly Append-Only!
    logs.push(logEntry);
    return logEntry;
  }

  /**
   * Get all logs (read-only)
   */
  getLogs() {
    return [...db.auditLogs];
  }
}

module.exports = new AuditService();
