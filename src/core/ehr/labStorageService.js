/**
 * Lab Result Object Storage & Pre-Signed URL Service (Implements ADR-005)
 * Stores large medical files (PDF lab reports, X-Ray images) outside RDBMS as encrypted blobs
 * and issues short-lived HMAC-signed URLs after RBAC/ABAC authorization passes.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const config = require('../config');
const encryptionService = require('./encryptionService');

class LabStorageService {
  constructor(storageDir = config.LAB_STORAGE_DIR) {
    this.storageDir = storageDir;
    fs.mkdirSync(this.storageDir, { recursive: true });
  }

  /**
   * Put encrypted binary object into isolated bucket directory
   */
  putEncryptedObject(fileKey, contentBuffer, mimeType = 'application/pdf') {
    const safeName = fileKey.replace(/[^a-zA-Z0-9._-]/g, '_');
    const fullPath = path.join(this.storageDir, `${safeName}.enc`);
    const metaPath = path.join(this.storageDir, `${safeName}.meta.json`);

    const encryptedBlob = encryptionService.encryptBuffer(
      Buffer.isBuffer(contentBuffer) ? contentBuffer : Buffer.from(String(contentBuffer), 'utf8')
    );

    fs.writeFileSync(fullPath, encryptedBlob);
    fs.writeFileSync(
      metaPath,
      JSON.stringify({
        fileKey: safeName,
        mimeType,
        encryptedSizeBytes: encryptedBlob.length,
        createdAt: new Date().toISOString()
      })
    );

    return { fileKey: safeName, encryptedSizeBytes: encryptedBlob.length };
  }

  /**
   * Generate short-lived HMAC-SHA256 Pre-signed URL (default TTL: 120 seconds)
   */
  generatePresignedUrl(fileKey, viewerId, ttlSec = 120) {
    const expires = Math.floor(Date.now() / 1000) + ttlSec;
    const canonical = `${fileKey}:${viewerId}:${expires}`;
    const sig = crypto
      .createHmac('sha256', config.FILE_SIGNING_SECRET)
      .update(canonical, 'utf8')
      .digest('hex');

    return `/api/ehr/files/${encodeURIComponent(fileKey)}?viewer=${encodeURIComponent(viewerId)}&expires=${expires}&sig=${sig}`;
  }

  /**
   * Verify Pre-signed URL signature & expiration, then decrypt object in memory
   */
  verifyAndReadObject(fileKey, viewerId, expires, sig) {
    const nowSec = Math.floor(Date.now() / 1000);
    const expNum = parseInt(expires || '0', 10);

    if (!expNum || nowSec > expNum) {
      const err = new Error('Pre-signed URL đã hết hạn hiệu lực.');
      err.code = 'PRESIGNED_URL_EXPIRED';
      err.statusCode = 403;
      throw err;
    }

    const canonical = `${fileKey}:${viewerId}:${expNum}`;
    const expectedSig = crypto
      .createHmac('sha256', config.FILE_SIGNING_SECRET)
      .update(canonical, 'utf8')
      .digest('hex');

    const sigBuf = Buffer.from(String(sig || ''), 'utf8');
    const expBuf = Buffer.from(expectedSig, 'utf8');
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      const err = new Error('Chữ ký Pre-signed URL không hợp lệ.');
      err.code = 'PRESIGNED_URL_INVALID_SIGNATURE';
      err.statusCode = 403;
      throw err;
    }

    const safeName = fileKey.replace(/[^a-zA-Z0-9._-]/g, '_');
    const fullPath = path.join(this.storageDir, `${safeName}.enc`);
    const metaPath = path.join(this.storageDir, `${safeName}.meta.json`);

    if (!fs.existsSync(fullPath)) {
      const err = new Error('Không tìm thấy tệp kết quả xét nghiệm trong Object Storage.');
      err.code = 'LAB_FILE_NOT_FOUND';
      err.statusCode = 404;
      throw err;
    }

    const encryptedBlob = fs.readFileSync(fullPath);
    const decryptedBuffer = encryptionService.decryptBuffer(encryptedBlob);
    const meta = fs.existsSync(metaPath)
      ? JSON.parse(fs.readFileSync(metaPath, 'utf8'))
      : { mimeType: 'application/pdf' };

    return { buffer: decryptedBuffer, mimeType: meta.mimeType };
  }
}

module.exports = new LabStorageService();
