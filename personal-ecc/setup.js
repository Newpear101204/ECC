#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { randomUUID } = require('node:crypto');

const START = '<!-- BEGIN ECC PROJECT RULES -->';
const END = '<!-- END ECC PROJECT RULES -->';
const DEFAULT_REPO = path.resolve(__dirname, '..');

function stat(file) {
  try { return fs.lstatSync(file); } catch (error) {
    if (error.code === 'ENOENT') return undefined;
    throw error;
  }
}

function contained(root, file) {
  const relative = path.relative(root, file);
  return relative !== '' && !relative.startsWith('..' + path.sep) &&
    relative !== '..' && !path.isAbsolute(relative);
}

function requireFile(file) {
  if (!stat(file)?.isFile()) throw new Error(`Required regular file missing: ${file}`);
}

function readProfile(repoRoot) {
  const profileFile = path.join(repoRoot, 'personal-ecc/profile.json');
  requireFile(profileFile);
  const profile = JSON.parse(fs.readFileSync(profileFile, 'utf8'));
  if (profile.version !== 1 || !Array.isArray(profile.skills) || !profile.skills.length ||
      profile.skills.some(name => typeof name !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)) ||
      new Set(profile.skills).size !== profile.skills.length) {
    throw new Error('Invalid personal profile: version 1 and unique lowercase skill names required.');
  }
  requireFile(path.join(repoRoot, 'personal-ecc/instructions.md'));
  if (!stat(path.join(repoRoot, 'rules/common'))?.isDirectory()) {
    throw new Error('Shared rules/common directory missing.');
  }
  return profile.skills.map(name => {
    const source = path.join(repoRoot, 'personal-ecc/skills', name);
    requireFile(path.join(source, 'SKILL.md'));
    if (!contained(path.join(repoRoot, 'personal-ecc/skills'), fs.realpathSync(source))) {
      throw new Error(`Skill source escapes the checkout: ${name}`);
    }
    return { name, source };
  });
}

