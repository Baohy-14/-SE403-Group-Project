/**
 * MediLink Relational Database Layer (Real SQLite RDBMS via Node.js 22 node:sqlite)
 * Enforces:
 * 1. Strict RDBMS UNIQUE constraint on active appointments: UNIQUE(active_slot_key)
 * 2. Append-Only Audit Log via SQLite BEFORE UPDATE & BEFORE DELETE Triggers
 * 3. AES-256-GCM Encrypted Sensitive Columns in medical_records
 * 4. Master Patient Index (MPI) <-> Heterogeneous HIS Patient ID Mappings
 * 5. Transactional Outbox & Notification Queue tables (Architecture v2)
 */

const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const config = require('../config');
const encryptionService = require('../ehr/encryptionService');
const labStorageService = require('../ehr/labStorageService');

class MediLinkDatabase {
  constructor(dbPath = config.DB_PATH) {
    this.dbPath = dbPath;
    if (dbPath !== ':memory:') {
      fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    }
    this.sqlite = new DatabaseSync(dbPath);
    this.initSchema();
    this.seedInitialData();
  }

  initSchema() {
    this.sqlite.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;
      PRAGMA busy_timeout = 5000;

      CREATE TABLE IF NOT EXISTS facilities (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        region TEXT NOT NULL,
        clinic_count INTEGER NOT NULL DEFAULT 1,
        his_type TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        role TEXT NOT NULL,
        facility_id TEXT,
        mpi_id TEXT,
        full_name TEXT NOT NULL
      );

      -- Master Patient Index (MPI) cross-referencing heterogeneous HIS patient codes
      CREATE TABLE IF NOT EXISTS patient_his_mappings (
        mpi_id TEXT NOT NULL,
        facility_id TEXT NOT NULL,
        local_his_patient_id TEXT NOT NULL,
        PRIMARY KEY (mpi_id, facility_id)
      );

      -- Explicit Patient Consent per Nghị định 13/2023/NĐ-CP (Điều 11)
      CREATE TABLE IF NOT EXISTS patient_consents (
        patient_id TEXT NOT NULL,
        granted_facility_id TEXT NOT NULL,
        scope TEXT NOT NULL DEFAULT 'READ_EHR',
        is_active INTEGER NOT NULL DEFAULT 1,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (patient_id, granted_facility_id, scope)
      );

      CREATE TABLE IF NOT EXISTS doctors (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        specialty TEXT NOT NULL,
        facility_id TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS slots (
        id TEXT PRIMARY KEY,
        doctor_id TEXT NOT NULL,
        slot_time TEXT NOT NULL,
        facility_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'AVAILABLE',
        version INTEGER NOT NULL DEFAULT 1,
        UNIQUE(doctor_id, slot_time)
      );

      -- Active bookings enforce UNIQUE(active_slot_key) where active_slot_key = doctor_id || '|' || slot_time
      -- When cancelled, active_slot_key is set to NULL so the slot can be re-booked cleanly!
      CREATE TABLE IF NOT EXISTS bookings (
        id TEXT PRIMARY KEY,
        doctor_id TEXT NOT NULL,
        slot_time TEXT NOT NULL,
        active_slot_key TEXT UNIQUE,
        patient_id TEXT NOT NULL,
        patient_mpi TEXT,
        patient_name TEXT NOT NULL,
        facility_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'CONFIRMED',
        deposit_status TEXT NOT NULL DEFAULT 'PAID',
        his_sync_status TEXT NOT NULL DEFAULT 'PENDING',
        his_reference_code TEXT,
        fencing_token INTEGER,
        created_at TEXT NOT NULL
      );

      -- Sensitive fields stored strictly as AES-256-GCM ciphertext (C-02)
      CREATE TABLE IF NOT EXISTS medical_records (
        id TEXT PRIMARY KEY,
        patient_id TEXT NOT NULL,
        patient_mpi TEXT NOT NULL,
        patient_name TEXT NOT NULL,
        facility_id TEXT NOT NULL,
        doctor_id TEXT NOT NULL,
        diagnosis_enc TEXT NOT NULL,
        clinical_notes_enc TEXT NOT NULL,
        prescription_enc TEXT NOT NULL,
        lab_summary_enc TEXT NOT NULL,
        lab_file_key TEXT,
        sensitivity_level TEXT NOT NULL DEFAULT 'LEVEL_3_SENSITIVE_HEALTH',
        created_at TEXT NOT NULL
      );

      -- Append-only Tamper-Evident Audit Log with Cryptographic Hash Chain (C-04)
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        actor_id TEXT NOT NULL,
        actor_role TEXT NOT NULL,
        facility_id TEXT NOT NULL,
        action TEXT NOT NULL,
        target_resource TEXT NOT NULL,
        ip_address TEXT NOT NULL,
        status TEXT NOT NULL,
        details TEXT NOT NULL,
        prev_hash TEXT NOT NULL,
        current_hash TEXT NOT NULL
      );

      CREATE TRIGGER IF NOT EXISTS trg_audit_logs_no_update
      BEFORE UPDATE ON audit_logs
      BEGIN
        SELECT RAISE(ABORT, 'APPEND_ONLY_AUDIT_VIOLATION: UPDATE is prohibited on audit_logs');
      END;

      CREATE TRIGGER IF NOT EXISTS trg_audit_logs_no_delete
      BEFORE DELETE ON audit_logs
      BEGIN
        SELECT RAISE(ABORT, 'APPEND_ONLY_AUDIT_VIOLATION: DELETE is prohibited on audit_logs');
      END;

      -- Idempotency Keys Store (ADR-003)
      CREATE TABLE IF NOT EXISTS idempotency_keys (
        idem_key TEXT PRIMARY KEY,
        response_json TEXT NOT NULL,
        status_code INTEGER NOT NULL,
        expires_at INTEGER NOT NULL
      );

      -- Transactional Outbox for Degraded HIS Synchronization (Architecture v2 - ADR-007)
      CREATE TABLE IF NOT EXISTS outbox_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        booking_id TEXT UNIQUE NOT NULL,
        facility_id TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'PENDING',
        attempts INTEGER NOT NULL DEFAULT 0,
        last_error TEXT,
        next_attempt_at INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        synced_at TEXT
      );

