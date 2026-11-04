'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { test } = require('node:test');
const { setupPersonalEcc, mergeInstructions } = require('../setup');

const script = path.resolve(__dirname, '../setup.js');
const start = '<!-- BEGIN ECC PROJECT RULES -->';
const end = '<!-- END ECC PROJECT RULES -->';
const names = ['ecc-plan', 'ecc-project-rules'];

function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

function createRepo(repoRoot, selected = names) {
  write(path.join(repoRoot, 'personal-ecc/setup.js'), fs.readFileSync(script));
  write(path.join(repoRoot, 'personal-ecc/profile.json'), JSON.stringify({
    version: 1,
    skills: selected,
  }));
  write(path.join(repoRoot, 'personal-ecc/instructions.md'), '# Personal workflow\nUse shared ECC rules.\n');
  write(path.join(repoRoot, 'rules/common/coding-style.md'), '# Shared coding style\n');
  for (const name of names) {
    write(path.join(repoRoot, 'personal-ecc/skills', name, 'SKILL.md'),
      `---\nname: ${name}\ndescription: Test skill for ${name}.\n---\n# ${name}\n`);
    write(path.join(repoRoot, 'personal-ecc/skills', name, 'agents/openai.yaml'),
      `interface:\n  display_name: "${name}"\n  short_description: "A test skill with sufficient description length"\n  default_prompt: "Use $${name} for this task."\n`);
  }
}

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ecc personal setup '));
  const repoRoot = path.join(root, 'ECC checkout with spaces');
  const codexHome = path.join(root, 'codex home');
  const skillsDir = path.join(root, 'user skills');
  createRepo(repoRoot);
  t.after(() => {
    const resolved = path.resolve(root);
    assert.equal(path.dirname(resolved), path.resolve(os.tmpdir()));
    assert.ok(path.basename(resolved).startsWith('ecc personal setup '));
    fs.rmSync(resolved, { recursive: true, force: true });
  });
  return { root, repoRoot, codexHome, skillsDir };
}

function readAgents(context) {
  return fs.readFileSync(path.join(context.codexHome, 'AGENTS.md'), 'utf8');
}

function backupContains(directory, expected) {
  return fs.readdirSync(directory, { withFileTypes: true }).some(entry => {
    const file = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) return false;
    return entry.isDirectory() ? backupContains(file, expected) : fs.readFileSync(file, 'utf8') === expected;
  });
}

function directoryLink(source, destination) {
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.symlinkSync(source, destination, process.platform === 'win32' ? 'junction' : 'dir');
}

test('fresh setup links selected skills and points the bootstrap at the checkout', t => {
  const context = fixture(t);
  const result = setupPersonalEcc(context);
  assert.ok(result.changed);
  assert.deepEqual([...result.skills].sort(), [...names].sort());
  for (const name of names) {
    const installed = path.join(context.skillsDir, name);
    assert.ok(fs.lstatSync(installed).isSymbolicLink());
    assert.equal(fs.realpathSync(installed), fs.realpathSync(path.join(context.repoRoot, 'personal-ecc/skills', name)));
  }
  const agents = readAgents(context).replaceAll('\\', '/');
  assert.ok(agents.includes(path.join(context.repoRoot, 'personal-ecc/instructions.md').replaceAll('\\', '/')));
  assert.ok(agents.includes(path.join(context.repoRoot, 'rules').replaceAll('\\', '/')));
  assert.equal(agents.split(start).length, 2);
  assert.equal(agents.split(end).length, 2);
});

test('repeated setup is idempotent and source edits remain visible through installed skills', t => {
  const context = fixture(t);
  setupPersonalEcc(context);
  const initial = fs.readFileSync(path.join(context.codexHome, 'AGENTS.md'));
  const result = setupPersonalEcc(context);
  assert.equal(result.changed, false);
  assert.ok(initial.equals(fs.readFileSync(path.join(context.codexHome, 'AGENTS.md'))));
  const source = path.join(context.repoRoot, 'personal-ecc/skills/ecc-plan/SKILL.md');
  fs.appendFileSync(source, '\nAn updated planning convention.\n');
  assert.equal(fs.readFileSync(path.join(context.skillsDir, 'ecc-plan/SKILL.md'), 'utf8'), fs.readFileSync(source, 'utf8'));
});

test('existing user instructions keep BOM, Unicode, CRLF, and all bytes before the appended block', t => {
  const context = fixture(t);
  const original = Buffer.from('\uFEFF# Personal instructions\r\nGi\u1eef nguy\u00ean c\u1ea5u h\u00ecnh Telegram.\r\n');
  write(path.join(context.codexHome, 'AGENTS.md'), original);
  setupPersonalEcc(context);
  const actual = fs.readFileSync(path.join(context.codexHome, 'AGENTS.md'));
  assert.ok(actual.subarray(0, original.length).equals(original));
});

