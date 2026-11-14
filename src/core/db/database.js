/**
 * MediLink In-Memory Relational Database Engine
 * Features:
 * - Strict UNIQUE constraints (doctor_id + slot_time)
 * - Atomic transactions
 * - Pre-seeded demo data (facilities, users, doctors, slots, records)
 */

class Database {
  constructor() {
    this.facilities = [
      { id: 'FAC_DANANG', name: 'Phòng khám Đa khoa MediLink Đà Nẵng', his_type: 'HIS_DANANG_REST' },
      { id: 'FAC_HUE', name: 'Phòng khám Đa khoa MediLink Huế', his_type: 'HIS_HUE_XML' },
      { id: 'FAC_QUANGNAM', name: 'Phòng khám Đa khoa MediLink Tam Kỳ', his_type: 'HIS_QUANGNAM_CUSTOM' },
      { id: 'FAC_HOIAN', name: 'Phòng khám Quốc tế Hội An (HIS 4)', his_type: 'HIS_GENERIC4_FHIR' }
    ];

    this.users = [
      { id: 'user_pat_01', username: 'patient1', role: 'PATIENT', facility_id: null, full_name: 'Nguyễn Văn An' },
      { id: 'user_pat_02', username: 'patient2', role: 'PATIENT', facility_id: null, full_name: 'Trần Thị Bình' },
      { id: 'user_doc_dn', username: 'doctor_dn', role: 'DOCTOR', facility_id: 'FAC_DANANG', full_name: 'BS. Lê Viết Dũng' },
      { id: 'user_rec_dn', username: 'reception_dn', role: 'RECEPTIONIST', facility_id: 'FAC_DANANG', full_name: 'Lễ tân Đà Nẵng - Mai Lan' },
      { id: 'user_rec_hue', username: 'reception_hue', role: 'RECEPTIONIST', facility_id: 'FAC_HUE', full_name: 'Lễ tân Huế - Hương Giang' },
      { id: 'user_admin', username: 'admin', role: 'ADMIN', facility_id: null, full_name: 'Quản trị viên MediLink' }
    ];

    this.doctors = [
      { id: 'DOC_101', name: 'BS. CKII Lê Viết Dũng', specialty: 'Tim mạch', facility_id: 'FAC_DANANG' },
      { id: 'DOC_202', name: 'ThS. BS Trần Minh Tâm', specialty: 'Nội tiết', facility_id: 'FAC_HUE' },
      { id: 'DOC_303', name: 'BS. CKI Hoàng Thu Hà', specialty: 'Nhi khoa', facility_id: 'FAC_QUANGNAM' },
      { id: 'DOC_404', name: 'BS. Nguyễn Bảo Long', specialty: 'Răng hàm mặt', facility_id: 'FAC_HOIAN' }
    ];

    // Pre-seed standard slots for testing
    this.slots = [
      { id: 'SLOT_DN_0800', doctor_id: 'DOC_101', slot_time: '2026-11-20 08:00', facility_id: 'FAC_DANANG', status: 'AVAILABLE' },
      { id: 'SLOT_DN_0830', doctor_id: 'DOC_101', slot_time: '2026-11-20 08:30', facility_id: 'FAC_DANANG', status: 'AVAILABLE' },
      { id: 'SLOT_HUE_0900', doctor_id: 'DOC_202', slot_time: '2026-11-20 09:00', facility_id: 'FAC_HUE', status: 'AVAILABLE' },
      { id: 'SLOT_QN_1000', doctor_id: 'DOC_303', slot_time: '2026-11-20 10:00', facility_id: 'FAC_QUANGNAM', status: 'AVAILABLE' },
      { id: 'SLOT_HA_1400', doctor_id: 'DOC_404', slot_time: '2026-11-20 14:00', facility_id: 'FAC_HOIAN', status: 'AVAILABLE' }
    ];

    // Bookings table with UNIQUE(doctor_id, slot_time)
    this.bookings = [];

    // Medical Records table (EHR) with facility scoping
    this.medicalRecords = [
      {
        id: 'REC-HUE-5544',
        patient_id: 'user_pat_02',
        patient_name: 'Trần Thị Bình',
        facility_id: 'FAC_HUE',
        doctor_id: 'DOC_202',
        diagnosis: 'Đái tháo đường Tuýp 2 (ICD-10: E11)',
        notes: 'Bệnh nhân có tiền sử gia đình, cần kiểm soát đường huyết định kỳ',
        test_results: 'HbA1c: 7.8% (Cao), Đường huyết lúc đói: 8.2 mmol/L',
        is_sensitive: true,
        created_at: '2026-11-01T08:30:00Z'
      },
      {
        id: 'REC-DN-1122',
        patient_id: 'user_pat_01',
        patient_name: 'Nguyễn Văn An',
        facility_id: 'FAC_DANANG',
        doctor_id: 'DOC_101',
        diagnosis: 'Tăng huyết áp vô căn (ICD-10: I10)',
        notes: 'Huyết áp 145/95 mmHg, chỉ định dùng Amlodipine 5mg',
        test_results: 'Điện tim bình thường, Siêu âm tim cơ bản ổn định',
        is_sensitive: true,
        created_at: '2026-11-02T09:15:00Z'
      }
    ];

    // Append-only Audit Logs
    this.auditLogs = [];
  }

  // Find slot
  findSlot(doctorId, slotTime) {
    return this.slots.find(s => s.doctor_id === doctorId && s.slot_time === slotTime);
  }

  // Atomic insert booking with UNIQUE check
  insertBooking(bookingData) {
    // Check Unique constraint: UNIQUE(doctor_id, slot_time)
    const exists = this.bookings.find(
      b => b.doctor_id === bookingData.doctor_id && 
           b.slot_time === bookingData.slot_time && 
           b.status !== 'CANCELLED'
    );

    if (exists) {
      const err = new Error(`UNIQUE constraint violation: Doctor ${bookingData.doctor_id} already has a confirmed booking at ${bookingData.slot_time}`);
      err.code = 'SQLITE_CONSTRAINT_UNIQUE';
      err.statusCode = 409;
      throw err;
    }

    const booking = {
      id: bookingData.id || `BK-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      doctor_id: bookingData.doctor_id,
      patient_id: bookingData.patient_id,
      patient_name: bookingData.patient_name || 'Bệnh nhân',
      facility_id: bookingData.facility_id,
      slot_time: bookingData.slot_time,
      status: bookingData.status || 'CONFIRMED',
      his_sync_status: bookingData.his_sync_status || 'PENDING',
      his_reference_code: bookingData.his_reference_code || null,
      created_at: new Date().toISOString()
    };

    this.bookings.push(booking);

    // Update slot status
    const slot = this.findSlot(bookingData.doctor_id, bookingData.slot_time);
    if (slot) {
      slot.status = 'BOOKED';
    }

    return booking;
  }

  getBookingById(id) {
    return this.bookings.find(b => b.id === id);
  }

  getMedicalRecordById(id) {
    return this.medicalRecords.find(r => r.id === id);
  }

  getUserById(id) {
    return this.users.find(u => u.id === id);
  }

  getUserByUsername(username) {
    return this.users.find(u => u.username === username);
  }

  // Reset slots for test repeatability
  resetSlot(doctorId, slotTime) {
    this.bookings = this.bookings.filter(b => !(b.doctor_id === doctorId && b.slot_time === slotTime));
    const slot = this.findSlot(doctorId, slotTime);
    if (slot) {
      slot.status = 'AVAILABLE';
    }
  }
}

// Singleton database instance
module.exports = new Database();