      -- Asynchronous Notification Queue (SMS / Zalo ZNS / Email - ADR-006)
      CREATE TABLE IF NOT EXISTS notification_jobs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        booking_id TEXT NOT NULL,
        channel TEXT NOT NULL,
        recipient TEXT NOT NULL,
        template TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'QUEUED',
        attempts INTEGER NOT NULL DEFAULT 0,
        max_attempts INTEGER NOT NULL DEFAULT 3,
        next_run_at INTEGER NOT NULL,
        last_error TEXT,
        created_at TEXT NOT NULL,
        processed_at TEXT
      );
    `);
  }

  seedInitialData() {
    const countRow = this.sqlite.prepare('SELECT COUNT(*) AS cnt FROM facilities').get();
    if (countRow && countRow.cnt > 0) return;

    const insertFac = this.sqlite.prepare(
      'INSERT INTO facilities (id, name, region, clinic_count, his_type) VALUES (?, ?, ?, ?, ?)'
    );
    // 12 clinics across 3 regions (5 in Da Nang, 4 in Hue, 3 in Quang Nam) + 1 expansion clinic (Hoi An - HIS #4)
    insertFac.run('FAC_DANANG', 'Cụm 5 Phòng khám Đa khoa MediLink Đà Nẵng', 'Đà Nẵng', 5, 'HIS_DANANG_REST');
    insertFac.run('FAC_HUE', 'Cụm 4 Phòng khám Đa khoa MediLink Huế', 'Thừa Thiên Huế', 4, 'HIS_HUE_XML');
    insertFac.run('FAC_QUANGNAM', 'Cụm 3 Phòng khám Đa khoa MediLink Quảng Nam', 'Quảng Nam', 3, 'HIS_QUANGNAM_CUSTOM');
    insertFac.run('FAC_HOIAN', 'Phòng khám Quốc tế Hội An (Mở rộng HIS thứ 4)', 'Quảng Nam', 1, 'HIS_GENERIC4_FHIR');

    const insertUser = this.sqlite.prepare(
      'INSERT INTO users (id, username, role, facility_id, mpi_id, full_name) VALUES (?, ?, ?, ?, ?, ?)'
    );
    insertUser.run('user_pat_01', 'patient1', 'PATIENT', null, 'MPI-2026-0001', 'Nguyễn Văn An');
    insertUser.run('user_pat_02', 'patient2', 'PATIENT', null, 'MPI-2026-0002', 'Trần Thị Bình');
    insertUser.run('user_doc_dn', 'doctor_dn', 'DOCTOR', 'FAC_DANANG', null, 'BS. CKII Lê Viết Dũng');
    insertUser.run('user_doc_hue', 'doctor_hue', 'DOCTOR', 'FAC_HUE', null, 'ThS. BS Trần Minh Tâm');
    insertUser.run('user_rec_dn', 'reception_dn', 'RECEPTIONIST', 'FAC_DANANG', null, 'Lễ tân Đà Nẵng - Mai Lan');
    insertUser.run('user_rec_hue', 'reception_hue', 'RECEPTIONIST', 'FAC_HUE', null, 'Lễ tân Huế - Hương Giang');
    insertUser.run('user_director', 'director', 'DIRECTOR', null, null, 'Ban Giám đốc Chuỗi MediLink');
    insertUser.run('user_admin', 'admin', 'ADMIN', null, null, 'Quản trị Hệ thống An ninh CNTT');

    // Seed heterogeneous local HIS patient codes for the same MPI!
    const insertMpi = this.sqlite.prepare(
      'INSERT INTO patient_his_mappings (mpi_id, facility_id, local_his_patient_id) VALUES (?, ?, ?)'
    );
    insertMpi.run('MPI-2026-0001', 'FAC_DANANG', 'pat_uuid_dn_91a2f0');
    insertMpi.run('MPI-2026-0001', 'FAC_HUE', 'HUE-BN-00921');
    insertMpi.run('MPI-2026-0001', 'FAC_QUANGNAM', '88412');
    insertMpi.run('MPI-2026-0002', 'FAC_HUE', 'HUE-BN-01588');
    insertMpi.run('MPI-2026-0002', 'FAC_DANANG', 'pat_uuid_dn_44b9c1');

    // Seed explicit patient consents (Patient 1 consented for Da Nang & Hue; Patient 2 ONLY consented for Hue!)
    const nowIso = new Date().toISOString();
    const insertConsent = this.sqlite.prepare(
      'INSERT INTO patient_consents (patient_id, granted_facility_id, scope, is_active, updated_at) VALUES (?, ?, ?, ?, ?)'
    );
    insertConsent.run('user_pat_01', 'FAC_DANANG', 'READ_EHR', 1, nowIso);
    insertConsent.run('user_pat_01', 'FAC_HUE', 'READ_EHR', 1, nowIso);
    insertConsent.run('user_pat_02', 'FAC_HUE', 'READ_EHR', 1, nowIso);

    const insertDoc = this.sqlite.prepare(
      'INSERT INTO doctors (id, name, specialty, facility_id) VALUES (?, ?, ?, ?)'
    );
    insertDoc.run('DOC_101', 'BS. CKII Lê Viết Dũng', 'Tim mạch', 'FAC_DANANG');
    insertDoc.run('DOC_202', 'ThS. BS Trần Minh Tâm', 'Nội tiết', 'FAC_HUE');
    insertDoc.run('DOC_303', 'BS. CKI Hoàng Thu Hà', 'Nhi khoa', 'FAC_QUANGNAM');
    insertDoc.run('DOC_404', 'BS. Nguyễn Bảo Long', 'Chẩn đoán hình ảnh', 'FAC_HOIAN');

    const insertSlot = this.sqlite.prepare(
      'INSERT INTO slots (id, doctor_id, slot_time, facility_id, status, version) VALUES (?, ?, ?, ?, ?, 1)'
    );
    insertSlot.run('SLOT_DN_0800', 'DOC_101', '2026-11-20 08:00', 'FAC_DANANG', 'AVAILABLE');
    insertSlot.run('SLOT_DN_0830', 'DOC_101', '2026-11-20 08:30', 'FAC_DANANG', 'AVAILABLE');
    insertSlot.run('SLOT_DN_0900', 'DOC_101', '2026-11-20 09:00', 'FAC_DANANG', 'AVAILABLE');
    insertSlot.run('SLOT_HUE_0900', 'DOC_202', '2026-11-20 09:00', 'FAC_HUE', 'AVAILABLE');
    insertSlot.run('SLOT_HUE_0930', 'DOC_202', '2026-11-20 09:30', 'FAC_HUE', 'AVAILABLE');
    insertSlot.run('SLOT_QN_1000', 'DOC_303', '2026-11-20 10:00', 'FAC_QUANGNAM', 'AVAILABLE');
    insertSlot.run('SLOT_QN_1030', 'DOC_303', '2026-11-20 10:30', 'FAC_QUANGNAM', 'AVAILABLE');
    insertSlot.run('SLOT_HA_1400', 'DOC_404', '2026-11-20 14:00', 'FAC_HOIAN', 'AVAILABLE');

    // Seed Encrypted Lab Files in Object Storage & AES-256-GCM Encrypted Medical Records in SQLite!
    labStorageService.putEncryptedObject(
      'lab-hue-5544.pdf',
      Buffer.from('%PDF-1.4\n[MEDILINK ENCRYPTED LAB REPORT] Benh nhan: Tran Thi Binh | HbA1c: 7.8% | Glucose: 8.2 mmol/L\n%%EOF', 'utf8'),
      'application/pdf'
    );
    labStorageService.putEncryptedObject(
      'lab-dn-1122.pdf',
      Buffer.from('%PDF-1.4\n[MEDILINK ENCRYPTED LAB REPORT] Benh nhan: Nguyen Van An | ECG Sinus Rhythm Normal | BP 145/95\n%%EOF', 'utf8'),
      'application/pdf'
    );

    const insertRecord = this.sqlite.prepare(`
      INSERT INTO medical_records (
        id, patient_id, patient_mpi, patient_name, facility_id, doctor_id,
        diagnosis_enc, clinical_notes_enc, prescription_enc, lab_summary_enc,
        lab_file_key, sensitivity_level, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'LEVEL_3_SENSITIVE_HEALTH', ?)
    `);

    insertRecord.run(
      'REC-HUE-5544',
      'user_pat_02',
      'MPI-2026-0002',
      'Trần Thị Bình',
      'FAC_HUE',
      'DOC_202',
      encryptionService.encryptField('Đái tháo đường không phụ thuộc insulin (ICD-10: E11)', 'REC-HUE-5544'),
      encryptionService.encryptField('Bệnh nhân có tiền sử gia đình, theo dõi đường huyết định kỳ tại Huế.', 'REC-HUE-5544'),
      encryptionService.encryptField('Metformin 500mg x 2 viên/ngày sau ăn', 'REC-HUE-5544'),
      encryptionService.encryptField('HbA1c: 7.8% (Cao), Đường huyết lúc đói: 8.2 mmol/L', 'REC-HUE-5544'),
      'lab-hue-5544.pdf',
      '2026-11-01T08:30:00Z'
    );

    insertRecord.run(
      'REC-DN-1122',
      'user_pat_01',
      'MPI-2026-0001',
      'Nguyễn Văn An',
      'FAC_DANANG',
      'DOC_101',
      encryptionService.encryptField('Tăng huyết áp vô căn nguyên phát (ICD-10: I10)', 'REC-DN-1122'),
      encryptionService.encryptField('Huyết áp đo tại phòng khám 145/95 mmHg, hạn chế muối.', 'REC-DN-1122'),
      encryptionService.encryptField('Amlodipine 5mg x 1 viên buổi sáng', 'REC-DN-1122'),
      encryptionService.encryptField('Điện tâm đồ nhịp xoang đều, siêu âm tim EF 64%', 'REC-DN-1122'),
      'lab-dn-1122.pdf',
      '2026-11-02T09:15:00Z'
    );
  }

  // ==================== QUERY & TRANSACTION METHODS ====================

  getFacilities() {
    return this.sqlite.prepare('SELECT * FROM facilities ORDER BY id').all();
  }

  getDoctors(facilityId = null) {
    if (facilityId) {
      return this.sqlite.prepare('SELECT * FROM doctors WHERE facility_id = ? ORDER BY id').all(facilityId);
    }
    return this.sqlite.prepare('SELECT * FROM doctors ORDER BY id').all();
  }

  getSlots({ doctorId = null, facilityId = null, status = null } = {}) {
    let sql = 'SELECT * FROM slots WHERE 1=1';
    const params = [];
    if (doctorId) {
      sql += ' AND doctor_id = ?';
      params.push(doctorId);
    }
    if (facilityId) {
      sql += ' AND facility_id = ?';
      params.push(facilityId);
    }
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }
    sql += ' ORDER BY slot_time ASC';
    return this.sqlite.prepare(sql).all(...params);
  }

  upsertSlot({ id, doctorId, slotTime, facilityId, status = 'AVAILABLE' }) {
    this.sqlite
      .prepare(
        `INSERT INTO slots (id, doctor_id, slot_time, facility_id, status, version)
         VALUES (?, ?, ?, ?, ?, 1)
         ON CONFLICT(doctor_id, slot_time) DO UPDATE SET status = excluded.status, version = version + 1`
      )
      .run(id || `SLOT_${doctorId}_${Date.now()}`, doctorId, slotTime, facilityId, status);
  }

  findSlot(doctorId, slotTime) {
    return this.sqlite
      .prepare('SELECT * FROM slots WHERE doctor_id = ? AND slot_time = ?')
      .get(doctorId, slotTime);
  }

  /**
   * Atomic RDBMS transaction enforcing UNIQUE(active_slot_key) + conditional slot update
   * Acts as the Last-Mile Defense even if a Distributed Lock expires early!
   */
  insertBookingAtomic(bookingData) {
    const activeSlotKey = `${bookingData.doctor_id}|${bookingData.slot_time}`;
    const bookingId =
      bookingData.id || `BK-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const createdAt = new Date().toISOString();

    this.sqlite.exec('BEGIN IMMEDIATE TRANSACTION');
    try {
      const slot = this.sqlite
        .prepare('SELECT * FROM slots WHERE doctor_id = ? AND slot_time = ?')
        .get(bookingData.doctor_id, bookingData.slot_time);

      if (!slot || slot.status !== 'AVAILABLE') {
        const err = new Error('SLOT_ALREADY_BOOKED');
        err.code = 'SLOT_ALREADY_BOOKED';
        err.statusCode = 409;
        throw err;
      }

      // Insert into bookings (strictly guarded by UNIQUE(active_slot_key))
      this.sqlite
        .prepare(
          `INSERT INTO bookings (
            id, doctor_id, slot_time, active_slot_key, patient_id, patient_mpi,
            patient_name, facility_id, status, deposit_status, his_sync_status,
            his_reference_code, fencing_token, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          bookingId,
          bookingData.doctor_id,
          bookingData.slot_time,
          activeSlotKey,
          bookingData.patient_id,
          bookingData.patient_mpi || 'MPI-GUEST',
          bookingData.patient_name || 'Bệnh nhân',
          bookingData.facility_id,
          bookingData.status || 'CONFIRMED',
          bookingData.deposit_status || 'PAID',
          bookingData.his_sync_status || 'PENDING',
          bookingData.his_reference_code || null,
          bookingData.fencing_token || 0,
          createdAt
        );

      const upd = this.sqlite
        .prepare(
          `UPDATE slots SET status = 'BOOKED', version = version + 1
           WHERE doctor_id = ? AND slot_time = ? AND status = 'AVAILABLE'`
        )
        .run(bookingData.doctor_id, bookingData.slot_time);

      if (upd.changes !== 1) {
        const err = new Error('CONCURRENT_SLOT_MUTATION');
        err.code = 'SQLITE_CONSTRAINT_UNIQUE';
        err.statusCode = 409;
        throw err;
      }

      this.sqlite.exec('COMMIT');
      return this.getBookingById(bookingId);
    } catch (err) {
      try {
        this.sqlite.exec('ROLLBACK');
      } catch {}
      if (String(err.message).includes('UNIQUE constraint failed')) {
        err.code = 'SQLITE_CONSTRAINT_UNIQUE';
        err.statusCode = 409;
      }
      throw err;
    }
  }

  updateBookingHisSync(bookingId, syncStatus, referenceCode = null) {
    this.sqlite
      .prepare(
        'UPDATE bookings SET his_sync_status = ?, his_reference_code = COALESCE(?, his_reference_code) WHERE id = ?'
      )
      .run(syncStatus, referenceCode, bookingId);
    return this.getBookingById(bookingId);
  }

  cancelBookingAtomic(bookingId) {
    this.sqlite.exec('BEGIN IMMEDIATE TRANSACTION');
    try {
      const booking = this.getBookingById(bookingId);
      if (!booking) {
        const err = new Error('Không tìm thấy lịch hẹn.');
        err.statusCode = 404;
        throw err;
      }
      this.sqlite
        .prepare(
          `UPDATE bookings SET status = 'CANCELLED', active_slot_key = NULL, deposit_status = 'REFUNDED' WHERE id = ?`
        )
        .run(bookingId);
      this.sqlite
        .prepare(`UPDATE slots SET status = 'AVAILABLE', version = version + 1 WHERE doctor_id = ? AND slot_time = ?`)
        .run(booking.doctor_id, booking.slot_time);
      this.sqlite.exec('COMMIT');
      return this.getBookingById(bookingId);
    } catch (err) {
      try {
        this.sqlite.exec('ROLLBACK');
      } catch {}
      throw err;
    }
  }

  getBookingById(id) {
    return this.sqlite.prepare('SELECT * FROM bookings WHERE id = ?').get(id);
  }

  getAllBookings(facilityId = null) {
    if (facilityId) {
      return this.sqlite.prepare('SELECT * FROM bookings WHERE facility_id = ? ORDER BY created_at DESC').all(facilityId);
    }
    return this.sqlite.prepare('SELECT * FROM bookings ORDER BY created_at DESC').all();
  }

  getLocalHisPatientId(mpiId, facilityId) {
    const row = this.sqlite
      .prepare('SELECT local_his_patient_id FROM patient_his_mappings WHERE mpi_id = ? AND facility_id = ?')
      .get(mpiId, facilityId);
    return row ? row.local_his_patient_id : null;
  }

  getRawMedicalRecordById(id) {
    return this.sqlite.prepare('SELECT * FROM medical_records WHERE id = ?').get(id);
  }

  hasPatientConsent(patientId, facilityId, scope = 'READ_EHR') {
    const row = this.sqlite
      .prepare(
        'SELECT is_active FROM patient_consents WHERE patient_id = ? AND granted_facility_id = ? AND scope = ?'
      )
      .get(patientId, facilityId, scope);
    return Boolean(row && row.is_active === 1);
  }

  setPatientConsent(patientId, facilityId, isActive = true, scope = 'READ_EHR') {
    this.sqlite
      .prepare(
        `INSERT INTO patient_consents (patient_id, granted_facility_id, scope, is_active, updated_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(patient_id, granted_facility_id, scope)
         DO UPDATE SET is_active = excluded.is_active, updated_at = excluded.updated_at`
      )
      .run(patientId, facilityId, scope, isActive ? 1 : 0, new Date().toISOString());
  }

  getUserById(id) {
    return this.sqlite.prepare('SELECT * FROM users WHERE id = ?').get(id);
  }

  getUserByUsername(username) {
    return this.sqlite.prepare('SELECT * FROM users WHERE username = ?').get(username);
  }

  // ==================== OUTBOX & NOTIFICATION QUEUE ====================

  enqueueOutboxEvent(bookingId, facilityId, payloadObj) {
    const now = Date.now();
    this.sqlite
      .prepare(
        `INSERT INTO outbox_events (booking_id, facility_id, payload_json, status, attempts, next_attempt_at, created_at)
         VALUES (?, ?, ?, 'PENDING', 0, ?, ?)
         ON CONFLICT(booking_id) DO UPDATE SET status = 'PENDING', next_attempt_at = excluded.next_attempt_at`
      )
      .run(bookingId, facilityId, JSON.stringify(payloadObj), now, new Date(now).toISOString());
  }

  getPendingOutboxEvents(limit = 10) {
    return this.sqlite
      .prepare(
        `SELECT * FROM outbox_events WHERE status = 'PENDING' AND next_attempt_at <= ? ORDER BY id ASC LIMIT ?`
      )
      .all(Date.now(), limit);
  }

  markOutboxSynced(id) {
    this.sqlite
      .prepare(`UPDATE outbox_events SET status = 'SYNCED', synced_at = ? WHERE id = ?`)
      .run(new Date().toISOString(), id);
  }

  markOutboxRetry(id, attempts, nextAttemptAt, lastError) {
    this.sqlite
      .prepare(`UPDATE outbox_events SET attempts = ?, next_attempt_at = ?, last_error = ? WHERE id = ?`)
      .run(attempts, nextAttemptAt, String(lastError || ''), id);
  }

  enqueueNotificationJob({ bookingId, channel, recipient, template, payload }) {
    const now = Date.now();
    const res = this.sqlite
      .prepare(
        `INSERT INTO notification_jobs (
          booking_id, channel, recipient, template, payload_json, status, attempts, max_attempts, next_run_at, created_at
        ) VALUES (?, ?, ?, ?, ?, 'QUEUED', 0, 3, ?, ?)`
      )
      .run(bookingId, channel, recipient, template, JSON.stringify(payload), now, new Date(now).toISOString());
    return Number(res.lastInsertRowid);
  }

  getDueNotificationJobs(limit = 10) {
    return this.sqlite
      .prepare(
        `SELECT * FROM notification_jobs WHERE status IN ('QUEUED', 'RETRY_SCHEDULED') AND next_run_at <= ? ORDER BY id ASC LIMIT ?`
      )
      .all(Date.now(), limit);
  }

  markNotificationSent(id) {
    this.sqlite
      .prepare(`UPDATE notification_jobs SET status = 'SENT', processed_at = ? WHERE id = ?`)
      .run(new Date().toISOString(), id);
  }

  markNotificationFailed(id, attempts, maxAttempts, backoffMs, errorMsg) {
    const nextStatus = attempts >= maxAttempts ? 'DEAD_LETTER' : 'RETRY_SCHEDULED';
    this.sqlite
      .prepare(
        `UPDATE notification_jobs SET status = ?, attempts = ?, next_run_at = ?, last_error = ? WHERE id = ?`
      )
      .run(nextStatus, attempts, Date.now() + backoffMs, String(errorMsg || ''), id);
    return nextStatus;
  }

  getDashboardStats() {
    const totalBookings = this.sqlite.prepare(`SELECT COUNT(*) AS cnt FROM bookings WHERE status = 'CONFIRMED'`).get().cnt;
    const byFacility = this.sqlite
      .prepare(
        `SELECT f.id, f.name, f.region, f.clinic_count,
                COUNT(b.id) AS active_bookings,
                SUM(CASE WHEN b.his_sync_status = 'SYNCED' THEN 1 ELSE 0 END) AS synced_count,
                SUM(CASE WHEN b.his_sync_status = 'OUTBOX_QUEUED' THEN 1 ELSE 0 END) AS queued_outbox_count
         FROM facilities f
         LEFT JOIN bookings b ON b.facility_id = f.id AND b.status = 'CONFIRMED'
         GROUP BY f.id`
      )
      .all();
    const auditCount = this.sqlite.prepare('SELECT COUNT(*) AS cnt FROM audit_logs').get().cnt;
    const pendingNotif = this.sqlite
      .prepare(`SELECT COUNT(*) AS cnt FROM notification_jobs WHERE status IN ('QUEUED', 'RETRY_SCHEDULED')`)
      .get().cnt;
    return { totalBookings, byFacility, auditCount, pendingNotifications: pendingNotif };
  }

  resetSlot(doctorId, slotTime, facilityId = 'FAC_DANANG') {
    this.sqlite
      .prepare('DELETE FROM outbox_events WHERE booking_id IN (SELECT id FROM bookings WHERE doctor_id = ? AND slot_time = ?)')
      .run(doctorId, slotTime);
    this.sqlite
      .prepare('DELETE FROM bookings WHERE doctor_id = ? AND slot_time = ?')
      .run(doctorId, slotTime);
    this.upsertSlot({
      id: `SLOT_${doctorId}_${slotTime.replace(/[^0-9]/g, '')}`,
      doctorId,
      slotTime,
      facilityId,
      status: 'AVAILABLE'
    });
  }

  /**
   * Simulate privileged root DBA temporarily dropping trigger to tamper raw disk/table row
   * Used strictly in Test 4 (ASR-05) to prove HMAC-SHA256 Hash Chain catches root DBA tampering!
   */
  simulateRootDbaTamper(auditId, forgedDetails) {
    this.sqlite.exec('DROP TRIGGER IF EXISTS trg_audit_logs_no_update');
    try {
      this.sqlite
        .prepare('UPDATE audit_logs SET details = ? WHERE id = ?')
        .run(forgedDetails, auditId);
    } finally {
      this.sqlite.exec(`
        CREATE TRIGGER IF NOT EXISTS trg_audit_logs_no_update
        BEFORE UPDATE ON audit_logs
        BEGIN
          SELECT RAISE(ABORT, 'APPEND_ONLY_AUDIT_VIOLATION: UPDATE is prohibited on audit_logs');
        END;
      `);
    }
  }
}

module.exports = new MediLinkDatabase();
