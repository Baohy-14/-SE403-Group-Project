/**
 * MediLink Platform - Centralized Configuration (12-Factor App Principles)
 * Secrets (JWT, AES-256-GCM Master Key, HMAC Audit Key) are externalized from DB.
 */

const path = require('path');

module.exports = {
  PORT: parseInt(process.env.PORT || '3000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',

  // SQLite Relational DB Path (':memory:' for isolated tests, '/data/medilink.db' in Docker)
  DB_PATH: process.env.DB_PATH || ':memory:',

  // Object Storage Directory for Sensitive Lab PDF/Images (ADR-005)
  LAB_STORAGE_DIR: process.env.LAB_STORAGE_DIR || path.join(__dirname, '..', '..', '.runtime_storage', 'lab-files'),

  // Redis Distributed Lock Configuration (ADR-003)
  REDIS_HOST: process.env.REDIS_HOST || null,
  REDIS_PORT: parseInt(process.env.REDIS_PORT || '6379', 10),
  LOCK_TTL_MS: parseInt(process.env.LOCK_TTL_MS || '3000', 10),
  IDEMPOTENCY_TTL_SEC: parseInt(process.env.IDEMPOTENCY_TTL_SEC || '300', 10),

  // Security & Cryptography Keys (Externalized per Nghị định 13/2023/NĐ-CP - C-02 & C-04)
  JWT_SECRET: process.env.JWT_SECRET || 'medilink-se403-jwt-hs256-signing-secret-2026',
  // 32-byte hex/utf8 key material hashed via SHA-256 for AES-256-GCM field encryption
  DATA_ENCRYPTION_KEY: process.env.DATA_ENCRYPTION_KEY || 'medilink-aes256gcm-master-ehr-key-separated-from-db-2026',
  HMAC_AUDIT_SECRET: process.env.HMAC_AUDIT_SECRET || 'medilink-hmac-sha256-tamper-evident-audit-secret-2026',
  FILE_SIGNING_SECRET: process.env.FILE_SIGNING_SECRET || 'medilink-presigned-lab-object-url-secret-2026',

  // Rate Limiter at Ingress Gateway (Architecture v2 - Risk R-01 Mitigation)
  RATE_LIMIT_CAPACITY: parseInt(process.env.RATE_LIMIT_CAPACITY || '60', 10),
  RATE_LIMIT_REFILL_PER_SEC: parseFloat(process.env.RATE_LIMIT_REFILL_PER_SEC || '10'),

  // Circuit Breaker & Outbox Recovery (ADR-002 & ADR-007 - Risk R-02 Mitigation)
  HIS_TIMEOUT_MS: parseInt(process.env.HIS_TIMEOUT_MS || '1500', 10),
  CB_FAILURE_THRESHOLD: parseInt(process.env.CB_FAILURE_THRESHOLD || '3', 10),
  CB_RESET_TIMEOUT_MS: parseInt(process.env.CB_RESET_TIMEOUT_MS || '4000', 10),
  OUTBOX_BATCH_SIZE: parseInt(process.env.OUTBOX_BATCH_SIZE || '5', 10),
  OUTBOX_BASE_DELAY_MS: parseInt(process.env.OUTBOX_BASE_DELAY_MS || '60', 10),

  // External HIS Endpoints (3 Legacy Clinic Groups across 12 Clinics)
  HIS_DANANG_URL: process.env.HIS_DANANG_URL || 'http://127.0.0.1:8001',
  HIS_HUE_URL: process.env.HIS_HUE_URL || 'http://127.0.0.1:8002',
  HIS_QUANGNAM_URL: process.env.HIS_QUANGNAM_URL || 'http://127.0.0.1:8003'
};