test('updating a managed block preserves surrounding personal instructions', t => {
  const context = fixture(t);
  const prefix = '\uFEFFKeep Telegram guidance.\r\n';
  const suffix = '\r\nGi\u1eef nguy\u00ean ph\u1ea7n cu\u1ed1i.\r\n';
  write(path.join(context.codexHome, 'AGENTS.md'), `${prefix}${start}\nOld machine path\n${end}${suffix}`);
  setupPersonalEcc(context);
  const actual = readAgents(context);
  assert.ok(actual.startsWith(prefix));
  assert.ok(actual.endsWith(suffix));
  assert.ok(!actual.includes('Old machine path'));
});

test('relocation can rebind links while preserving the previous installation in a backup', t => {
  const context = fixture(t);
  setupPersonalEcc(context);
  const relocated = path.join(context.root, 'Another ECC location');
  createRepo(relocated);
  const result = setupPersonalEcc({ ...context, repoRoot: relocated, replaceExisting: true });
  assert.ok(result.changed);
  assert.ok(result.backupDir && fs.existsSync(result.backupDir));
  assert.equal(fs.realpathSync(path.join(context.skillsDir, 'ecc-plan')), fs.realpathSync(path.join(relocated, 'personal-ecc/skills/ecc-plan')));
  assert.ok(readAgents(context).replaceAll('\\', '/').includes(relocated.replaceAll('\\', '/')));
});

test('dry run validates and previews setup without creating destination files', t => {
  const context = fixture(t);
  setupPersonalEcc({ ...context, dryRun: true });
  assert.equal(fs.existsSync(context.codexHome), false);
  assert.equal(fs.existsSync(context.skillsDir), false);
});

test('a conflicting personal skill fails before touching other destinations', t => {
  const context = fixture(t);
  const original = 'My custom skill must survive.\n';
  write(path.join(context.skillsDir, 'ecc-project-rules/SKILL.md'), original);
  assert.throws(() => setupPersonalEcc(context), /exist|conflict|replace/i);
  assert.equal(fs.existsSync(context.codexHome), false);
  assert.equal(fs.existsSync(path.join(context.skillsDir, 'ecc-plan')), false);
  assert.equal(fs.readFileSync(path.join(context.skillsDir, 'ecc-project-rules/SKILL.md'), 'utf8'), original);
});

test('explicit replacement backs up conflicting custom skill contents', t => {
  const context = fixture(t);
  const original = 'Custom content backed up rather than deleted.\n';
  write(path.join(context.skillsDir, 'ecc-plan/SKILL.md'), original);
  const result = setupPersonalEcc({ ...context, replaceExisting: true });
  assert.ok(result.backupDir && fs.existsSync(result.backupDir));
  assert.ok(backupContains(result.backupDir, original));
  assert.ok(fs.lstatSync(path.join(context.skillsDir, 'ecc-plan')).isSymbolicLink());
});

test('failed second link creation restores the first backed-up skill and original instructions', t => {
  const context = fixture(t);
  const customSkill = 'Personal planning skill before setup.\n';
  const originalAgents = Buffer.from('\uFEFFKeep existing global instructions.\r\n');
  write(path.join(context.skillsDir, 'ecc-plan/SKILL.md'), customSkill);
  write(path.join(context.codexHome, 'AGENTS.md'), originalAgents);
  const symlink = fs.symlinkSync;
  let attempts = 0;
  t.mock.method(fs, 'symlinkSync', (...args) => {
    attempts += 1;
    if (attempts === 2) throw new Error('Injected second link failure');
    return symlink(...args);
  });
  assert.throws(() => setupPersonalEcc({ ...context, replaceExisting: true }), /Injected second link failure/);
  assert.equal(attempts, 2);
  assert.equal(fs.lstatSync(path.join(context.skillsDir, 'ecc-plan')).isSymbolicLink(), false);
  assert.equal(fs.readFileSync(path.join(context.skillsDir, 'ecc-plan/SKILL.md'), 'utf8'), customSkill);
  assert.equal(fs.existsSync(path.join(context.skillsDir, 'ecc-project-rules')), false);
  assert.ok(fs.readFileSync(path.join(context.codexHome, 'AGENTS.md')).equals(originalAgents));
  assert.ok(fs.existsSync(path.join(context.repoRoot, 'personal-ecc/skills/ecc-plan/SKILL.md')));
});

