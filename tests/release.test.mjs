import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { chmodSync, cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { changelogSection } from '../scripts/lib/changelog.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCRIPTS = path.resolve(HERE, '..', 'scripts');
const DATE = '2026-07-30';

function runScript(script, root, extra = [], env = {}) {
  try {
    const stdout = execFileSync('node', [path.join(SCRIPTS, script), '--root', root, ...extra], {
      encoding: 'utf8',
      env: { ...process.env, ...env },
    });
    return { code: 0, output: stdout };
  } catch (error) {
    return { code: error.status ?? 1, output: `${error.stdout ?? ''}${error.stderr ?? ''}` };
  }
}

function tempDir() {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'gpk-release-'));
  test.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}

/**
 * A throwaway fixture copy with real history: the plan is a diff against the
 * previous release, so it needs commits. `-c` rather than `config` so nothing in
 * the developer's own gitconfig can reach the fixture: `gpgsign` on both commits
 * and tags (three tests tag), `core.hooksPath` for husky and friends, and
 * `core.excludesFile` because a global ignore of `plugins/` would make `git add
 * -A` silently commit a tree with no plugins. `--template=` is for the same
 * reason one level down — a template's `info/exclude` drops files from `add`.
 */
function gitFixture(name) {
  const root = tempDir();
  cpSync(path.join(HERE, 'fixtures', name), root, { recursive: true });
  const git = (...args) =>
    execFileSync(
      'git',
      [
        '-c',
        'user.name=Test',
        '-c',
        'user.email=test@example.com',
        '-c',
        'commit.gpgsign=false',
        '-c',
        'tag.gpgsign=false',
        '-c',
        'core.hooksPath=/dev/null',
        '-c',
        'core.excludesFile=/dev/null',
        ...args,
      ],
      { cwd: root, encoding: 'utf8', stdio: 'pipe' },
    );
  git('init', '-q', '--template=');
  git('add', '-A');
  git('commit', '-qm', 'fixture');
  return { root, git };
}

/** Bumps a plugin's version and lands the entry the release will quote. */
function bump(root, plugin, version, entry = `- Something in ${version}.`) {
  const metaFile = path.join(root, 'plugins', plugin, 'plugin.meta.json');
  const meta = JSON.parse(readFileSync(metaFile, 'utf8'));
  meta.version = version;
  writeFileSync(metaFile, `${JSON.stringify(meta, null, 2)}\n`);
  const changelog = path.join(root, 'plugins', plugin, 'CHANGELOG.md');
  const existing = readFileSync(changelog, 'utf8').replace(/^# Changelog\n+/, '');
  writeFileSync(changelog, `# Changelog\n\n## [${version}] - ${DATE}\n\n${entry}\n\n${existing}`);
}

function addPlugin(root, name, version) {
  const dir = path.join(root, 'plugins', name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, 'plugin.meta.json'), `${JSON.stringify({ name, version }, null, 2)}\n`);
  writeFileSync(path.join(dir, 'CHANGELOG.md'), `# Changelog\n\n## [${version}] - ${DATE}\n\n- First cut.\n`);
}

/**
 * A `gh` on PATH that records its calls, so the API-shaped behaviour — which
 * releases exist, and an API that will not answer — is driven rather than trusted.
 */
function fakeGh(dir, { existing = [], drafts = [], failApi = false } = {}) {
  const bin = path.join(dir, 'bin');
  mkdirSync(bin, { recursive: true });
  const log = path.join(dir, 'calls.log');
  const file = path.join(bin, 'gh');
  // The API answers tag and draft flag per release, newest first, as the real
  // `--jq` does. Kept in a file rather than inlined into the script: `printf` does
  // not expand `\t` or `\n` in its argument, so an inlined table is one long line.
  const table = path.join(dir, 'releases.tsv');
  writeFileSync(table, [...drafts.map((t) => `${t}\ttrue`), ...existing.map((t) => `${t}\tfalse`)].join('\n'));
  writeFileSync(
    file,
    `#!/bin/sh
echo "$@" >> ${JSON.stringify(log)}
if [ "$1 $2" = 'api --paginate' ]; then
  ${failApi ? 'echo "gh: HTTP 503" >&2; exit 1' : `cat ${JSON.stringify(table)}`}
fi
exit 0
`,
  );
  chmodSync(file, 0o755);
  return {
    bin,
    calls: () => {
      try {
        return readFileSync(log, 'utf8').trim().split('\n');
      } catch {
        return [];
      }
    },
  };
}

