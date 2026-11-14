/**
 * Mock Servers Manager
 * Starts and stops all mock HIS servers (Da Nang, Hue, Quang Nam)
 */

const createDaNangServer = require('./hisDaNangServer');
const createHueServer = require('./hisHueServer');
const createQuangNamServer = require('./hisQuangNamServer');

class MockServersManager {
  constructor() {
    this.servers = [];
  }

  async startAll(ports = { daNang: 8001, hue: 8002, quangNam: 8003 }) {
    await this.stopAll();

    const p1 = new Promise((resolve) => {
      const app = createDaNangServer();
      const server = app.listen(ports.daNang, () => {
        // console.log(`[Mock HIS Da Nang] Started on port ${ports.daNang}`);
        this.servers.push(server);
        resolve();
      });
    });

    const p2 = new Promise((resolve) => {
      const app = createHueServer();
      const server = app.listen(ports.hue, () => {
        // console.log(`[Mock HIS Hue] Started on port ${ports.hue}`);
        this.servers.push(server);
        resolve();
      });
    });

    const p3 = new Promise((resolve) => {
      const app = createQuangNamServer();
      const server = app.listen(ports.quangNam, () => {
        // console.log(`[Mock HIS Quang Nam] Started on port ${ports.quangNam}`);
        this.servers.push(server);
        resolve();
      });
    });

    await Promise.all([p1, p2, p3]);
  }

  async stopAll() {
    for (const server of this.servers) {
      await new Promise(resolve => server.close(resolve));
    }
    this.servers = [];
  }
}

if (require.main === module) {
  const manager = new MockServersManager();
  manager.startAll().then(() => {
    console.log('All 3 Mock HIS Servers started successfully (Ports: 8001, 8002, 8003). Press Ctrl+C to stop.');
  });
}

module.exports = new MockServersManager();
