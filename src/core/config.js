/**
 * MediLink Platform Configuration
 */

module.exports = {
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // Security
  JWT_SECRET: process.env.JWT_SECRET || 'medilink-super-secret-key-2026-se403',
  HMAC_AUDIT_SECRET: process.env.HMAC_AUDIT_SECRET || 'medilink-audit-chain-tamper-proof-hmac-key-99',
  
  // Distributed Lock settings
  LOCK_TTL_MS: parseInt(process.env.LOCK_TTL_MS || '3000', 10), // 3 seconds TTL
  IDEMPOTENCY_EXPIRE_MS: parseInt(process.env.IDEMPOTENCY_EXPIRE_MS || '60000', 10), // 60s
  
  // HIS endpoints
  HIS_DANANG_URL: process.env.HIS_DANANG_URL || 'http://localhost:8001',
  HIS_HUE_URL: process.env.HIS_HUE_URL || 'http://localhost:8002',
  HIS_QUANGNAM_URL: process.env.HIS_QUANGNAM_URL || 'http://localhost:8003',
  HIS_GENERIC4_URL: process.env.HIS_GENERIC4_URL || 'http://localhost:8004',

  // Circuit breaker settings
  CIRCUIT_BREAKER: {
    TIMEOUT_MS: 2000,
    FAILURE_THRESHOLD: 3,
    RESET_TIMEOUT_MS: 5000
  }
};
