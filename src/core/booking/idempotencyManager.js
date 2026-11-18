/**
 * Persistent Idempotency Manager (Implements ADR-003 & QAS-07)
 * Backed by SQLite `idempotency_keys` table so repeated POST requests with the same
 * `X-Idempotency-Key` (e.g. flaky 4G mobile retries) never create duplicate bookings.
 */

const config = require('../config');
const db = require('../db/database');

class IdempotencyManager {
  get(key) {
    if (!key) return null;
    const now = Date.now();
    const row = db.sqlite
      .prepare('SELECT response_json, status_code, expires_at FROM idempotency_keys WHERE idem_key = ?')
      .get(String(key));

    if (!row) return null;
    if (row.expires_at <= now) {
      db.sqlite.prepare('DELETE FROM idempotency_keys WHERE idem_key = ?').run(String(key));
      return null;
    }

    return {
      statusCode: row.status_code,
      payload: JSON.parse(row.response_json)
    };
  }

  set(key, statusCode, payload, ttlSec = config.IDEMPOTENCY_TTL_SEC) {
    if (!key) return;
    const expiresAt = Date.now() + ttlSec * 1000;
    db.sqlite
      .prepare(
        `INSERT INTO idempotency_keys (idem_key, response_json, status_code, expires_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(idem_key) DO UPDATE SET
           response_json = excluded.response_json,
           status_code = excluded.status_code,
           expires_at = excluded.expires_at`
      )
      .run(String(key), JSON.stringify(payload), statusCode, expiresAt);
  }

  clear() {
    db.sqlite.exec('DELETE FROM idempotency_keys');
  }
}

module.exports = new IdempotencyManager();
