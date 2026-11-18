/**
 * Mock HIS Cluster Manager (Convenience orchestrator for local single-command test runs)
 */

const { createDaNangHisServer } = require('./hisDaNangServer');
const { createHueHisServer } = require('./hisHueServer');
const { createQuangNamHisServer } = require('./hisQuangNamServer');

class MockServersManager {
  constructor() {
    this.servers = {};
    this.hueController = null;
  }

  async startAll({ daNangPort = 8001, huePort = 8002, quangNamPort = 8003 } = {}) {
    const dnApp = createDaNangHisServer();
    const hueObj = createHueHisServer();
    const qnApp = createQuangNamHisServer();
    this.hueController = hueObj;

    this.servers.danang = await new Promise((resolve) => {
      const s = dnApp.listen(daNangPort, '127.0.0.1', () => resolve(s));
    });
    this.servers.hue = await new Promise((resolve) => {
      const s = hueObj.app.listen(huePort, '127.0.0.1', () => resolve(s));
    });
    this.servers.quangnam = await new Promise((resolve) => {
      const s = qnApp.listen(quangNamPort, '127.0.0.1', () => resolve(s));
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
