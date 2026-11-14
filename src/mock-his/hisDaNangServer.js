/**
 * Mock HIS Đà Nẵng Server
 * Protocol: REST / JSON
 * Port: 8001
 */

const express = require('express');

function createDaNangServer() {
  const app = express();
  app.use(express.json());

  let isEnabled = true;

  // Toggle endpoint for fault injection testing
  app.post('/admin/toggle', (req, res) => {
    isEnabled = req.body.enabled !== undefined ? req.body.enabled : !isEnabled;
    res.json({ facility: 'FAC_DANANG', enabled: isEnabled });
  });

  app.get('/health', (req, res) => {
    if (!isEnabled) return res.status(503).json({ status: 'DOWN' });
    res.json({ status: 'UP', system: 'Da Nang HIS Web Service' });
  });

  app.post('/api/appointments', (req, res) => {
    if (!isEnabled) {
      return res.status(503).json({ error: 'HIS_DANANG_UNAVAILABLE' });
    }

    const { booking_ref, patient_name, doctor_code, appointment_time } = req.body;
    const hisId = `DN-HIS-${Date.now().toString().slice(-6)}`;

    res.status(200).json({
      success: true,
      his_appointment_id: hisId,
      booking_ref,
      patient_name,
      doctor_code,
      appointment_time,
      status: 'CONFIRMED_AT_DANANG_HIS',
      created_at: new Date().toISOString()
    });
  });

  return app;
}

if (require.main === module) {
  const app = createDaNangServer();
  const port = process.env.PORT || 8001;
  app.listen(port, () => {
    console.log(`[Mock HIS Đà Nẵng] running at http://localhost:${port}`);
  });
}

module.exports = createDaNangServer;
