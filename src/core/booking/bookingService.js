/**
 * Booking Core Domain Service (Implements ASR-01, ASR-02, QAS-07, QAS-08)
 * Defense-in-depth concurrency & fault-tolerant synchronization pipeline:
 *  Layer 1: Idempotency Key Deduplication (`X-Idempotency-Key`)
 *  Layer 2: Distributed Lock (`SET lock:slot:{doc}:{time} NX PX 3000` + Fencing Token)
 *  Layer 3: RDBMS Immediate Transaction + `UNIQUE(active_slot_key)` Constraint
 *  Layer 4: Anti-Corruption Layer HIS Dispatch (Sync when healthy, Outbox Queue when Circuit OPEN/timeout)
 *  Layer 5: Asynchronous Notification Queue (`notification_jobs` for SMS/Zalo/Email)
 */

const crypto = require('crypto');
const db = require('../db/database');
const lockManager = require('./lockManager');
const idempotencyManager = require('./idempotencyManager');
const slotCache = require('./slotCache');
const hisDispatcher = require('../acl/hisDispatcher');
const auditService = require('../audit/auditService');

class BookingService {
  async createBooking({
    doctorId,
    slotTime,
    patientId = 'user_pat_01',
    patientMpi = 'MPI-2026-0001',
    patientName = 'Bệnh nhân MediLink',
    patientPhone = '0905123456',
    facilityId = null,
    idempotencyKey = null,
    clientIp = '127.0.0.1'
  }) {
    // 1. Idempotency check (prevents duplicate booking on client retry)
    if (idempotencyKey) {
      const existing = idempotencyManager.get(idempotencyKey);
      if (existing) {
        return {
          statusCode: 200,
          data: {
            ...existing.payload,
            idempotent_replay: true
          }
        };
      }
    }

    const lockKey = `lock:slot:${doctorId}:${slotTime}`;
    const ownerId = `req_${crypto.randomUUID().slice(0, 8)}`;

    // 2. Acquire Distributed Lock with Fencing Token (Fast-fail 409 if contended)
    const lock = await lockManager.acquireLock(lockKey, ownerId);
    if (!lock.acquired) {
      return {
        statusCode: 409,
        data: {
          success: false,
          error: 'SLOT_LOCKED_CONCURRENT_CONFLICT',
          message: 'Khung giờ khám này đang có bệnh nhân khác thao tác giữ chỗ. Vui lòng chọn khung giờ trống kế tiếp.'
        }
      };
    }

    let booking = null;
    let targetFacilityId = facilityId;

    try {
      // 3. Verify slot & commit atomic RDBMS insert (UNIQUE constraint last-mile guarantee)
      const slot = db.findSlot(doctorId, slotTime);
      if (!slot || slot.status !== 'AVAILABLE') {
        return {
          statusCode: 409,
          data: {
            success: false,
            error: 'SLOT_ALREADY_BOOKED',
            message: 'Khung giờ khám này vừa hết chỗ. Hệ thống gợi ý các khung giờ trống khác của bác sĩ.'
          }
        };
      }

      targetFacilityId = facilityId || slot.facility_id;
      const userObj = db.getUserById(patientId);
      const resolvedMpi = userObj?.mpi_id || patientMpi;

      try {
        booking = db.insertBookingAtomic({
          doctor_id: doctorId,
          slot_time: slotTime,
          patient_id: patientId,
          patient_mpi: resolvedMpi,
          patient_name: userObj?.full_name || patientName,
          facility_id: targetFacilityId,
          status: 'CONFIRMED',
          deposit_status: 'PAID',
          his_sync_status: 'PENDING',
          fencing_token: lock.fencingToken
        });
        slotCache.invalidateAll();
      } catch (dbErr) {
        if (dbErr.statusCode === 409) {
          return {
            statusCode: 409,
            data: {
              success: false,
              error: dbErr.code || 'SLOT_ALREADY_BOOKED',
              message: 'Khung giờ khám đã được đặt bởi một giao dịch hợp lệ trước đó.'
            }
          };
        }
        throw dbErr;
      }
    } finally {
      // Release distributed lock immediately after atomic DB slot reservation completes!
      // External HIS network latency will NEVER hold the Redis lock or block other requests.
      await lockManager.releaseLock(lockKey, lock.lockValue);
    }

    // 4. Synchronize with Facility HIS via Anti-Corruption Layer (Bounded Timeout + Circuit Breaker)
    const localHisPatId =
      db.getLocalHisPatientId(booking.patient_mpi, targetFacilityId) ||
      `LOCAL-${targetFacilityId}-${booking.patient_id}`;

    const syncPayload = {
      bookingId: booking.id,
      doctorId: booking.doctor_id,
      patientId: booking.patient_id,
      patientMpi: booking.patient_mpi,
      localHisPatientId: localHisPatId,
      patientName: booking.patient_name,
      slotTime: booking.slot_time,
      facilityId: targetFacilityId,
      idempotencyKey: idempotencyKey || booking.id
    };

    try {
      const hisResult = await hisDispatcher.syncAppointment(targetFacilityId, syncPayload);
      if (hisResult && hisResult.success) {
        booking = db.updateBookingHisSync(booking.id, 'SYNCED', hisResult.hisReferenceCode);
      } else {
        db.enqueueOutboxEvent(booking.id, targetFacilityId, syncPayload);
        booking = db.updateBookingHisSync(booking.id, 'OUTBOX_QUEUED', null);
      }
    } catch (hisErr) {
      // Graceful Degradation (ASR-02 & ADR-007): Persist in Transactional Outbox for rate-controlled replay
      db.enqueueOutboxEvent(booking.id, targetFacilityId, syncPayload);
      booking = db.updateBookingHisSync(booking.id, 'OUTBOX_QUEUED', null);
      booking.degraded_notice = `HIS cơ sở [${targetFacilityId}] tạm ngưng kết nối (${hisErr.message}). Lịch khám đã được giữ chỗ an toàn và đưa vào hàng đợi đồng bộ tự động (Outbox).`;
    }

    // 5. Enqueue Asynchronous Notification Job (SMS/Zalo confirmation & 24h/2h reminder - ADR-006)
    const notifJobId = db.enqueueNotificationJob({
      bookingId: booking.id,
      channel: 'ZALO_ZNS_SMS',
      recipient: patientPhone,
      template: 'BOOKING_CONFIRMED_QR',
      payload: {
        bookingId: booking.id,
        doctorId: booking.doctor_id,
        slotTime: booking.slot_time,
        facilityId: targetFacilityId
      }
    });

    // 6. Append Tamper-Evident Audit Log
    auditService.logSecurityEvent({
      actorId: booking.patient_id,
      actorRole: 'PATIENT',
      facilityId: targetFacilityId,
      action: 'BOOKING_CREATED',
      targetResource: booking.id,
      ipAddress: clientIp,
      status: 'SUCCESS',
      details: `Đặt lịch [${booking.id}] bác sĩ [${booking.doctor_id}] lúc [${booking.slot_time}], HIS=[${booking.his_sync_status}], Fencing=[${booking.fencing_token}]`
    });

    const responsePayload = {
      success: true,
      message:
        booking.his_sync_status === 'SYNCED'
          ? 'Đặt lịch khám và đồng bộ HIS cơ sở thành công.'
          : 'Đặt lịch khám thành công (Chế độ chịu lỗi: Đã lưu hàng đợi đồng bộ HIS tự động).',
      booking: {
        id: booking.id,
        doctor_id: booking.doctor_id,
        patient_id: booking.patient_id,
        patient_mpi: booking.patient_mpi,
        slot_time: booking.slot_time,
        facility_id: booking.facility_id,
        status: booking.status,
        deposit_status: booking.deposit_status,
        his_sync_status: booking.his_sync_status,
        his_reference_code: booking.his_reference_code,
        fencing_token: booking.fencing_token,
        notification_job_id: notifJobId,
        degraded_notice: booking.degraded_notice || null
      }
    };

    if (idempotencyKey) {
      idempotencyManager.set(idempotencyKey, 201, responsePayload);
    }

    return {
      statusCode: 201,
      data: responsePayload
    };
  }

  async cancelBooking(bookingId, actorUser, clientIp = '127.0.0.1') {
    const cancelled = db.cancelBookingAtomic(bookingId);
    slotCache.invalidateAll();
    auditService.logSecurityEvent({
      actorId: actorUser?.id || 'PATIENT',
      actorRole: actorUser?.role || 'PATIENT',
      facilityId: cancelled.facility_id,
      action: 'BOOKING_CANCELLED',
      targetResource: bookingId,
      ipAddress: clientIp,
      status: 'SUCCESS',
      details: `Hủy lịch hẹn [${bookingId}] và giải phóng slot [${cancelled.doctor_id} @ ${cancelled.slot_time}].`
    });
    return cancelled;
  }

  getAllBookings(facilityId = null) {
    return db.getAllBookings(facilityId);
  }
}

module.exports = new BookingService();