test('legacy copied skills require consent then move into backup when using a different skill directory', t => {
  const context = fixture(t);
  const legacy = 'Earlier machine-local copy, preserved during migration.\n';
  write(path.join(context.codexHome, 'skills/ecc-project-rules/SKILL.md'), legacy);
  assert.throws(() => setupPersonalEcc(context), /replace|exist/i);
  assert.equal(fs.existsSync(context.skillsDir), false);
  const result = setupPersonalEcc({ ...context, replaceExisting: true });
  assert.ok(backupContains(result.backupDir, legacy));
  assert.equal(fs.existsSync(path.join(context.codexHome, 'skills/ecc-project-rules')), false);
  assert.ok(fs.lstatSync(path.join(context.skillsDir, 'ecc-project-rules')).isSymbolicLink());
});

test('the existing codexHome/skills layout remains supported without retiring its live links', t => {
  const context = fixture(t);
  const options = { ...context, skillsDir: path.join(context.codexHome, 'skills') };
  setupPersonalEcc(options);
  for (const name of names) {
    assert.ok(fs.lstatSync(path.join(options.skillsDir, name)).isSymbolicLink());
  }
  assert.equal(setupPersonalEcc(options).changed, false);
});

test('a skill source linked outside the checkout is rejected before destination writes', t => {
  const context = fixture(t);
  const source = path.join(context.repoRoot, 'personal-ecc/skills/ecc-plan');
  const outside = path.join(context.root, 'external skill');
  write(path.join(outside, 'SKILL.md'), '# External instructions\n');
  fs.renameSync(source, path.join(context.root, 'saved canonical skill'));
  directoryLink(outside, source);
  assert.throws(() => setupPersonalEcc(context), /escape|checkout/i);
  assert.equal(fs.existsSync(context.codexHome), false);
  assert.equal(fs.existsSync(context.skillsDir), false);
});

for (const target of ['AGENTS.md', 'skillsDir']) {
  test(`a symlinked ${target} destination is rejected without writing through it`, t => {
    const context = fixture(t);
    const outside = path.join(context.root, 'unrelated directory');
    fs.mkdirSync(outside);
    const destination = target === 'AGENTS.md' ? path.join(context.codexHome, 'AGENTS.md') : context.skillsDir;
    // Directory junctions also work without Windows file-symlink privileges.
    directoryLink(outside, destination);
    assert.throws(() => setupPersonalEcc(context), /regular file|symlink|directory/i);
    assert.deepEqual(fs.readdirSync(outside), []);
    assert.ok(fs.lstatSync(destination).isSymbolicLink());
    if (target === 'AGENTS.md') assert.equal(fs.existsSync(context.skillsDir), false);
    else assert.equal(fs.existsSync(context.codexHome), false);
  });
}

test('missing shared rules/common rejects installation before destination writes', t => {
  const context = fixture(t);
  fs.renameSync(path.join(context.repoRoot, 'rules/common'), path.join(context.repoRoot, 'rules/common-moved'));
  assert.throws(() => setupPersonalEcc(context), /rules|common/i);
  assert.equal(fs.existsSync(context.codexHome), false);
  assert.equal(fs.existsSync(context.skillsDir), false);
});

for (const profile of [{ version: 2, skills: names }, { version: 1, skills: 'ecc-plan' }]) {
  test(`unsupported profile shape rejects installation (${JSON.stringify(profile)})`, t => {
    const context = fixture(t);
    write(path.join(context.repoRoot, 'personal-ecc/profile.json'), JSON.stringify(profile));
    assert.throws(() => setupPersonalEcc(context), /profile|version/i);
    assert.equal(fs.existsSync(context.codexHome), false);
    assert.equal(fs.existsSync(context.skillsDir), false);
  });
}

for (const invalid of [start, end, `${end}\n${start}`, `${start}\n${start}\n${end}`, `${start}\n${end}\n${end}`]) {
  test(`malformed managed markers refuse mutation (${JSON.stringify(invalid)})`, t => {
    const context = fixture(t);
    write(path.join(context.codexHome, 'AGENTS.md'), invalid);
    assert.throws(() => setupPersonalEcc(context), /marker|managed|block/i);
    assert.equal(readAgents(context), invalid);
    assert.equal(fs.existsSync(context.skillsDir), false);
  });
}

test('a global override blocks setup because it would shadow AGENTS.md', t => {
  const context = fixture(t);
  write(path.join(context.codexHome, 'AGENTS.override.md'), '# Override\n');
  assert.throws(() => setupPersonalEcc(context), /override/i);
  assert.equal(fs.existsSync(path.join(context.codexHome, 'AGENTS.md')), false);
  assert.equal(fs.existsSync(context.skillsDir), false);
});

for (const skills of [['../outside'], ['ecc-plan', 'ecc-plan'], [''], ['/absolute']]) {
  test(`invalid or duplicate profile skill names are rejected (${JSON.stringify(skills)})`, t => {
    const context = fixture(t);
    createRepo(context.repoRoot, skills);
    assert.throws(() => setupPersonalEcc(context));
    assert.equal(fs.existsSync(context.codexHome), false);
    assert.equal(fs.existsSync(context.skillsDir), false);
  });
}