function release(root, options = {}, ...extra) {
  const gh = fakeGh(tempDir(), options);
  const result = runScript('release.mjs', root, ['--target', 'deadbeef', '--date', DATE, ...extra], {
    PATH: `${gh.bin}:${process.env.PATH}`,
  });
  return { ...result, created: gh.calls().filter((call) => call.startsWith('release create')) };
}

const CHANGELOG = `# Changelog

## [1.1.0] - 2026-07-28

### Added

- The thing.

## [1.0.0] - 2026-07-27

- The first thing.

[1.1.0]: https://example.com/compare/v1.0.0...v1.1.0
`;

test('release notes are one changelog section, without its heading or the next', () => {
  assert.equal(changelogSection(CHANGELOG, '1.1.0'), '### Added\n\n- The thing.');
  // Link-reference definitions belong to the document, not to its last release.
  assert.equal(changelogSection(CHANGELOG, '1.0.0'), '- The first thing.');
  assert.equal(changelogSection(CHANGELOG, '2.0.0'), null);
});

test('a version heading inside a fence neither opens nor closes a section', () => {
  const source = `## [2.0.0] - 2026-07-30

\`\`\`markdown
## [9.9.9] - 2026-01-01
\`\`\`

- Still 2.0.0.
`;
  assert.equal(changelogSection(source, '9.9.9'), null);
  assert.match(changelogSection(source, '2.0.0'), /Still 2\.0\.0\./);
});

test('the first release is the marketplace as it stands', () => {
  const { root } = gitFixture('valid');
  const result = release(root);

  assert.equal(result.code, 0, result.output);
  assert.equal(result.created.length, 1);
  assert.match(result.created[0], new RegExp(`^release create release-${DATE} --target deadbeef`));
  assert.match(result.created[0], /--title 2026-07-30 — demo-plugin 1\.0\.0/);
});

test('nothing moved since the last release means no release', () => {
  const { root, git } = gitFixture('valid');
  git('tag', `release-${DATE}`);

  const result = release(root, { existing: [`release-${DATE}`] });
  assert.equal(result.code, 0, result.output);
  assert.match(result.output, new RegExp(`nothing moved since release-${DATE}`));
  assert.equal(result.created.length, 0);
});