function mergeInstructions(original, repoRoot) {
  const text = original.toString('utf8');
  if (!Buffer.from(text).equals(original)) throw new Error('Global AGENTS.md must be valid UTF-8.');
  const start = text.indexOf(START);
  const end = text.indexOf(END);
  if ((start < 0) !== (end < 0) || (start >= 0 &&
      (end < start || text.indexOf(START, start + START.length) >= 0 ||
       text.indexOf(END, end + END.length) >= 0))) {
    throw new Error('Malformed or duplicate ECC PROJECT RULES markers in global AGENTS.md.');
  }
  const root = repoRoot.split(path.sep).join('/');
  if (/[`\r\n]/.test(root)) throw new Error('Checkout path cannot contain backticks or newlines.');
  const block = [START, '## Personal ECC Bootstrap', '',
    `Shared ECC checkout root: \`${root}\`. Shared rules: \`${root}/rules\`.`,
    'At the beginning of every session, before substantive work, read and follow',
    `\`${root}/personal-ecc/instructions.md\` without waiting for a reminder.`,
    'Resolve its ECC-relative paths against the checkout root above, not the working project.',
    'Read the current file from disk; do not substitute a cached copy of these instructions.',
    'Explicit user instructions and applicable project instructions take precedence.',
    'If this checkout cannot be read, report the limitation; do not claim its rules were applied.',
    END].join('\n');
  return start < 0
    ? Buffer.concat([original, Buffer.from((original.length ? '\n\n' : '') + block + '\n')])
    : Buffer.from(text.slice(0, start) + block + text.slice(end + END.length));
}

function linkMatches(destination, source) {
  if (!stat(destination)?.isSymbolicLink()) return false;
  try { return fs.realpathSync(destination) === fs.realpathSync(source); } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

function inspectTargets(skills, skillsDir, codexHome, replaceExisting) {
  const links = skills.map(skill => ({ ...skill, destination: path.join(skillsDir, skill.name) }))
    .filter(skill => !linkMatches(skill.destination, skill.source));
  // Retire copies made by the earlier machine-local installer when moving to the
  // native user skill directory. Back them up instead of leaving stale duplicates.
  const legacyRoot = path.join(codexHome, 'skills');
  const legacy = path.resolve(legacyRoot) === skillsDir ? [] : skills
    .map(skill => ({ ...skill, destination: path.join(legacyRoot, skill.name), retire: true }))
    .filter(skill => stat(skill.destination));
  const targets = [...links, ...legacy];
  for (const target of targets) {
    if (stat(target.destination) && !replaceExisting) {
      throw new Error(`Existing skill requires --replace-existing (a backup will be kept): ${target.destination}`);
    }
  }
  return targets;
}

function assertWritableLayout(codexHome, skillsDir) {
  for (const directory of [codexHome, skillsDir, path.join(codexHome, 'skills'),
    path.join(codexHome, 'ecc-personal-backups')]) {
    const info = stat(directory);
    if (info && (!info.isDirectory() || info.isSymbolicLink())) {
      throw new Error(`Expected a real directory, not a symlink: ${directory}`);
    }
  }
  if (stat(path.join(codexHome, 'AGENTS.override.md'))) {
    throw new Error('Global AGENTS.override.md exists; resolve its precedence before installing.');
  }
  const agents = stat(path.join(codexHome, 'AGENTS.md'));
  if (agents && (!agents.isFile() || agents.isSymbolicLink())) {
    throw new Error('Global AGENTS.md must be a regular file.');
  }
}

function applySetup({ codexHome, skillsDir, agentsFile, original, next, targets }) {
  fs.mkdirSync(codexHome, { recursive: true });
  fs.mkdirSync(skillsDir, { recursive: true });
  const backupRoot = path.join(codexHome, 'ecc-personal-backups');
  fs.mkdirSync(backupRoot, { recursive: true });
  const backupDir = fs.mkdtempSync(path.join(backupRoot, 'setup-'));
  const previousAgents = stat(agentsFile) ? path.join(backupDir, 'AGENTS.md') : undefined;
  if (previousAgents) fs.copyFileSync(agentsFile, previousAgents);
  let journal = [];
  const temporary = path.join(codexHome, `.ecc-personal-${randomUUID()}.tmp`);
  try {
    for (const [index, target] of targets.entries()) {
      const existed = Boolean(stat(target.destination));
      const backup = path.join(backupDir, `${index}-${target.name}`);
      const expectedRoot = target.retire ? path.join(codexHome, 'skills') : skillsDir;
      if (!contained(expectedRoot, target.destination) || !contained(backupDir, backup)) {
        throw new Error('Refusing to move a skill outside the intended directories.');
      }
      if (existed) fs.renameSync(target.destination, backup);
      journal = [...journal, { ...target, backup, existed }];
      if (!target.retire) fs.symlinkSync(target.source, target.destination,
        process.platform === 'win32' ? 'junction' : 'dir');
    }
    if (!next.equals(original)) {
      fs.writeFileSync(temporary, next, { flag: 'wx' });
      fs.renameSync(temporary, agentsFile);
    }
  } catch (error) {
    let rollbackErrors = [];
    for (const item of [...journal].reverse()) {
      try {
        // unlink removes only the newly created link, never the source tree.
        if (!item.retire && stat(item.destination)?.isSymbolicLink()) fs.unlinkSync(item.destination);
        if (item.existed) fs.renameSync(item.backup, item.destination);
      } catch (rollbackError) { rollbackErrors = [...rollbackErrors, rollbackError.message]; }
    }
    if (stat(temporary)) fs.unlinkSync(temporary);
    throw new Error(`${error.message}${rollbackErrors.length ? '; rollback errors: ' + rollbackErrors.join('; ') : ''}. Backup: ${backupDir}`);
  }
  return backupDir;
}

/** Link selected personal skills and install a pointer to live checkout instructions. */
function setupPersonalEcc(options = {}) {
  const repoRoot = fs.realpathSync(path.resolve(options.repoRoot || DEFAULT_REPO));
  const codexHome = path.resolve(options.codexHome || process.env.CODEX_HOME || path.join(os.homedir(), '.codex'));
  const skillsDir = path.resolve(options.skillsDir || path.join(os.homedir(), '.agents/skills'));
  if (contained(repoRoot, codexHome) || contained(repoRoot, skillsDir) ||
      contained(codexHome, repoRoot) || contained(skillsDir, repoRoot) ||
      repoRoot === codexHome || repoRoot === skillsDir || skillsDir === codexHome ||
      contained(skillsDir, codexHome) ||
      (contained(codexHome, skillsDir) && skillsDir !== path.join(codexHome, 'skills'))) {
    throw new Error('Install destinations must be outside the ECC checkout and must not overlap.');
  }
  assertWritableLayout(codexHome, skillsDir);
  const skills = readProfile(repoRoot);
  const agentsFile = path.join(codexHome, 'AGENTS.md');
  const original = stat(agentsFile) ? fs.readFileSync(agentsFile) : Buffer.alloc(0);
  const next = mergeInstructions(original, repoRoot);
  const targets = inspectTargets(skills, skillsDir, codexHome, options.replaceExisting);
  const changed = targets.length > 0 || !next.equals(original);
  const backupDir = changed && !options.dryRun
    ? applySetup({ codexHome, skillsDir, agentsFile, original, next, targets }) : undefined;
  return { changed, skills: skills.map(skill => skill.name), backupDir, repoRoot, codexHome, skillsDir };
}

function main(args = process.argv.slice(2)) {
  if (args.includes('--help')) {
    process.stdout.write('Usage: node personal-ecc/setup.js [--dry-run] [--replace-existing] [--codex-home PATH] [--skills-dir PATH]\n');
    return;
  }
  let options = {};
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--dry-run') options = { ...options, dryRun: true };
    else if (arg === '--replace-existing') options = { ...options, replaceExisting: true };
    else if (arg === '--codex-home' || arg === '--skills-dir') {
      const value = args[index + 1];
      if (!value || value.startsWith('--')) throw new Error(`Missing path for ${arg}`);
      options = { ...options, [arg === '--codex-home' ? 'codexHome' : 'skillsDir']: value };
      index += 1;
    } else throw new Error(`Unknown argument: ${arg}`);
  }
  const result = setupPersonalEcc(options);
  process.stdout.write(`${options.dryRun ? 'Preview' : 'Personal ECC setup'}: ${result.changed ? 'changes ' + (options.dryRun ? 'planned' : 'applied') : 'already current'}\n` +
    `Checkout: ${result.repoRoot}\nSkills: ${result.skills.join(', ')}\nSkill directory: ${result.skillsDir}\n` +
    (result.backupDir ? `Backup: ${result.backupDir}\n` : '') + 'Start a new Codex session to use the current profile.\n');
}

if (require.main === module) {
  try { main(); } catch (error) {
    process.stderr.write(`Personal ECC setup failed: ${error.message}\n`);
    process.exitCode = 1;
  }
}

module.exports = { setupPersonalEcc, mergeInstructions, main };
