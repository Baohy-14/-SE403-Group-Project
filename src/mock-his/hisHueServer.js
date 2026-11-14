/**
 * Mock HIS Huế Server (Legacy SOAP / XML)
 * Protocol: SOAP / XML Web Service
 * Port: 8002
 */

const express = require('express');

function createHueServer() {
  const app = express();

  // Parse raw text for XML
  app.use(express.text({ type: '*/*' }));

  let isEnabled = true;

  // Toggle endpoint for fault injection testing
  app.post('/admin/toggle', (req, res) => {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      isEnabled = body.enabled !== undefined ? body.enabled : !isEnabled;
    } catch {
      isEnabled = !isEnabled;
    }
    res.json({ facility: 'FAC_HUE', enabled: isEnabled });
  });

  app.get('/health', (req, res) => {
    if (!isEnabled) return res.status(503).send('Service Unavailable');
    res.send('<status>UP</status>');
  });

  app.post('/ws/appointmentService.asmx', (req, res) => {
    if (!isEnabled) {
      return res.status(503).send(`<?xml version="1.0" encoding="utf-8"?>
<soap:Fault>
  <faultcode>soap:Server</faultcode>
  <faultstring>Phần mềm HIS Huế đang bảo trì hoặc mất kết nối máy chủ dữ liệu.</faultstring>
</soap:Fault>`);
    }

    const xml = req.body || '';
    const matchId = xml.match(/<his:ExternalBookingId>(.*?)<\/his:ExternalBookingId>/);
    const bookingId = matchId ? matchId[1] : 'UNKNOWN';
    const ticketNo = `HUE-SOAP-${Date.now().toString().slice(-6)}`;

    const responseXml = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:his="http://huehospital.vn/his/ws">
  <soap:Body>
    <his:RegisterAppointmentResponse>
      <his:ResultStatus>SUCCESS</his:ResultStatus>
      <his:ExternalBookingId>${bookingId}</his:ExternalBookingId>
      <his:HisReceptionTicketNumber>${ticketNo}</his:HisReceptionTicketNumber>
      <his:AssignedRoom>Phong 204 - Khoa Kham Benh</his:AssignedRoom>
      <his:Message>Tiep nhan lich hen kham tu MediLink thanh cong.</his:Message>
    </his:RegisterAppointmentResponse>
  </soap:Body>
</soap:Envelope>`;

    res.set('Content-Type', 'text/xml; charset=utf-8');
    res.status(200).send(responseXml);
  });

  return app;
}

if (require.main === module) {
  const app = createHueServer();
  const port = process.env.PORT || 8002;
  app.listen(port, () => {
    console.log(`[Mock HIS Huế] running at http://localhost:${port}`);
  });
}

module.exports = createHueServer;
