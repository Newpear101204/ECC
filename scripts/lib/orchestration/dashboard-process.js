'use strict';

const { createFileStore } = require('./file-store');
const { createOrchestrationDashboard } = require('./dashboard');

async function main() {
  if (typeof process.send !== 'function') throw new Error('Dashboard process requires its launch handshake');
  const [filePath, rawPort, instanceId] = process.argv.slice(2);
  if (!/^[a-f0-9-]{36}$/.test(instanceId || '')) throw new Error('Invalid dashboard instance');
  const state = createFileStore(filePath).read();
  const app = createOrchestrationDashboard({ filePath, port: Number(rawPort),
    host: '127.0.0.1', readOnly: true, instanceId });
  await app.listen();
  const stop = () => { app.close().finally(() => process.exit(0)); };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
  // Disconnecting the launcher leaves only a read-only HTTP server, never task execution.
  process.send({ type: 'ready', url: app.url, runId: state.id, instanceId });
}

if (require.main === module) {
  main().catch(error => {
    if (process.connected) process.send({ type: 'error', message: error.message }, () => process.exit(1));
    else process.exit(1);
  });
}

module.exports = { main };
