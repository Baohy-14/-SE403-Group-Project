/**
 * MediLink Background Worker Process (Implements ADR-006, ADR-007 & Architecture v2)
 * Runs 3 asynchronous background loops:
 *  1. OutboxSyncWorker: Replays `PENDING` HIS sync events with Rate Limiting + Random Jitter
 *     when a degraded HIS (e.g. HIS Huế) transitions to HALF_OPEN / CLOSED (mitigates Thundering Herd Risk R-02).
 *  2. NotificationQueueWorker: Processes SMS / Zalo ZNS / Email jobs with Exponential Backoff
 *     retry & Dead-Letter Queue (isolates external gateway failures from Booking Core - QAS-08).
 *  3. AuditIntegrityWorker: Periodically verifies the entire HMAC-SHA256 hash chain (Risk R-03).
 */

const config = require('../core/config');
const db = require('../core/db/database');
const hisDispatcher = require('../core/acl/hisDispatcher');
const auditVerifier = require('../core/audit/auditVerifier');
const auditService = require('../core/audit/auditService');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class BackgroundWorker {
  constructor() {
    this.running = false;
    this.timer = null;
    // Simulated external SMS/Zalo gateway failure rate or forced failure count for QAS-08 testing
    this.simulatedSmsFailuresRemaining = 0;
    this.stats = {
      outboxSynced: 0,
      outboxRetried: 0,
      notificationsSent: 0,
      notificationsRetried: 0,
      auditChecksRun: 0,
      lastAuditValid: true
    };
  }

  injectSmsGatewayFailures(count = 2) {
    this.simulatedSmsFailuresRemaining = count;
  }

  /**
   * Process one batch of pending Transactional Outbox events with Rate-Controlled Sync + Jitter
   */
  async processOutboxBatch(batchSize = config.OUTBOX_BATCH_SIZE) {
    const events = db.getPendingOutboxEvents(batchSize);
    let syncedCount = 0;

    for (const evt of events) {
      // Rate-controlled pacing + random jitter (20..60ms) to avoid overwhelming recovering legacy HIS!
      const jitterMs = 20 + Math.floor(Math.random() * 40);
      await sleep(jitterMs);

      const payload = JSON.parse(evt.payload_json);
      try {
        const result = await hisDispatcher.syncAppointment(evt.facility_id, payload);
        if (result && result.success) {
          db.markOutboxSynced(evt.id);
          db.updateBookingHisSync(evt.booking_id, 'SYNCED', result.hisReferenceCode);
          this.stats.outboxSynced += 1;
          syncedCount += 1;

          auditService.logSecurityEvent({
            actorId: 'OUTBOX_WORKER',
            actorRole: 'SYSTEM',
            facilityId: evt.facility_id,
            action: 'OUTBOX_RECOVERY_SYNCED',
            targetResource: evt.booking_id,
            status: 'SUCCESS',
            details: `Đồng bộ bù lịch hẹn [${evt.booking_id}] sang [${evt.facility_id}] thành công (Mã HIS: ${result.hisReferenceCode})`
          });
        }
      } catch (err) {
        const nextAttempts = evt.attempts + 1;
        // Exponential backoff + random jitter (e.g. 200ms, 400ms, 800ms... capped at 10s)
        const backoffMs =
          Math.min(10000, config.OUTBOX_BASE_DELAY_MS * Math.pow(2, nextAttempts)) +
          Math.floor(Math.random() * 80);
        db.markOutboxRetry(evt.id, nextAttempts, Date.now() + backoffMs, err.message);
        this.stats.outboxRetried += 1;
      }
    }

    return syncedCount;
  }

  /**
   * Process one batch of Asynchronous Notification Queue jobs (SMS / Zalo ZNS / Email)
   */
  async processNotificationBatch(batchSize = 10) {
    const jobs = db.getDueNotificationJobs(batchSize);
    let sentCount = 0;

    for (const job of jobs) {
      try {
        if (this.simulatedSmsFailuresRemaining > 0) {
          this.simulatedSmsFailuresRemaining -= 1;
          throw new Error('SMS_ZALO_GATEWAY_HTTP_503_TEMPORARY_UNAVAILABLE');
        }

        // Simulate fast external webhook delivery (2-5ms)
        await sleep(2);
        db.markNotificationSent(job.id);
        this.stats.notificationsSent += 1;
        sentCount += 1;
      } catch (err) {
        const attempts = job.attempts + 1;
        // Short exponential backoff (50ms, 100ms, 200ms) for fast automated test verification
        const backoffMs = 50 * Math.pow(2, attempts - 1);
        db.markNotificationFailed(job.id, attempts, job.max_attempts, backoffMs, err.message);
        this.stats.notificationsRetried += 1;
      }
    }

    return sentCount;
  }

  /**
   * Run cryptographic HMAC chain integrity scan
   */
  runAuditIntegrityScan() {
    const check = auditVerifier.verifyChainIntegrity();
    this.stats.auditChecksRun += 1;
    this.stats.lastAuditValid = check.isValid;
    return check;
  }

  start(intervalMs = 1500) {
    if (this.running) return;
    this.running = true;
    this.timer = setInterval(async () => {
      try {
        await this.processOutboxBatch();
        await this.processNotificationBatch();
        this.runAuditIntegrityScan();
      } catch {
        // Worker loop continues resiliently
      }
    }, intervalMs);
    if (typeof this.timer.unref === 'function') this.timer.unref();
  }

  stop() {
    this.running = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}

const workerInstance = new BackgroundWorker();

if (require.main === module) {
  console.log('==============================================================');
  console.log(' MediLink Background Worker Started (Outbox + Queue + Audit)  ');
  console.log('==============================================================');
  workerInstance.start(1500);
  // Keep standalone container process alive
  setInterval(() => {}, 60000);
}

module.exports = workerInstance;
