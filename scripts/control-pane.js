#!/usr/bin/env node
'use strict';

const { describeMissingDependencyError } = require('./lib/missing-dependency');
const path = require('node:path');

function parseOrchestrationArgs(argv) {
  const args = argv.slice(2);
  const options = { host: '127.0.0.1', port: 8765, readOnly: true, openBrowser: true };
  for (let index = 0; index < args.length; index += 1) {
    const flag = args[index];
    if (flag === '--no-open') { options.openBrowser = false; continue; }
    if (flag === '--read-only') continue;
    if (!['--orchestration', '--host', '--port'].includes(flag)) throw new Error(`Unknown orchestration option: ${flag}`);
    const value = args[++index];
    if (!value || value.startsWith('--')) throw new Error(`Missing value: ${flag}`);
    if (flag === '--orchestration') options.filePath = path.resolve(value);
    if (flag === '--host') options.host = value;
    if (flag === '--port') options.port = Number(value);
  }
  if (!options.filePath || path.extname(options.filePath).toLowerCase() !== '.json') {
    throw new Error('--orchestration requires an explicit .json run file.');
  }
  return options;
}

async function startOrchestrationPane(argv) {
  const options = parseOrchestrationArgs(argv);
  const { createOrchestrationDashboard } = require('./lib/orchestration/dashboard');
  const app = createOrchestrationDashboard(options);
  await app.listen();
  console.log(`ECC orchestration (JSON only, read-only): ${app.url}`);
  if (options.openBrowser) openBrowser(app.url);
  const stop = async () => { await app.close(); };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
  app.server.once('close', () => {
    process.removeListener('SIGINT', stop);
    process.removeListener('SIGTERM', stop);
  });
  return app;
}

// openBrowser is now in scripts/lib/platform-launch.js — keep a thin wrapper
// for backwards compatibility, but surface the structured result.
const { openBrowser: launchOpenBrowser } = require('./lib/platform-launch');
function openBrowser(url) {
  const result = launchOpenBrowser(url);
  if (!result.opened) {
    console.error(`[control-pane] failed to open browser: ${result.reason}`);
  }
}

async function main(argv = process.argv) {
  // Select this branch before loading any legacy control-pane/state-store code.
  if (argv.slice(2).includes('--orchestration')) return startOrchestrationPane(argv);
  const { createControlPaneServer, parseArgs, usage } = require('./lib/control-pane/server');
  const args = parseArgs(argv);

  if (args.help) {
    console.log(usage());
    return;
  }

  const app = createControlPaneServer(args);
  await app.listen();

  console.log(`ECC Control Pane: ${app.url}`);
  console.log(`ECC2 database: ${app.config.dbPath}`);
  console.log(`ECC state database: ${app.config.stateDbPath}`);
  console.log(args.allowActions ? 'Actions: enabled for local allowlist' : 'Actions: read-only');

  if (args.openBrowser) {
    openBrowser(app.url);
  }

  const shutdown = async () => {
    try {
      await app.close();
    } finally {
      process.exit(0);
    }
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

if (require.main === module) {
  main().catch(error => {
    console.error(`[control-pane] ${describeMissingDependencyError(error) || error.message}`);
    process.exit(1);
  });
}

module.exports = {
  main,
  openBrowser,
  parseOrchestrationArgs,
};
