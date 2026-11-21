/**
 * MediLink Platform Ecosystem Starter
 * One-command launcher for Core API, Background Worker, and 3 Mock HIS instances
 */

const createServer = require('./core/server');
const mockManager = require('./mock-his/mockServersManager');
const backgroundWorker = require('./worker/backgroundWorker');
const config = require('./core/config');

async function startAll() {
  console.log('\n' + '='.repeat(68));
  console.log('   MEDILINK HEALTHCARE PLATFORM - KHỞI ĐỘNG TOÀN DIỆN HỆ SINH THÁI');
  console.log('   SE 403 (TS. Nguyễn Đức Mận) | Nhóm 1: Hy - Nghĩa - Danh - Trường');
  console.log('='.repeat(68));

  // 1. Khởi động 3 máy chủ Mock HIS
  console.log('\n[1/3] Đang khởi động 3 Máy chủ Giả lập HIS phòng khám:');
  try {
    await mockManager.startAll({ daNangPort: 8001, huePort: 8002, quangNamPort: 8003 });
    console.log('   • Mock HIS Đà Nẵng:   http://localhost:8001 (REST / JSON API)');
    console.log('   • Mock HIS Huế:       http://localhost:8002 (SOAP / XML Web Service)');
    console.log('   • Mock HIS Quảng Nam: http://localhost:8003 (Custom REST API)');
  } catch (err) {
    console.warn('   [Lưu ý] Mock HIS có thể đã chạy ngầm từ trước:', err.message);
  }

  // 2. Khởi động Background Worker
  console.log('\n[2/3] Đang khởi động Background Worker (Outbox & Notification):');
  backgroundWorker.start(3000);
  console.log('   • Worker Service:     Đang chạy ngầm chu kỳ quét 3 giây/lần');

  // 3. Khởi động Core Server
  console.log('\n[3/3] Đang khởi động Máy chủ Lõi MediLink Core API:');
  const app = createServer();
  const preferredPort = parseInt(process.env.PORT || '3000', 10);

  const server = app.listen(preferredPort, () => {
    printSuccessBanner(preferredPort);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      const fallbackPort = preferredPort + 1;
      console.warn(`   [Cảnh báo] Cổng ${preferredPort} đang bận, tự động chuyển sang cổng ${fallbackPort}...`);
      app.listen(fallbackPort, () => {
        printSuccessBanner(fallbackPort);
      });
    } else {
      console.error('Lỗi khởi động Core Server:', err);
    }
  });

  // Graceful shutdown
  const shutdown = async () => {
    console.log('\nĐang dừng các dịch vụ...');
    backgroundWorker.stopWorker();
    await mockManager.stopAll();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

function printSuccessBanner(port) {
  console.log('\n' + '─'.repeat(68));
  console.log(` ✅ HỆ THỐNG ĐÃ SẴN SÀNG HOẠT ĐỘNG!`);
  console.log(` 🌐 TRANG DASHBOARD TRỰC QUAN:   http://localhost:${port}`);
  console.log(` 🏥 TRẠNG THÁI HỆ THỐNG (HEALTH): http://localhost:${port}/health`);
  console.log(` 📑 KIỂM ĐỊNH TỰ ĐỘNG CHUỖI BĂM:  http://localhost:${port}/api/audit/verify`);
  console.log('─'.repeat(68) + '\n');
}

if (require.main === module) {
  startAll();
}

module.exports = { startAll };
