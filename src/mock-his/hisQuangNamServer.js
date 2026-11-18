/**
 * Mock HIS 3: Quảng Nam Clinic Group (Legacy Custom RPC Service - Port 8003)
 * Uses integer local patient key `ma_bn_noi_bo` & stored-procedure style RPC JSON.
 */

const { createHttpApp } = require('../core/gateway/httpApp');

function createQuangNamHisServer() {
  const app = createHttpApp();
  const tickets = new Map();

  app.get('/health', (req, res) => {
    res.json({ status: 'UP', his: 'HIS_QUANGNAM_RPC_V1', count: tickets.size });
  });

  app.post('/his-rpc/v1/execute', (req, res) => {
    const idemKey = req.headers['x-idempotency-key'] || req.body?.params?.ma_giao_dich_ngoai;
    if (idemKey && tickets.has(idemKey)) {
      return res.status(200).json(tickets.get(idemKey));
    }

    const reply = {
      ma_ket_qua: 0,
      thong_bao: 'GHI_NHAN_THANH_CONG',
      so_phieu_kham: `QN-RPC-${3000 + tickets.size + 1}`,
      ma_bn_noi_bo: req.body?.params?.ma_bn_noi_bo
    };

    if (idemKey) tickets.set(idemKey, reply);
    res.status(200).json(reply);
  });

  return app;
}

if (require.main === module) {
  const port = parseInt(process.env.PORT || '8003', 10);
  createQuangNamHisServer().listen(port, () => {
    console.log(`[Mock HIS Quảng Nam - Custom RPC] Listening on port ${port}`);
  });
}

module.exports = { createQuangNamHisServer };
