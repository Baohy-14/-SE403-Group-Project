/**
 * Field-Level Authenticated Encryption Service (AES-256-GCM)
 * Complies with Nghị định 13/2023/NĐ-CP (Điều 2 & Điều 27) - Technical Constraint C-02.
 * Ensures sensitive health fields (diagnosis, clinical notes, prescriptions, lab results)
 * are stored as authenticated ciphertext in RDBMS, with encryption keys separated from DB.
 */

const crypto = require('crypto');
const config = require('../config');

class EncryptionService {
  constructor(secretMaterial = config.DATA_ENCRYPTION_KEY) {
    // Derive a deterministic 32-byte (256-bit) master key from externalized secret material
    this.key = crypto.createHash('sha256').update(String(secretMaterial), 'utf8').digest();
  }

  /**
   * Encrypt plaintext string using AES-256-GCM with unique 96-bit IV per value.
   * Output format: "enc:v1:<iv_b64>:<authTag_b64>:<ciphertext_b64>"
   */
  encryptField(plaintext, aad = 'medilink-sensitive-ehr') {
    if (plaintext === null || plaintext === undefined) return null;
    const iv = crypto.randomBytes(12); // 96-bit IV recommended by NIST SP 800-38D for GCM
    const cipher = crypto.createCipheriv('aes-256-gcm', this.key, iv);
    cipher.setAAD(Buffer.from(String(aad), 'utf8'));

    const encrypted = Buffer.concat([
      cipher.update(String(plaintext), 'utf8'),
      cipher.final()
    ]);
    const authTag = cipher.getAuthTag();

    return `enc:v1:${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
  }

  /**
   * Decrypt AES-256-GCM ciphertext and verify authentication tag integrity.
   */
  decryptField(payload, aad = 'medilink-sensitive-ehr') {
    if (!payload) return null;
    const parts = String(payload).split(':');
    if (parts.length !== 5 || parts[0] !== 'enc' || parts[1] !== 'v1') {
      throw new Error('INVALID_CIPHERTEXT_FORMAT');
    }

    const iv = Buffer.from(parts[2], 'base64');
    const authTag = Buffer.from(parts[3], 'base64');
    const ciphertext = Buffer.from(parts[4], 'base64');

    const decipher = crypto.createDecipheriv('aes-256-gcm', this.key, iv);
    decipher.setAAD(Buffer.from(String(aad), 'utf8'));
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final()
    ]);
    return decrypted.toString('utf8');
  }

  /**
   * Encrypt binary Buffer (for Lab PDF/DICOM files in Object Storage - ADR-005)
   */
  encryptBuffer(buffer) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.key, iv);
    const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return Buffer.concat([iv, authTag, encrypted]);
  }

  decryptBuffer(packedBuffer) {
    const iv = packedBuffer.subarray(0, 12);
    const authTag = packedBuffer.subarray(12, 28);
    const ciphertext = packedBuffer.subarray(28);
    const decipher = crypto.createDecipheriv('aes-256-gcm', this.key, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  }
}

module.exports = new EncryptionService();
