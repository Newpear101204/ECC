'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const yaml = require('js-yaml');
const { setupPersonalEcc } = require('../setup');

test('current personal profile exposes both entry points and keeps existing skills in an isolated install', t => {
  const repoRoot = path.resolve(__dirname, '../..');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ecc-entrypoint-install-'));
  t.after(() => {
    assert.equal(path.dirname(path.resolve(root)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(root).startsWith('ecc-entrypoint-install-'));
    fs.rmSync(root, { recursive: true, force: true });
  });
  const options = { repoRoot, codexHome: path.join(root, 'codex'), skillsDir: path.join(root, 'skills') };
  const preview = setupPersonalEcc({ ...options, dryRun: true });
  assert.ok(preview.skills.includes('ecc-work'));
  assert.ok(preview.skills.includes('ecc-view'));
  assert.ok(preview.skills.includes('bug-fix'));
  assert.equal(fs.existsSync(options.codexHome), false);
  const installed = setupPersonalEcc(options);
  assert.deepEqual(installed.skills, preview.skills);
  for (const name of ['ecc-work', 'ecc-view']) {
    const source = path.join(repoRoot, 'personal-ecc/skills', name);
    const destination = path.join(options.skillsDir, name);
    assert.equal(fs.realpathSync(destination), fs.realpathSync(source));
    const body = fs.readFileSync(path.join(destination, 'SKILL.md'), 'utf8');
    const frontmatter = yaml.load(body.match(/^---\r?\n([\s\S]*?)\r?\n---/)[1]);
    assert.equal(frontmatter.name, name);
    assert.equal(typeof frontmatter.description, 'string');
    const metadata = yaml.load(fs.readFileSync(path.join(destination, 'agents/openai.yaml'), 'utf8'));
    assert.ok(metadata.interface.default_prompt.includes(`$${name}`));
    assert.ok(metadata.interface.short_description.length >= 25 && metadata.interface.short_description.length <= 64);
    assert.notEqual(metadata.policy?.allow_implicit_invocation, false);
  }
  assert.equal(setupPersonalEcc(options).changed, false);
});
