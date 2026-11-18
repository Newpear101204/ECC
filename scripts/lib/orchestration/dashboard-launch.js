'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const http = require('node:http');
const { fork } = require('node:child_process');
const { createFileStore } = require('./file-store');

const MAX_METADATA_BYTES = 8192;
const SAFE_ENV = new Set(['path', 'systemroot', 'windir', 'temp', 'tmp', 'comspec', 'pathext']);

function info(file) {
  try { return fs.lstatSync(file); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}

function assertRegular(file) {
  const stat = info(file);
  if (stat && (stat.isSymbolicLink() || !stat.isFile() || stat.nlink !== 1)) {
    throw new Error('Unsafe dashboard metadata: expected a regular unlinked file');
  }
  return stat;
}

function validateMetadata(value, filePath, runId) {
  const port = typeof value?.url === 'string' && /^http:\/\/127\.0\.0\.1:([1-9]\d{0,4})$/.exec(value.url);
  if (!value || value.schemaVersion !== 1 || value.filePath !== filePath || value.runId !== runId ||
      !Number.isSafeInteger(value.pid) || value.pid <= 0 || !port || Number(port[1]) > 65535 ||
      typeof value.instanceId !== 'string' || !/^[a-f0-9-]{36}$/.test(value.instanceId)) {
    throw new Error('Invalid dashboard metadata or non-loopback URL');
  }
  return value;
}

function readMetadata(file, filePath, runId) {
  const stat = assertRegular(file);
  if (!stat) return null;
  if (stat.size > MAX_METADATA_BYTES) throw new Error('Dashboard metadata exceeds size limit');
  const bytes = fs.readFileSync(file);
  if (bytes.length > MAX_METADATA_BYTES) throw new Error('Dashboard metadata exceeds size limit');
  let value;
  try { value = JSON.parse(bytes.toString('utf8')); }
  catch { throw new Error('Invalid dashboard metadata JSON'); }
  return validateMetadata(value, filePath, runId);
}

function probe(metadata, timeoutMs) {
  // URL was strictly validated; no redirects, proxies or arbitrary destinations.
  return new Promise(resolve => {
    let finished = false;
    const done = value => {
      if (!finished) { finished = true; clearTimeout(deadline); resolve(value); }
    };
    const req = http.get(metadata.url + '/health', { agent: false }, res => {
      let body = '';
      res.on('data', chunk => {
        body += chunk;
        if (Buffer.byteLength(body) > MAX_METADATA_BYTES) req.destroy(new Error('Health response too large'));
      });
      res.on('error', () => done(false));
      res.on('end', () => {
        try {
          const value = JSON.parse(body);
          done(res.statusCode === 200 && value.status === 'ok' && value.readOnly === true &&
            value.storage === 'explicit-json' && value.instanceId === metadata.instanceId && value.pid === metadata.pid);
        } catch { done(false); }
      });
    });
    const deadline = setTimeout(() => req.destroy(new Error('Dashboard health timeout')), Math.min(timeoutMs, 1000));
    req.on('error', () => done(false));
  });
}

function persistMetadata(file, metadata) {
  const temporary = `${file}.${crypto.randomUUID()}.tmp`;
  let created = false;
  try {
    assertRegular(file);
    fs.writeFileSync(temporary, JSON.stringify(metadata, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    created = true;
    assertRegular(file);
    fs.renameSync(temporary, file);
    created = false;
  } finally {
    if (created) fs.unlinkSync(temporary);
  }
}

function startChild(filePath, port, instanceId, timeoutMs) {
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => SAFE_ENV.has(key.toLowerCase())));
  const child = fork(path.join(__dirname, 'dashboard-process.js'), [filePath, String(port), instanceId], {
    detached: true, windowsHide: true, env, execArgv: [],
    stdio: ['ignore', 'ignore', 'ignore', 'ipc']
  });
  const ready = new Promise((resolve, reject) => {
    const timer = setTimeout(() => finish(new Error('Dashboard startup timeout')), timeoutMs);
    const onError = error => finish(error);
    const onExit = code => finish(new Error(`Dashboard startup exited (${code})`));
    const onMessage = message => {
      if (message?.type === 'error') finish(new Error(`Dashboard startup: ${message.message}`));
      else if (message?.type === 'ready') finish(null, message);
    };
    function finish(error, value) {
      clearTimeout(timer);
      child.off('error', onError);
      child.off('exit', onExit);
      child.off('message', onMessage);
      if (error) reject(error); else resolve(value);
    }
    child.once('error', onError);
    child.once('exit', onExit);
    child.on('message', onMessage);
  });
  return { child, ready };
}

async function stopOwnChild(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  await new Promise(resolve => {
    const timer = setTimeout(resolve, 1000);
    child.once('exit', () => { clearTimeout(timer); resolve(); });
    try { child.kill(); } catch { clearTimeout(timer); resolve(); }
  });
}

function validateOptions(port, timeoutMs) {
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('Invalid dashboard port');
  if (!Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 30000) throw new Error('Invalid dashboard startup timeout');
}

function publicConnection(metadata, reused) {
  return { url: metadata.url, pid: metadata.pid, reused, runId: metadata.runId, instanceId: metadata.instanceId };
}

/** Start/reuse only the passive JSON viewer. Never launches a worker or scheduler. */
async function openDashboard({ filePath, port = 0, timeoutMs = 5000 } = {}) {
  validateOptions(port, timeoutMs);
  const store = createFileStore(filePath);
  const initial = store.read(); // Validates the explicit JSON path and ancestors before any spawn.
  const marker = `${store.path}.dashboard.json`;
  const lock = `${marker}.lock`;
  assertRegular(marker);
  try { fs.mkdirSync(lock, { mode: 0o700 }); }
  catch (error) {
    if (error.code === 'EEXIST') throw new Error('Dashboard launch lock exists; inspect owner before recovery');
    throw error;
  }
  let child;
  let committed = false;
  try {
    const current = readMetadata(marker, store.path, initial.id);
    if (current && await probe(current, timeoutMs)) {
      if (store.read().id !== initial.id) throw new Error('Run changed during dashboard verification');
      return publicConnection(current, true);
    }
    const instanceId = crypto.randomUUID();
    const started = startChild(store.path, port, instanceId, timeoutMs);
    child = started.child;
    const message = await started.ready;
    const metadata = validateMetadata({ schemaVersion: 1, filePath: store.path, runId: initial.id,
      instanceId, url: message.url, pid: child.pid, startedAt: new Date().toISOString() }, store.path, initial.id);
    if (message.runId !== initial.id || message.instanceId !== instanceId || !await probe(metadata, timeoutMs)) {
      throw new Error('Dashboard startup instance could not be verified');
    }
    // Revalidate the state path before publishing connection metadata.
    if (store.read().id !== initial.id) throw new Error('Run changed during dashboard startup');
    persistMetadata(marker, metadata);
    if (child.connected) child.disconnect();
    child.unref();
    committed = true;
    return publicConnection(metadata, false);
  } finally {
    if (!committed && child) await stopOwnChild(child);
    fs.rmdirSync(lock);
  }
}

module.exports = { openDashboard };
