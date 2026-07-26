import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, rmSync, appendFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { compareSemver } from '../scripts/lib/semver.mjs';
import { parseFrontmatter } from '../scripts/lib/frontmatter.mjs';
import { validate } from '../scripts/lib/schema.mjs';
import { stripNonProse } from '../scripts/lib/markdown.mjs';
import { findSecrets, looksLikeCredential } from '../scripts/lib/secrets.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCRIPTS = path.resolve(HERE, '..', 'scripts');
const fixture = (name) => path.join(HERE, 'fixtures', name);

function runScript(script, root, ...extra) {
  try {
    const stdout = execFileSync('node', [path.join(SCRIPTS, script), '--root', root, ...extra], {
      encoding: 'utf8',
    });
    return { code: 0, output: stdout };
  } catch (error) {
    return { code: error.status ?? 1, output: `${error.stdout ?? ''}${error.stderr ?? ''}` };
  }
}

/** A throwaway copy, so tests that mutate a tree never touch the committed fixtures. */
function copyFixture(name) {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'gpk-'));
  cpSync(fixture(name), dir, { recursive: true });
  test.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}

test('valid fixture passes every check', () => {
  for (const script of [
    'sync-manifests.mjs',
    'check-portability.mjs',
    'check-links.mjs',
    'check-security.mjs',
  ]) {
    const args = script === 'sync-manifests.mjs' ? ['--check'] : [];
    const result = runScript(script, fixture('valid'), ...args);
    assert.equal(result.code, 0, `${script} failed:\n${result.output}`);
  }
});

test('schema violations are reported with a path, not as a TypeError', () => {
  const result = runScript('sync-manifests.mjs', fixture('invalid-meta'), '--check');
  assert.equal(result.code, 1);
  assert.match(result.output, /plugins\/broken-plugin\/plugin\.meta\.json/);
  assert.match(result.output, /unknown property "keyword"/);
  assert.match(result.output, /missing required property "components"/);
  assert.match(result.output, /version/);
  assert.doesNotMatch(result.output, /Cannot destructure/);
});

test('a hand-edited generated manifest is caught as drift', () => {
  const root = copyFixture('valid');
  const generated = path.join(root, 'plugins/demo-plugin/.claude-plugin/plugin.json');

  assert.equal(runScript('sync-manifests.mjs', root, '--check').code, 0);

  appendFileSync(generated, '\n');
  let result = runScript('sync-manifests.mjs', root, '--check');
  assert.equal(result.code, 1);
  assert.match(result.output, /generated file is out of date/);

  rmSync(generated);
  result = runScript('sync-manifests.mjs', root, '--check');
  assert.equal(result.code, 1);
  assert.match(result.output, /generated file is missing/);
});

test('non-portable frontmatter is rejected and the owning agent is named', () => {
  const result = runScript('check-portability.mjs', fixture('invalid-frontmatter'));
  assert.equal(result.code, 1);
  assert.match(result.output, /allowed-tools/);
  assert.match(result.output, /Claude Code/);
  assert.match(result.output, /folded-skill.*block or empty value/s);
});

test('skills on disk are gated even when components.skills is undeclared', () => {
  const result = runScript('check-portability.mjs', fixture('undeclared-skills'));
  assert.equal(result.code, 1);
  assert.match(result.output, /components\.skills is not declared/);
  assert.match(result.output, /frontmatter key "model"/);
});

test('one malformed manifest names its plugin and does not abort the run', () => {
  const result = runScript('check-portability.mjs', fixture('invalid-json'));
  assert.equal(result.code, 1);
  assert.match(result.output, /plugins\/aaa-broken\/plugin\.meta\.json: not valid JSON/);
  assert.match(result.output, /wrong-name/, 'the plugin sorted after it must still be checked');
});

test('literal credentials are rejected, including positional ones and inside __fixtures__', () => {
  const result = runScript('check-security.mjs', fixture('invalid-security'));
  assert.equal(result.code, 1);
  assert.match(result.output, /EXAMPLE_API_KEY/);
  assert.match(result.output, /--api-key/);
  assert.match(result.output, /__fixtures__\/setup\.sh: machine-specific absolute path/);
});

