'use strict';

const http = require('node:http');
const path = require('node:path');
const { buildAllowedHostnames, isAllowedHostHeader } = require('../loopback-guard');
const { renderDashboardHtml, dashboardScript } = require('./dashboard-ui');

const LOOPBACK_BINDINGS = new Set(['127.0.0.1', 'localhost', '::1']);
const MAX_RESPONSE_BYTES = 4 * 1024 * 1024;

function validSnapshot(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
    && value.schemaVersion === 1 && typeof value.id === 'string'
    && Array.isArray(value.tasks) && Array.isArray(value.events)
    && value.tasks.every(task => task && typeof task === 'object'
      && typeof task.id === 'string' && typeof task.status === 'string');
}

function send(res, status, body, contentType = 'application/json; charset=utf-8') {
  res.writeHead(status, {
    'content-type': contentType,
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'no-referrer',
    'content-security-policy': "default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  });
  res.end(typeof body === 'string' ? body : JSON.stringify(body));
}

function requestIsLocal(req, hostnames, port) {
  if (!isAllowedHostHeader(req.headers.host, hostnames)) return false;
  try {
    const target = new URL('http://' + req.headers.host);
    if (Number(target.port || 80) !== port) return false;
    if (req.headers.origin) {
      const origin = new URL(req.headers.origin);
      if (origin.origin !== target.origin || req.headers.origin !== origin.origin) return false;
    }
    return true;
  } catch {
    return false;
  }
}

/** An explicit file-backed, read-only view; never initializes a run or any DB. */
function createOrchestrationDashboard(options = {}) {
  const { filePath, host = '127.0.0.1', port = 8765, readOnly = true } = options;
  if (!LOOPBACK_BINDINGS.has(host)) throw new Error('Dashboard binding must be loopback.');
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('Invalid dashboard port.');
  if (readOnly !== true) throw new Error('Dashboard is read-only; use the orchestration CLI for commands.');
  if (!options.readSnapshot && (typeof filePath !== 'string' || !filePath.trim())) {
    throw new Error('An explicit orchestration JSON file is required.');
  }
  if (options.readSnapshot && typeof options.readSnapshot !== 'function') throw new Error('Invalid snapshot reader.');
  const readSnapshot = options.readSnapshot || (() => {
    // Load storage lazily: requiring/serving the dashboard cannot open state DBs.
    const { createFileStore } = require('./file-store');
    const { snapshot } = require('./model');
    return snapshot(createFileStore(path.resolve(filePath)).read());
  });
  const hostnames = buildAllowedHostnames(host);
  const server = http.createServer(async (req, res) => {
    const address = server.address();
    if (!requestIsLocal(req, hostnames, address.port)) {
      send(res, 403, { error: 'Local origin required' });
      return;
    }
    if (req.method !== 'GET') {
      res.setHeader('allow', 'GET');
      send(res, 405, { error: 'Read-only dashboard' });
      return;
    }
    let route;
    try { route = new URL(req.url, 'http://localhost').pathname; } catch {
      return send(res, 400, { error: 'Invalid request path' });
    }
    if (route === '/') return send(res, 200, renderDashboardHtml(), 'text/html; charset=utf-8');
    if (route === '/assets/dashboard.js') return send(res, 200, dashboardScript(), 'text/javascript; charset=utf-8');
    if (route === '/health') return send(res, 200, { status: 'ok', readOnly: true, storage: 'explicit-json' });
    if (route !== '/api/orchestration') return send(res, 404, { error: 'Not found' });
    try {
      const value = await readSnapshot();
      if (!validSnapshot(value)) throw new Error('Invalid snapshot');
      const body = JSON.stringify(value);
      if (Buffer.byteLength(body) > MAX_RESPONSE_BYTES) throw new Error('Snapshot too large');
      send(res, 200, body);
    } catch {
      send(res, 503, { error: 'Run unavailable or invalid' });
    }
  });
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  server.maxHeadersCount = 50;
  return {
    server,
    get url() {
      const bound = server.address();
      const hostname = host === '::1' ? '[::1]' : host;
      return `http://${hostname}:${bound && typeof bound === 'object' ? bound.port : port}`;
    },
    listen() {
      return new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(port, host, () => { server.off('error', reject); resolve(this); });
      });
    },
    close() {
      return new Promise((resolve, reject) => {
        server.close(error => { if (error) reject(error); else resolve(); });
        server.closeIdleConnections();
      });
    },
  };
}

module.exports = { createOrchestrationDashboard };
