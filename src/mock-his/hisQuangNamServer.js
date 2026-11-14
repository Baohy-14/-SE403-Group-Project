/**
 * Mock HIS Quảng Nam Server
 * Protocol: Custom REST RPC
 * Port: 8003
 */

const express = require('express');

function createQuangNamServer() {
  const app = express();
  app.use(express.json());

  let isEnabled = true;

  app.post('/admin/toggle', (req, res) => {
    isEnabled = req.body.enabled !== undefined ? req.body.enabled : !isEnabled;
    res.json({ facility: 'FAC_QUANGNAM', enabled: isEnabled });
  });

  app.get('/health', (req, res) => {
    if (!isEnabled) return res.status(503).json({ error: 'DOWN' });
    res.json({ status: 'OK', system: 'Quang Nam Clinic HIS' });
  });

  app.post('/his/v1/booking', (req, res) => {
    if (!isEnabled) {
      return res.status(503).json({ error: 'SERVICE_UNAVAILABLE' });
    }

    const { params } = req.body;
    const ticketNo = `QN-TICKET-${Date.now().toString().slice(-6)}`;

    res.status(200).json({
      status: 'OK',
      ticket_no: ticketNo,
      patient: params?.bn_ten,
      time: params?.gio_kham,
      clinic: 'Tam Ky - Quang Nam'
    });
  });

  return app;
}

if (require.main === module) {
  const app = createQuangNamServer();
  const port = process.env.PORT || 8003;
  app.listen(port, () => {
    console.log(`[Mock HIS Quảng Nam] running at http://localhost:${port}`);
  });
}

module.exports = createQuangNamServer;
