#!/usr/bin/env node
/**
 * One release for the marketplace, covering whatever moved since the last one.
 *
 *   node scripts/release.mjs --target "$GITHUB_SHA"
 *   node scripts/release.mjs --dry-run
 *
 * State is the previous release, read from the Releases API rather than from
 * tags: a tag can exist with no release behind it — pushed by hand, or inherited
 * from a migrated repository — and diffing against one would swallow everything
 * released in between. The plan is then the diff between the versions that
 * release shipped and the versions on disk, which needs no bookkeeping file and
 * makes a rerun a no-op.
 *
 * Fail-closed twice over: a dead API and an unresolvable previous tag both throw,
 * because read as "nothing released yet" either one announces the whole
 * marketplace over again.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { changelogSection } from './lib/changelog.mjs';
import {
  Reporter,
  flagValue,
  hasFlag,
  listPlugins,
  readJson,
  readText,
  resolveRoot,
  run,
} from './lib/util.mjs';

const PREFIX = 'release-';
/** How much of one plugin's entry the release page shows before folding the rest. */
const COMPACT_LINES = 40;

run(() => {
  const root = resolveRoot();
  const reporter = new Reporter('release');
  const dryRun = hasFlag('--dry-run');
  // UTC, so the tag does not depend on the runner's timezone.
  const date = flagValue('--date') ?? new Date().toISOString().slice(0, 10);
  // A release is pinned to a commit, not to wherever main has drifted by now.
  const target = flagValue('--target') ?? process.env.GITHUB_SHA;
  if (!dryRun && !target) throw new Error('release needs --target <commit-ish>');

  // Newest first. A draft reserves its tag name — publishing over one would
  // duplicate a human's work in progress — but it cannot be the state to diff
  // against: a draft has no tag behind it, so asking git for that ref would fail
  // and every later release with it.
  const releases = publishedTags(root);
  const since = releases.find((release) => !release.draft && release.tag.startsWith(PREFIX))?.tag ?? null;
  if (since) verify(root, since);

  const { plugins, errors } = listPlugins(root);
  for (const { file, message } of errors) reporter.error(file, message);

  const moved = [];
  for (const { name, dir, metaFile } of plugins) {
    const meta = path.relative(root, metaFile);
    let version;
    try {
      version = readJson(metaFile).version;
    } catch (error) {
      reporter.error(meta, error.message);
      continue;
    }
    if (!version) {
      reporter.error(meta, 'no version to release');
      continue;
    }
    if (since && versionAt(root, since, `plugins/${name}/plugin.meta.json`) === version) continue;

    // check-version-bump refuses this on the pull request, so reaching it here
    // means a bump landed some other way. Stop rather than invent a body.
    const changelog = `plugins/${name}/CHANGELOG.md`;
    const entry = changelogSection(read(path.join(dir, 'CHANGELOG.md')), version);
    if (!entry) {
      reporter.error(changelog, `no "## [${version}]" section; add one, or drop the bump in ${meta}`);
      continue;
    }
    moved.push({ name, version, entry: compact(entry) });
  }

  // Publishing around a broken entry would bury it under the plugins that worked.
  if (reporter.failed) return reporter.finish(root);
  if (moved.length === 0) {
    reporter.note(`release: nothing moved since ${since ?? 'the beginning'}`);
    return reporter.finish(root);
  }

  const tag = freeTag(date, new Set(releases.map((release) => release.tag)));
  const title =
    moved.length === 1
      ? `${date} — ${moved[0].name} ${moved[0].version}`
      : `${date} — ${moved.length} plugins`;
  const notes = `${moved.map((m) => `### ${m.name} ${m.version}\n\n${m.entry}`).join('\n\n')}\n`;

  if (dryRun) {
    console.log(`${tag}: ${title}\n\n${notes}`);
    return reporter.finish(root);
  }

  const file = path.join(mkdtempSync(path.join(os.tmpdir(), 'release-')), 'notes.md');
  writeFileSync(file, notes);
  // A failure here fails the job. Re-running the workflow on main republishes it,
  // because the plan is derived and not stored.
  gh(root, ['release', 'create', tag, '--target', target, '--title', title, '--notes-file', file]);
  reporter.note(`release: published ${tag} — ${title}`);
  return reporter.finish(root);
});

/** `release-<date>`, with a counter for the second release of one day. */
function freeTag(date, taken) {
  const base = `${PREFIX}${date}`;
  if (!taken.has(base)) return base;
  for (let n = 2; ; n += 1) if (!taken.has(`${base}.${n}`)) return `${base}.${n}`;
}

/**
 * A long changelog entry is folded into a `<details>` block, not dropped — cut
 * where a block starts, so a wrapped bullet is never split from its marker.
 * Folded per plugin, so every plugin in a release stays visible.
 */
function compact(entry) {
  const lines = entry.split('\n');
  if (lines.length <= COMPACT_LINES) return entry;
  let cut = lines
    .slice(0, COMPACT_LINES)
    .findLastIndex((line) => line.trim() === '' || /^\S/.test(line));
  if (cut <= 0) cut = COMPACT_LINES;
  const head = lines.slice(0, cut).join('\n').trim();
  const tail = lines.slice(cut).join('\n').trim();
  return `${head}\n\n<details><summary>${lines.length - cut} more lines</summary>\n\n${tail}\n\n</details>`;
}

function publishedTags(root) {
  try {
    const jq = '.[] | [.tag_name, (.draft | tostring)] | @tsv';
    return gh(root, ['api', '--paginate', 'repos/{owner}/{repo}/releases', '--jq', jq])
      .split('\n')
      .map((line) => line.trim().split('\t'))
      .filter(([tag]) => tag)
      .map(([tag, draft]) => ({ tag, draft: draft === 'true' }));
  } catch (error) {
    throw new Error(`cannot list published releases: ${reason(error)}`);
  }
}

function verify(root, ref) {
  try {
    execFileSync('git', ['rev-parse', '--verify', `${ref}^{commit}`], { cwd: root, stdio: 'ignore' });
  } catch {
    throw new Error(`cannot resolve ${ref}; fetch tags before releasing`);
  }
}

function versionAt(root, ref, file) {
  try {
    const text = execFileSync('git', ['show', `${ref}:${file}`], { cwd: root, encoding: 'utf8' });
    return JSON.parse(text).version ?? null;
  } catch {
    // Absent at that release, so it moved by definition.
    return null;
  }
}

function read(file) {
  try {
    return readText(file);
  } catch {
    // No changelog reads as no entry; the caller's message names the file.
    return '';
  }
}

function gh(root, args) {
  return execFileSync('gh', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

/** gh puts the reason on the first line; the rest is usage noise. */
function reason(error) {
  const text = `${error.stderr ?? ''}`.trim() || error.message;
  return text.split('\n')[0];
}
