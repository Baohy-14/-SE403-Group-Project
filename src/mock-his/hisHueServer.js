/**
 * Mock HIS 2: Huế Clinic Group (Legacy SOAP 1.1 / XML Service - Port 8002)
 * Includes Fault-Injection Chaos Controller (`UP` | `DOWN_503` | `TIMEOUT_HANG`)
 * to verify ASR-02 (2-hour HIS outage isolation via Circuit Breaker & Outbox recovery).
 */

const { createHttpApp } = require('../core/gateway/httpApp');

function createHueHisServer() {
  const app = createHttpApp();
  const xmlBookings = new Map();
  let chaosMode = 'UP'; // 'UP' | 'DOWN_503' | 'TIMEOUT_HANG'

  app.get('/health', (req, res) => {
    if (chaosMode !== 'UP') {
      return res.status(503).json({ status: 'DOWN', chaosMode });
    }
    res.json({ status: 'UP', his: 'HIS_HUE_SOAP_XML_2018', chaosMode, count: xmlBookings.size });
  });

  // Chaos engineering control endpoint for automated & live demo fault injection
  app.post('/chaos/mode', (req, res) => {
    chaosMode = req.body.mode || 'UP';
    res.json({ success: true, chaosMode });
  });

  app.post('/ws/AppointmentService.asmx', async (req, res) => {
    if (chaosMode === 'DOWN_503') {
      const faultXml = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <soap:Fault>
      <faultcode>soap:Server</faultcode>
      <faultstring>Database Connection Lost at Hue Clinic Server</faultstring>
    </soap:Fault>
  </soap:Body>
</soap:Envelope>`;
      return res.status(503).send(faultXml, 'text/xml; charset=utf-8');
    }

    if (chaosMode === 'TIMEOUT_HANG') {
      // Simulate hung network socket exceeding MediLink's 1500ms timeout budget
      await new Promise((resolve) => setTimeout(resolve, 3500));
      return res.status(504).send('Gateway Timeout');
    }

    const rawXml = req.rawBody || '';
    const idemMatch = rawXml.match(/<hue:IdempotencyToken>([^<]+)<\/hue:IdempotencyToken>/);
    const patMatch = rawXml.match(/<hue:MaBenhNhanYTe>([^<]+)<\/hue:MaBenhNhanYTe>/);
    const idemToken = idemMatch ? idemMatch[1] : null;

    let hueCode = idemToken && xmlBookings.has(idemToken) ? xmlBookings.get(idemToken) : null;
    if (!hueCode) {
      hueCode = `HUE-XML-${2000 + xmlBookings.size + 1}`;
      if (idemToken) xmlBookings.set(idemToken, hueCode);
    }

    const responseXml = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <DangKyLichKhamResponse xmlns="http://his.hueclinic.vn/ws/2018">
      <TrangThai>THANH_CONG</TrangThai>
      <MaTiepDonHue>${hueCode}</MaTiepDonHue>
      <MaBenhNhanXacNhan>${patMatch ? patMatch[1] : 'UNKNOWN'}</MaBenhNhanXacNhan>
    </DangKyLichKhamResponse>
  </soap:Body>
</soap:Envelope>`;

    res.status(200).send(responseXml, 'text/xml; charset=utf-8');
  });

  return {
    app,
    setChaosMode: (mode) => {
      chaosMode = mode;
    },
    getBookingCount: () => xmlBookings.size
  };
}

if (require.main === module) {
  const port = parseInt(process.env.PORT || '8002', 10);
  const { app } = createHueHisServer();
  app.listen(port, () => {
    console.log(`[Mock HIS Huế - Legacy SOAP/XML] Listening on port ${port}`);
  });
}

module.exports = { createHueHisServer };