for (const missing of ['personal-ecc/instructions.md', 'personal-ecc/skills/ecc-plan/SKILL.md']) {
  test(`missing ${missing} is rejected before installation`, t => {
    const context = fixture(t);
    fs.unlinkSync(path.join(context.repoRoot, missing));
    assert.throws(() => setupPersonalEcc(context));
    assert.equal(fs.existsSync(context.codexHome), false);
    assert.equal(fs.existsSync(context.skillsDir), false);
  });
}

test('CLI installs from another cwd using explicit destination paths', t => {
  const context = fixture(t);
  const fixtureScript = path.join(context.repoRoot, 'personal-ecc/setup.js');
  const result = spawnSync(process.execPath, [fixtureScript, '--codex-home', context.codexHome, '--skills-dir', context.skillsDir], {
    cwd: context.root,
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.ok(fs.existsSync(path.join(context.codexHome, 'AGENTS.md')));
  assert.ok(fs.lstatSync(path.join(context.skillsDir, 'ecc-project-rules')).isSymbolicLink());
});

test('CLI honors CODEX_HOME while dry-run leaves it untouched', t => {
  const context = fixture(t);
  const fixtureScript = path.join(context.repoRoot, 'personal-ecc/setup.js');
  const result = spawnSync(process.execPath, [fixtureScript, '--skills-dir', context.skillsDir, '--dry-run'], {
    cwd: context.root,
    env: { ...process.env, CODEX_HOME: context.codexHome },
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(fs.existsSync(context.codexHome), false);
  assert.equal(fs.existsSync(context.skillsDir), false);
});

test('CLI help succeeds and unknown or incomplete arguments fail', () => {
  const help = spawnSync(process.execPath, [script, '--help'], { encoding: 'utf8' });
  assert.equal(help.status, 0, help.stderr);
  assert.match(help.stdout, /--dry-run/);
  assert.match(help.stdout, /node personal-ecc\/setup\.js/);
  for (const args of [['--unknown-option'], ['--codex-home'], ['--skills-dir']]) {
    const result = spawnSync(process.execPath, [script, ...args], { encoding: 'utf8' });
    assert.notEqual(result.status, 0);
  }
});


test('the bootstrap reads live personal instructions without reinstalling', t => {
  const context = fixture(t);
  setupPersonalEcc(context);
  const file = path.join(context.repoRoot, 'personal-ecc/instructions.md');
  const changed = '# Updated personal workflow\nUse current shared ECC rules.\n';
  fs.writeFileSync(file, changed);
  const agents = readAgents(context).replaceAll('\\', '/');
  assert.ok(agents.includes(file.replaceAll('\\', '/')));
  assert.equal(fs.readFileSync(file, 'utf8'), changed);
  assert.equal(setupPersonalEcc(context).changed, false);
});

test('invalid UTF-8 global instructions are refused without destination changes', t => {
  const context = fixture(t);
  const original = Buffer.from([0xff, 0xfe, 0x00]);
  write(path.join(context.codexHome, 'AGENTS.md'), original);
  assert.throws(() => setupPersonalEcc(context), /UTF-8/);
  assert.ok(fs.readFileSync(path.join(context.codexHome, 'AGENTS.md')).equals(original));
  assert.equal(fs.existsSync(context.skillsDir), false);
});

test('checkout paths containing Markdown delimiters cannot inject bootstrap instructions', () => {
  assert.throws(() => mergeInstructions(Buffer.alloc(0), 'checkout`with-delimiter'), /backtick|newline/i);
  assert.throws(() => mergeInstructions(Buffer.alloc(0), 'checkout\nwith-line'), /backtick|newline/i);
});

test('installing destinations inside the source checkout is refused', t => {
  const context = fixture(t);
  const codexHome = path.join(context.repoRoot, 'local-install');
  assert.throws(() => setupPersonalEcc({ ...context, codexHome }), /outside|overlap/i);
  assert.equal(fs.existsSync(codexHome), false);
  assert.equal(fs.existsSync(context.skillsDir), false);
});

test('dangling installed links require replacement and are backed up without touching the source', t => {
  const context = fixture(t);
  const removed = path.join(context.root, 'removed checkout');
  fs.mkdirSync(removed);
  directoryLink(removed, path.join(context.skillsDir, 'ecc-plan'));
  fs.rmdirSync(removed);
  assert.throws(() => setupPersonalEcc(context), /replace|exist/i);
  const result = setupPersonalEcc({ ...context, replaceExisting: true });
  assert.ok(result.backupDir);
  assert.equal(fs.realpathSync(path.join(context.skillsDir, 'ecc-plan')),
    fs.realpathSync(path.join(context.repoRoot, 'personal-ecc/skills/ecc-plan')));
});
