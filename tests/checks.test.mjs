import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, rmSync, appendFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { compareSemver } from '../scripts/lib/semver.mjs';
import { parseFrontmatter } from '../scripts/lib/frontmatter.mjs';
import { validate } from '../scripts/lib/schema.mjs';
import { linkPathVariants, linkTargets, stripNonProse } from '../scripts/lib/markdown.mjs';
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

test('marketplace plugin sources are paths Claude Code accepts', () => {
  // `source: "<name>"` passes every check in this repo and then fails at install
  // time with "plugins.0.source: Invalid input". Only a ./-relative path resolves.
  const catalog = JSON.parse(
    readFileSync(path.join(fixture('valid'), '.claude-plugin', 'marketplace.json'), 'utf8'),
  );
  for (const plugin of catalog.plugins) {
    assert.equal(
      plugin.source,
      `./plugins/${plugin.name}`,
      `plugin "${plugin.name}" has source "${plugin.source}"; Claude Code needs a ./-relative path`,
    );
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

test('an unquoted colon is rejected with the fix, not measured as if it loaded', () => {
  // The case that shipped: seven SKILL.md files passed every gate in this repo
  // and `claude plugin validate --strict` rejected all seven.
  const result = runScript('check-portability.mjs', fixture('invalid-frontmatter'));
  assert.equal(result.code, 1);

  const reported = result.output.split('\n').filter((line) => line.includes('colon-skill'));
  assert.equal(reported.length, 1, `one line, one error:\n${reported.join('\n')}`);
  assert.match(reported[0], /skills\/colon-skill\/SKILL\.md/, 'the file must be named');
  assert.match(reported[0], /frontmatter line 3: an unquoted value cannot contain ": "/);
  assert.match(reported[0], /loads with no metadata/, 'the consequence must be stated');
  assert.match(reported[0], /Quote it: description: '\.\.\.'/, 'the fix must be spelled out');
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

test('a bundled file no link reaches is reported; reachability is transitive and skill-local', () => {
  const result = runScript('check-links.mjs', fixture('orphan-reference'));
  assert.equal(result.code, 1);
  assert.match(result.output, /references\/orphan\.md: no link from SKILL\.md reaches this file/);
  assert.doesNotMatch(result.output, /linked\.md/, 'the directly linked reference is reachable');
  assert.doesNotMatch(result.output, /deep\.md/, 'a reference linked from a reference is reachable');
  // The fixture's own README links the orphan from outside the skill. Following
  // that would launder every file the repository mentions into the reachable set.
  assert.match(result.output, /1 problem/, 'a link from outside the skill must not count');
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

test('the link grammar sees every destination a reachable file can be named by', () => {
  // A miss here is not a skipped check: reachability reads the same grammar and
  // reports anything it cannot see as an orphan, so each of these would fail CI
  // on a file that is correctly linked.
  assert.deepEqual(
    linkTargets('[![thumb](assets/thumb.png)](references/linked.md)'),
    ['assets/thumb.png', 'references/linked.md'],
    'a nested destination must not be swallowed by the outer link',
  );
  assert.deepEqual(
    linkTargets('<img src="assets/logo.png"> and <a href="references/x.md">x</a>'),
    ['assets/logo.png', 'references/x.md'],
    'HTML is valid Markdown and carries real paths',
  );
  assert.deepEqual(linkTargets('[a](<references/with space.md>)'), ['references/with space.md']);
  assert.deepEqual(linkTargets('[a](https://example.org) [b](#anchor)'), [], 'external and anchor');
});

test('a percent-encoded destination resolves to the file it names', () => {
  assert.deepEqual(linkPathVariants('references/my%20file.md#frag'), [
    'references/my%20file.md',
    'references/my file.md',
  ]);
  assert.deepEqual(linkPathVariants('references/plain.md'), ['references/plain.md']);
  assert.deepEqual(
    linkPathVariants('references/100%.md'),
    ['references/100%.md'],
    'a malformed escape is a literal name, not an encoding',
  );
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

/**
 * Values a parser reads as something other than the text on the line, and
 * values it reads verbatim. REJECTED and ACCEPTED are the corpus the
 * differential test below replays against real parsers; the assertions here
 * pin the wording, which runs with no node_modules at all.
 */
const REJECTED = [
  ['Use when scaffolding on Maven: pom.xml layout', /cannot contain ": "/],
  ['Use when the build fails:', /cannot contain ": "/], // trailing ":" opens a nested map
  ['Use when fixing issue #27 today', /opens a comment/],
  ["'Don't scaffold: it breaks'", /text follows the closing '/], // quoting, gone wrong
  ["'Use when the quote never closes", /never closed/],
  ['"Use when it closes" and then keeps going', /text follows the closing "/],
  ['"Use when the report is at C:\\Users\\me"', /does not open a YAML escape/],
  ['"Use when matching \\d+ in the log"', /does not open a YAML escape/],
  ['@Use when the at sign opens the value', /cannot start with "@"/],
  ['* Use when a star opens the value', /cannot start with "\*"/],
  ['% Use when a percent opens the value', /cannot start with "%"/],
  ['`Use when a backtick opens the value', /cannot start with "`"/],
  ['- Use when a dash and a space open it', /cannot start with "-"/],
  ['? Use when a question mark opens it', /cannot start with "\?"/],
  ['|Use when a pipe opens the value', /cannot start with "\|"/],
  ['>Use when a chevron opens the value', /cannot start with ">"/],
  ['[Read, Grep]', /reads as a list/], // legal YAML, but not a string
  ['[Read, Grep', /reads as a list/],
  ['{tier: pro}', /reads as a map/],
  ['#1 choice for load tests', /reads as a comment/], // parsers read null
  ['&anchor Use when an anchor opens it', /reads as an anchor/],
  ['!tag Use when a tag opens the value', /reads as a tag/],
  [', Use when a comma opens the value', /depends on the agent/], // yaml throws, js-yaml keeps
];

const ACCEPTED = [
  'Use when the ratio is 3:15 and no space follows',
  'Use when the sources are C# and F# files',
  'Use when a path like a/b#c has no space before the hash',
  "'Use when scaffolding: quoted and safe'",
  '"Use when it\'s fine: double quoted"',
  "'Use when it''s fine: a doubled apostrophe'",
  '"Use when an escape \\" is legal"',
  "'Use when a comment follows the value' # kept under 1024",
  '"Use when a comment follows a double-quoted value" # note',
  'Use when nothing about the value is special',
  '-leading dash without a space is a plain string',
  '?leading question mark without a space is too',
  'Use when a colon:without a space is fine',
];

test('frontmatter parser flags every value YAML would not read as written', () => {
  const reasons = (value) =>
    parseFrontmatter(['---', `description: ${value}`, '---'].join('\n')).invalid.map((i) => i.reason);

  for (const [value, expected] of REJECTED) {
    const [first] = reasons(value);
    assert.ok(first, `not flagged: ${value}`);
    assert.match(first, expected, value);
  }

  // The other direction matters as much: over-rejecting would block a
  // legitimate description, so every accepted value is pinned too.
  for (const value of ACCEPTED) assert.deepEqual(reasons(value), [], value);
});

test('frontmatter parser decodes the value that loads, not the text on the line', () => {
  const read = (value) =>
    parseFrontmatter(['---', `description: ${value}`, '---'].join('\n')).fields.description;

  // check-portability measures length against this, so a doubled apostrophe and
  // an escape have to count once, the way the agent will see them.
  assert.equal(read("'It''s fine'"), "It's fine");
  assert.equal(read('"He said \\"hi\\""'), 'He said "hi"');
  assert.equal(read('"An em dash \\u2014 here"'), 'An em dash \u2014 here');
  assert.equal(read("'Use when quoted' # a comment"), 'Use when quoted');
  assert.equal(read('Use when plain'), 'Use when plain');
});

test('a rejected block is not measured, and a rejected value costs only its own key', () => {
  const skill = (frontmatter) => {
    const root = copyFixture('valid');
    const dir = path.join(root, 'plugins/demo-plugin/skills/demo-skill');
    writeFileSync(path.join(dir, 'SKILL.md'), `---\n${frontmatter}\n---\n\nBody.\n`);
    return runScript('check-portability.mjs', root).output;
  };

  // Fatal: a parser drops the block, so every field in it is gone. Reporting the
  // 1100-char description on top would be measuring text no agent ever sees.
  const long = `A${'x'.repeat(1100)}`;
  const fatal = skill(`name: broken: name\ndescription: ${long}`);
  assert.match(fatal, /an unquoted value cannot contain ": "/);
  assert.doesNotMatch(fatal, /keep it under/, 'a dropped block must not be measured');

  // Lossy: the block parses, so a bad description costs the description only —
  // the name still has to match its directory.
  const lossy = skill('name: wrong-name\ndescription: #1 choice');
  assert.match(lossy, /reads as a comment/);
  assert.match(lossy, /does not match directory "demo-skill"/, 'the readable key is still checked');
  assert.doesNotMatch(lossy, /capital letter/, 'the unreadable key is not measured');
});

test('frontmatter parser reports a repeated key instead of letting the last one win', () => {
  const parsed = parseFrontmatter(
    ['---', 'name: first', 'description: A description.', 'name: second', '---'].join('\n'),
  );
  // Both parsers throw on a duplicate mapping key and drop the block with it.
  assert.equal(parsed.invalid.length, 1);
  assert.equal(parsed.invalid[0].line, 4);
  assert.match(parsed.invalid[0].reason, /"name" is set twice/);
});

/**
 * The claim `scripts/lib/frontmatter.mjs` makes is that it reads a value the way
 * a YAML parser does. Here that is checked rather than asserted: every case in
 * the corpus is read by both real parsers, and the reader has to flag exactly
 * the values where at least one of them disagrees with what it recorded.
 *
 * Skipped when the packages are absent — the `manifests` CI job runs with no
 * `npm install` on purpose, so this runs in the `prose` job, which installs.
 */
test('every rule agrees with yaml and js-yaml, in both directions', async (t) => {
  // Both ship as ESM with named exports and as CJS behind a default; taking
  // whichever is present keeps a wrong guess from reading as a disagreement.
  // yaml goes through parseDocument on purpose: `parse` with `logLevel:
  // 'silent'` swallows the very errors this test exists to observe, and without
  // it an unknown tag prints a warning on every run. Errors are the signal;
  // warnings are not.
  const parsers = [];
  for (const [name, method, wrap] of [
    [
      'yaml',
      'parseDocument',
      (parseDocument) => (text) => {
        const doc = parseDocument(text);
        if (doc.errors.length > 0) throw doc.errors[0];
        return doc.toJS();
      },
    ],
    ['js-yaml', 'load', (load) => (text) => load(text)],
  ]) {
    try {
      const module = await import(name);
      const fn = module[method] ?? module.default?.[method];
      assert.equal(typeof fn, 'function', `${name} exposes no ${method}()`);
      parsers.push([name, wrap(fn)]);
    } catch (error) {
      if (error?.code !== 'ERR_MODULE_NOT_FOUND') throw error;
    }
  }

  if (parsers.length < 2) {
    return t.skip('yaml and js-yaml are not installed; run npm ci to check against them');
  }

  const THREW = Symbol('threw');
  for (const value of [...REJECTED.map(([v]) => v), ...ACCEPTED]) {
    const parsed = parseFrontmatter(['---', `description: ${value}`, '---'].join('\n'));
    const recorded = parsed.fields.description;

    const disagreed = parsers.filter(([, parse]) => {
      let read;
      try {
        read = parse(`description: ${value}\n`)?.description;
      } catch {
        read = THREW;
      }
      return read !== recorded;
    });

    if (disagreed.length === 0) {
      assert.deepEqual(parsed.invalid, [], `both parsers read ${value} as recorded, but it is flagged`);
    } else {
      const names = disagreed.map(([name]) => name).join(' and ');
      assert.ok(parsed.invalid.length > 0, `${names} disagree(s) about ${value}, but it is accepted`);
    }
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
