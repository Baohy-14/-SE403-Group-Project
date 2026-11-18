/**
 * Mock HIS 1: Đà Nẵng Clinic Group (Modern REST / JSON Service - Port 8001)
 * Supports idempotent booking confirmation via `X-Idempotency-Key`.
 */

const { createHttpApp } = require('../core/gateway/httpApp');

function createDaNangHisServer() {
  const app = createHttpApp();
  const records = new Map();

  app.get('/health', (req, res) => {
    res.json({ status: 'UP', his: 'HIS_DANANG_REST_V2', recordsCount: records.size });
  });

  app.post('/api/v2/appointments', (req, res) => {
    const idemKey = req.headers['x-idempotency-key'] || req.body.externalBookingUuid;
    if (idemKey && records.has(idemKey)) {
      return res.status(200).json(records.get(idemKey));
    }

    const confirmation = {
      status: 'ACCEPTED',
      dnConfirmationCode: `DN-HIS-${1000 + records.size + 1}`,
      patientUuid: req.body.patientUuid,
      practitionerCode: req.body.practitionerCode,
      scheduledIsoStart: req.body.scheduledIsoStart
    };

    if (idemKey) records.set(idemKey, confirmation);
    res.status(201).json(confirmation);
  });

  return app;
}

if (require.main === module) {
  const port = parseInt(process.env.PORT || '8001', 10);
  createDaNangHisServer().listen(port, () => {
    console.log(`[Mock HIS Đà Nẵng - REST/JSON] Listening on port ${port}`);
  });
}

module.exports = { createDaNangHisServer };
