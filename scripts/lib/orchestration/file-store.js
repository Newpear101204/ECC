'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { createRun, apply, validateState } = require('./model');

const MAX_BYTES = 4 * 1024 * 1024;

function info(file) {
  try { return fs.lstatSync(file); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}

function validatePath(file, createParents = false) {
  const root = path.parse(file).root;
  const parts = file.slice(root.length).split(path.sep).filter(Boolean);
  let current = root;
  for (let i = 0; i < parts.length; i += 1) {
    current = path.join(current, parts[i]);
    let stat = info(current);
    if (stat && stat.isSymbolicLink()) throw new Error('Unsafe state path: symlink is not allowed');
    if (i < parts.length - 1) {
      if (!stat && createParents) {
        try { fs.mkdirSync(current, { mode: 0o700 }); }
        catch (error) { if (error.code !== 'EEXIST') throw error; }
        stat = info(current);
      }
      if (stat && (!stat.isDirectory() || stat.isSymbolicLink())) throw new Error('Unsafe state ancestor: expected directory');
    } else if (stat && (!stat.isFile() || stat.nlink !== 1)) {
      throw new Error('Unsafe state target: expected regular unlinked file');
    }
  }
}

function createFileStore(filePath) {
  if (typeof filePath !== 'string' || !filePath.trim() || filePath.includes('\0') ||
      !/\.json$/i.test(filePath)) throw new Error('Explicit .json state file path required; database paths are not supported');
  const file = path.resolve(filePath);
  const lock = `${file}.lock`;

  function read() {
    validatePath(file);
    const stat = fs.statSync(file);
    if (stat.size > MAX_BYTES) throw new Error('State file exceeds size limit');
    const buffer = fs.readFileSync(file);
    if (buffer.length > MAX_BYTES) throw new Error('State file exceeds size limit');
    let state;
    try { state = JSON.parse(buffer.toString('utf8')); }
    catch (_error) { throw new Error('Invalid orchestration state JSON'); }
    validateState(state);
    return state;
  }

  function write(state) {
    validateState(state);
    validatePath(file);
    const data = JSON.stringify(state, null, 2) + '\n';
    if (Buffer.byteLength(data) > MAX_BYTES) throw new Error('State file exceeds size limit');
    const temporary = path.join(path.dirname(file), `.${path.basename(file)}.${crypto.randomUUID()}.tmp`);
    let created = false;
    try {
      fs.writeFileSync(temporary, data, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
      created = true;
      // The destination is rechecked after writing so known unsafe targets fail closed.
      validatePath(file);
      fs.renameSync(temporary, file);
      created = false;
    } finally {
      if (created) fs.unlinkSync(temporary);
    }
  }

  function locked(callback) {
    validatePath(file, true);
    try { fs.mkdirSync(lock, { mode: 0o700 }); }
    catch (error) {
      if (error.code === 'EEXIST') {
        const busy = new Error('Orchestration state is busy: lock exists; inspect owner before recovery');
        busy.code = 'ORCHESTRATION_BUSY';
        throw busy;
      }
      throw error;
    }
    try { return callback(); }
    finally { fs.rmdirSync(lock); }
  }

  return {
    path: file,
    init(plan) {
      return locked(() => {
        if (info(file)) throw new Error('State file already exists; initialization never overwrites');
        const state = createRun(plan);
        write(state);
        return state;
      });
    },
    read,
    dispatch(command) {
      return locked(() => {
        const state = apply(read(), command);
        write(state);
        return state;
      });
    }
  };
}

module.exports = { createFileStore, MAX_BYTES };