test('credential shapes are recognized wherever they appear', () => {
  // Assembled at runtime so no committed file carries a token-shaped literal.
  const token = `${'s'}k-live-${'a'.repeat(20)}`;
  assert.equal(looksLikeCredential(token), true);
  assert.equal(looksLikeCredential('npx'), false);

  const problems = findSecrets({ servers: { demo: { env: { PLAIN_SETTING: token } } } });
  assert.equal(problems.length, 1);
  assert.match(problems[0], /looks like a live credential/);

  assert.deepEqual(findSecrets({ env: { API_KEY: '${DEMO_KEY}' } }), []);
  assert.equal(findSecrets({ env: { API_KEY: 'literal' } }).length, 1);
});

test('markdown scanning ignores fences, code spans and HTML comments', () => {
  const stripped = stripNonProse(
    ['before', '```markdown', '[x](./nope.md)', '```', '`[y](./nope.md)`', '<!-- [z](./nope.md) -->', 'after'].join(
      '\n',
    ),
  );
  assert.doesNotMatch(stripped, /nope\.md/);
  assert.match(stripped, /before/);
  assert.match(stripped, /after/);
  assert.equal(stripped.split('\n').length, 7, 'line numbers must survive stripping');
});

test('frontmatter parser reports list and nested values as unsupported', () => {
  const parsed = parseFrontmatter(['---', 'name: x', 'tools:', '  - Read', '---', 'body'].join('\n'));
  assert.equal(parsed.fields.name, 'x');
  assert.equal(parsed.unsupported.length, 2);
});

test('frontmatter parser strips quotes and ignores comments', () => {
  const parsed = parseFrontmatter(['---', '# note', 'name: "quoted"', '---', ''].join('\n'));
  assert.equal(parsed.fields.name, 'quoted');
  assert.equal(parsed.unsupported.length, 0);
});

test('frontmatter parser flags every block scalar indicator', () => {
  for (const indicator of ['>', '|', '>-', '|-', '>+', '|2-']) {
    const parsed = parseFrontmatter(['---', `description: ${indicator}`, '  text', '---'].join('\n'));
    assert.equal(parsed.fields.description, undefined, `${indicator} was parsed as a value`);
    assert.equal(parsed.unsupported[0].reason, 'block or empty value');
  }
});

test('schema validator enforces the constructs the manifests rely on', () => {
  const schema = {
    type: 'object',
    additionalProperties: false,
    required: ['name'],
    properties: {
      name: { type: 'string', pattern: '^[a-z-]+$' },
      tags: { type: 'array', items: { type: 'string' }, uniqueItems: true },
      config: { type: 'object', minProperties: 1 },
    },
  };
  assert.deepEqual(validate(schema, { name: 'ok', tags: ['a', 'b'] }), []);
  assert.equal(validate(schema, {}).length, 1);
  assert.equal(validate(schema, { name: 'Bad' }).length, 1);
  assert.equal(validate(schema, { name: 'ok', extra: 1 }).length, 1);
  assert.equal(validate(schema, { name: 'ok', tags: ['a', 'a'] }).length, 1);
  assert.equal(validate(schema, { name: 'ok', config: {} }).length, 1);
});

test('an unimplemented schema keyword throws instead of passing silently', () => {
  assert.throws(
    () => validate({ type: 'object', properties: { a: { anyOf: [] } } }, { a: 1 }),
    /does not implement/,
  );
});

test('semver comparison follows precedence rules for prereleases', () => {
  assert.equal(compareSemver('1.0.1', '1.0.0'), 1);
  assert.equal(compareSemver('1.0.0', '1.0.0'), 0);
  assert.equal(compareSemver('0.9.9', '1.0.0'), -1);
  assert.equal(compareSemver('1.0.0', '1.0.0-rc.1'), 1);
  assert.equal(compareSemver('1.0.0-rc.1', '1.0.0'), -1);
  // Numeric identifiers compare numerically, so rc.10 outranks rc.9.
  assert.equal(compareSemver('1.0.0-rc.10', '1.0.0-rc.9'), 1);
  assert.equal(compareSemver('1.0.0-rc.2', '1.0.0-rc.10'), -1);
  // Numeric ranks below alphanumeric; a longer identifier list wins ties.
  assert.equal(compareSemver('1.0.0-1', '1.0.0-alpha'), -1);
  assert.equal(compareSemver('1.0.0-alpha.1', '1.0.0-alpha'), 1);
  // Build metadata never affects precedence.
  assert.equal(compareSemver('1.0.0+b2', '1.0.0+b1'), 0);
  assert.throws(() => compareSemver('1.0.0.5', '1.0.0'), /unparseable/);
});
