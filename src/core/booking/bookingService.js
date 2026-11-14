/**
 * Booking Core Service
 * Coordinates Distributed Lock, DB Unique Constraint, and Anti-Corruption Layer
 */

const db = require('../db/database');
const lockManager = require('./lockManager');
const idempotencyManager = require('./idempotencyManager');
const hisDispatcher = require('../acl/hisDispatcher');
const auditService = require('../audit/auditService');

class BookingService {
  /**
   * Process booking request
   */
  async createBooking({ doctorId, slotTime, patientId, patientName, facilityId, idempotencyKey, clientIp }) {
    // Step 1: Check Idempotency Key
    if (idempotencyKey) {
      const cached = idempotencyManager.get(idempotencyKey);
      if (cached) {
        return {
          statusCode: 200,
          isIdempotentReplay: true,
          data: cached.result
        };
      }
    }

    const lockKey = `lock:slot:${doctorId}:${slotTime}`;
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    // Step 2: Acquire Distributed Lock (Redis Redlock simulation)
    const lockAcquired = lockManager.acquireLock(lockKey, requestId, 3000);

    if (!lockAcquired) {
      // Fast-Fail: Slot is currently locked by another concurrent transaction
      return {
        statusCode: 409,
        success: false,
        error: 'SLOT_LOCKED_CONCURRENT_CONFLICT',
        message: 'Khung giờ khám này hiện đang có người khác thao tác giữ chỗ. Vui lòng chọn khung giờ khác.'
      };
    }

    try {
      // Step 3: Verify Slot availability in DB
      const slot = db.findSlot(doctorId, slotTime);
      if (!slot || slot.status !== 'AVAILABLE') {
        return {
          statusCode: 409,
          success: false,
          error: 'SLOT_ALREADY_BOOKED',
          message: 'Khung giờ này đã được đặt trước đó hoặc không tồn tại.'
        };
      }

      // Step 4: Atomic DB Insert (UNIQUE constraint check)
      const targetFacilityId = facilityId || slot.facility_id;
      const booking = db.insertBooking({
        doctor_id: doctorId,
        slot_time: slotTime,
        patient_id: patientId || 'ANONYMOUS',
        patient_name: patientName || 'Bệnh nhân',
        facility_id: targetFacilityId,
        status: 'CONFIRMED'
      });

      // Step 5: Dispatch to Anti-Corruption Layer (ACL) for HIS Synchronization
      let hisSyncResult = null;
      try {
        hisSyncResult = await hisDispatcher.syncAppointment(targetFacilityId, {
          bookingId: booking.id,
          doctorId: booking.doctor_id,
          patientId: booking.patient_id,
          patientName: booking.patient_name,
          slotTime: booking.slot_time,
          facilityId: targetFacilityId
        });

        booking.his_sync_status = hisSyncResult.success ? 'SYNCED' : 'DEGRADED_PENDING';
        booking.his_reference_code = hisSyncResult.hisReferenceCode || null;
      } catch (hisErr) {
        // Circuit breaker or network error in HIS adapter -> Graceful degradation
        booking.his_sync_status = 'OUTBOX_QUEUED';
        booking.his_error_message = hisErr.message;
      }

      // Step 6: Log audit
      auditService.logSecurityEvent({
        actorId: patientId || 'PATIENT',
        actorRole: 'PATIENT',
        facilityId: targetFacilityId,
        action: 'BOOKING_CREATED',
        targetResource: booking.id,
        ipAddress: clientIp || '127.0.0.1',
        status: 'SUCCESS',
        details: `Lịch khám [${booking.id}] đã xác nhận thành công tại cơ sở [${targetFacilityId}]`
      });

      const responsePayload = {
        success: true,
        message: 'Đặt lịch khám thành công.',
        booking: {
          id: booking.id,
          doctor_id: booking.doctor_id,
          patient_id: booking.patient_id,
          slot_time: booking.slot_time,
          facility_id: booking.facility_id,
          status: booking.status,
          his_sync_status: booking.his_sync_status,
          his_reference_code: booking.his_reference_code
        }
      };

      // Cache for idempotency
      if (idempotencyKey) {
        idempotencyManager.set(idempotencyKey, responsePayload);
      }

      return {
        statusCode: 201,
        success: true,
        data: responsePayload
      };
    } finally {
      // Step 7: Always release the Distributed Lock
      lockManager.releaseLock(lockKey, requestId);
    }
  }

  /**
   * Get all bookings
   */
  getAllBookings() {
    return db.bookings;
  }
}

module.exports = new BookingService();
