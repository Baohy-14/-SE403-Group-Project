/**
 * Test 5 (ASR-04): Interoperability & Open-Closed Extensibility for Onboarding 4th HIS
 * Scenario: MediLink acquires a 4th clinic (Phòng khám Quốc tế Hội An - Port 8004) speaking
 *           standard HL7 FHIR R4. We register `FhirGenericAdapter` at runtime with ZERO
 *           modifications to BookingService, Database, or Core Server!
 */

const { createHttpApp } = require('../core/gateway/httpApp');
const hisDispatcher = require('../core/acl/hisDispatcher');
const FhirGenericAdapter = require('../core/acl/adapters/fhirGenericAdapter');

async function runExtensibilityTest(port = 3000) {
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log('\n[TEST 5 - ASR-04] Kiểm chứng Mở rộng Tích hợp HIS thứ 4 (HL7 FHIR R4 - Zero Core Changes)...');

  await fetch(`${baseUrl}/admin/reset`, { method: 'POST' });

  // Spin up standalone Mock HIS #4 (Hội An International Clinic - Port 8004)
  let capturedFhirPayload = null;
  const his4App = createHttpApp();
  his4App.post('/fhir/r4/Appointment', (req, res) => {
    capturedFhirPayload = req.body;
    res.status(201).json({
      resourceType: 'Appointment',
      id: `HOIAN-FHIR-${Date.now().toString().slice(-4)}`,
      status: 'booked'
    });
  });

  const his4Server = await new Promise((resolve) => {
    const s = his4App.listen(8004, '127.0.0.1', () => resolve(s));
  });

  try {
    // Dynamically plug in Adapter #4 into ACL Dispatcher (0 lines changed in Core!)
    hisDispatcher.registerAdapter(
      'FAC_HOIAN',
      new FhirGenericAdapter('FAC_HOIAN', 'http://127.0.0.1:8004')
    );

    const res = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Id': 'hoian_patient_test'
      },
      body: JSON.stringify({
        doctor_id: 'DOC_404',
        slot_time: '2026-11-20 14:00',
        patient_id: 'user_pat_01',
        facility_id: 'FAC_HOIAN'
      })
    });
    const body = await res.json();

    const fhirCompliant =
      capturedFhirPayload &&
      capturedFhirPayload.resourceType === 'Appointment' &&
      capturedFhirPayload.status === 'booked' &&
      Array.isArray(capturedFhirPayload.participant) &&
      capturedFhirPayload.participant.length === 3;

    const passed =
      res.status === 201 &&
      body.booking.his_sync_status === 'SYNCED' &&
      String(body.booking.his_reference_code).startsWith('HOIAN-FHIR-') &&
      fhirCompliant;

    console.log(`   -> Kết nối HIS thứ 4 (Hội An - Port 8004): HTTP ${res.status} | Mã tham chiếu: ${body.booking.his_reference_code}`);
    console.log(`   -> Chuẩn HL7 FHIR R4 Payload: resourceType="${capturedFhirPayload?.resourceType}", participants=${capturedFhirPayload?.participant?.length} | Core sửa đổi: 0 dòng`);

    return {
      passed,
      success: res.status === 201 && body.booking.his_sync_status === 'SYNCED',
      fhirCompliant,
      hisReferenceCode: body.booking?.his_reference_code
    };
  } finally {
    await new Promise((resolve) => his4Server.close(() => resolve()));
  }
}

if (require.main === module) {
  const createServer = require('../core/server');
  const mockManager = require('../mock-his/mockServersManager');
  (async () => {
    await mockManager.startAll();
    const srv = await new Promise((r) => {
      const s = createServer().listen(3000, '127.0.0.1', () => r(s));
    });
    try {
      const res = await runExtensibilityTest(3000);
      process.exit(res.passed ? 0 : 1);
    } finally {
      srv.close();
      await mockManager.stopAll();
    }
  })();
}

module.exports = runExtensibilityTest;