test('many plugins moving is still one release, one section each', () => {
  const { root, git } = gitFixture('valid');
  git('tag', 'release-2026-07-01');
  addPlugin(root, 'other-plugin', '2.0.0');
  bump(root, 'demo-plugin', '1.1.0', '- Demo grew.');

  const result = release(root, { existing: ['release-2026-07-01'] }, '--dry-run');
  assert.equal(result.code, 0, result.output);
  assert.match(result.output, new RegExp(`^release-${DATE}: ${DATE} — 2 plugins`));
  assert.match(result.output, /### demo-plugin 1\.1\.0\n\n- Demo grew\./);
  assert.match(result.output, /### other-plugin 2\.0\.0\n\n- First cut\./);
  // A plugin that did not move is not in a release that is not about it.
  assert.doesNotMatch(result.output, /1\.0\.0/);
});

test('a second release on one day gets its own tag', () => {
  const { root, git } = gitFixture('valid');
  git('tag', `release-${DATE}`);
  bump(root, 'demo-plugin', '1.1.0');

  const result = release(root, { existing: [`release-${DATE}`] });
  assert.equal(result.code, 0, result.output);
  assert.match(result.created[0], new RegExp(`release create release-${DATE}\\.2 `));
});

test('a draft reserves its tag name but is not the state to diff against', () => {
  // A draft has no tag behind it, so treating one as the previous release asks git
  // for a ref that does not exist — and every later release fails with it.
  const { root } = gitFixture('valid');

  const result = release(root, { drafts: [`release-${DATE}`] });
  assert.equal(result.code, 0, result.output);
  assert.match(result.created[0], new RegExp(`release create release-${DATE}\\.2 `));
});

test('a long entry is folded per plugin, not truncated', () => {
  const { root } = gitFixture('valid');
  bump(root, 'demo-plugin', '1.1.0', Array.from({ length: 60 }, (_, i) => `- Item ${i}.`).join('\n'));

  const result = release(root, {}, '--dry-run');
  assert.equal(result.code, 0, result.output);
  assert.match(result.output, /<details><summary>\d+ more lines<\/summary>/);
  for (let i = 0; i < 60; i += 1) assert.match(result.output, new RegExp(`- Item ${i}\\.`));
  assert.doesNotMatch(result.output.split('<details>')[0], /- Item 59\./);
});

test('a bump with no changelog section publishes nothing, and says what to fix', () => {
  const { root } = gitFixture('valid');
  const metaFile = path.join(root, 'plugins/demo-plugin/plugin.meta.json');
  const meta = JSON.parse(readFileSync(metaFile, 'utf8'));
  meta.version = '9.9.9';
  writeFileSync(metaFile, `${JSON.stringify(meta, null, 2)}\n`);

  const result = release(root);
  assert.equal(result.code, 1);
  assert.match(result.output, /plugins\/demo-plugin\/CHANGELOG\.md/);
  assert.match(result.output, /no "## \[9\.9\.9\]" section/);
  assert.match(result.output, /plugin\.meta\.json/);
  assert.equal(result.created.length, 0);
});

test('a previous release that does not resolve is fatal, not a fresh start', () => {
  // Read as "nothing released yet", a tag that was never fetched re-announces the
  // whole marketplace.
  const { root } = gitFixture('valid');

  const result = release(root, { existing: ['release-2020-01-01'] });
  assert.equal(result.code, 1);
  assert.match(result.output, /cannot resolve release-2020-01-01/);
  assert.match(result.output, /fetch tags/);
  assert.equal(result.created.length, 0);
});

test('an unanswerable Releases API fails closed', () => {
  const { root } = gitFixture('valid');

  const result = release(root, { failApi: true });
  assert.equal(result.code, 1);
  assert.match(result.output, /cannot list published releases/);
  assert.match(result.output, /503/);
  assert.equal(result.created.length, 0);
});

test('the pull request gate refuses a bump whose entry names another version', () => {
  // This is what keeps the release from failing on main: the section it will
  // publish is proved to exist while the change is still a pull request.
  const { root, git } = gitFixture('valid');
  const base = git('rev-parse', 'HEAD').trim();
  const metaFile = path.join(root, 'plugins/demo-plugin/plugin.meta.json');
  const meta = JSON.parse(readFileSync(metaFile, 'utf8'));
  meta.version = '1.1.0';
  writeFileSync(metaFile, `${JSON.stringify(meta, null, 2)}\n`);
  writeFileSync(
    path.join(root, 'plugins/demo-plugin/CHANGELOG.md'),
    '# Changelog\n\n## [1.0.0] - 2026-01-01\n\n- The demo skill.\n- One more thing.\n',
  );
  git('add', '-A');
  git('commit', '-qm', 'bump');

  const result = runScript('check-version-bump.mjs', root, ['--base', base]);
  assert.equal(result.code, 1);
  assert.match(result.output, /plugins\/demo-plugin\/CHANGELOG\.md/);
  assert.match(result.output, /no "## \[1\.1\.0\]" section/);
});

test('the pull request gate passes a bump the release can publish', () => {
  const { root, git } = gitFixture('valid');
  const base = git('rev-parse', 'HEAD').trim();
  bump(root, 'demo-plugin', '1.1.0');
  git('add', '-A');
  git('commit', '-qm', 'bump');

  assert.equal(runScript('check-version-bump.mjs', root, ['--base', base]).code, 0);
});
