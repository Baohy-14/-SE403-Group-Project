/**
 * Mock HIS Cluster Manager (Convenience orchestrator for local single-command test runs)
 */

const http = require('http');
const { createDaNangHisServer } = require('./hisDaNangServer');
const { createHueHisServer } = require('./hisHueServer');
const { createQuangNamHisServer } = require('./hisQuangNamServer');
const config = require('../core/config');

async function resolveAvailablePort(preferredPort, fallbackPort = preferredPort + 10) {
  return new Promise((resolve) => {
    const s = http.createServer();
    s.once('error', () => resolve(fallbackPort));
    s.once('listening', () => s.close(() => resolve(preferredPort)));
    s.listen(preferredPort, '127.0.0.1');
  });
}

class MockServersManager {
  constructor() {
    this.servers = {};
    this.hueController = null;
    this.ports = { danang: 8001, hue: 8002, quangnam: 8003 };
  }

  async startAll({ daNangPort = 8001, huePort = 8002, quangNamPort = 8003 } = {}) {
    const realDnPort = await resolveAvailablePort(daNangPort, 8011);
    const realHuePort = await resolveAvailablePort(huePort, 8012);
    const realQnPort = await resolveAvailablePort(quangNamPort, 8013);
    this.ports = { danang: realDnPort, hue: realHuePort, quangnam: realQnPort };

    config.HIS_DANANG_URL = `http://127.0.0.1:${realDnPort}`;
    config.HIS_HUE_URL = `http://127.0.0.1:${realHuePort}`;
    config.HIS_QUANGNAM_URL = `http://127.0.0.1:${realQnPort}`;

    try {
      const hisDispatcher = require('../core/acl/hisDispatcher');
      if (hisDispatcher.adapters) {
        if (hisDispatcher.adapters.get('FAC_DANANG')) hisDispatcher.adapters.get('FAC_DANANG').endpointUrl = config.HIS_DANANG_URL;
        if (hisDispatcher.adapters.get('FAC_HUE')) hisDispatcher.adapters.get('FAC_HUE').endpointUrl = config.HIS_HUE_URL;
        if (hisDispatcher.adapters.get('FAC_QUANGNAM')) hisDispatcher.adapters.get('FAC_QUANGNAM').endpointUrl = config.HIS_QUANGNAM_URL;
      }
    } catch {
      // Lazy load if dispatcher not yet instantiated
    }

    const dnApp = createDaNangHisServer();
    const hueObj = createHueHisServer();
    const qnApp = createQuangNamHisServer();
    this.hueController = hueObj;

    this.servers.danang = await new Promise((resolve, reject) => {
      const s = dnApp.listen(realDnPort, '127.0.0.1', () => resolve(s));
      s.on('error', reject);
    });
    this.servers.hue = await new Promise((resolve, reject) => {
      const s = hueObj.app.listen(realHuePort, '127.0.0.1', () => resolve(s));
      s.on('error', reject);
    });
    this.servers.quangnam = await new Promise((resolve, reject) => {
      const s = qnApp.listen(realQnPort, '127.0.0.1', () => resolve(s));
      s.on('error', reject);
    });

    return this.servers;
  }

  setHueChaosMode(mode) {
    if (this.hueController) {
      this.hueController.setChaosMode(mode);
    }
  }

  getHueSyncedCount() {
    return this.hueController ? this.hueController.getBookingCount() : 0;
  }

  async stopAll() {
    for (const key of Object.keys(this.servers)) {
      const srv = this.servers[key];
      if (srv) {
        await new Promise((resolve) => srv.close(() => resolve()));
      }
    }
    this.servers = {};
  }
}

const manager = new MockServersManager();

if (require.main === module) {
  manager.startAll().then(() => {
    console.log('[Mock HIS Cluster] Started Đà Nẵng (8001), Huế (8002), Quảng Nam (8003)');
  });
}

module.exports = manager;
