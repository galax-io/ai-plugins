#!/usr/bin/env node
/**
 * Both directions of the same edge.
 *
 * Forward: every relative link in the repository's Markdown, and every path a
 * generated manifest points at, resolves. A skill that references a missing
 * reference file fails at the moment the agent needs it, which is the worst
 * possible moment.
 *
 * Backward: every file bundled under a skill is reachable from its SKILL.md. A
 * reference no link points at ships and is never loaded — progressive disclosure
 * with the disclosure missing, and the next author edits it believing it is live.
 *
 * One walk, one link grammar, one place to reason about what that grammar can
 * and cannot see. The two directions have opposite failure modes and that is
 * exactly why they belong together: a link the grammar misses is a harmless
 * skipped verification going forward, but going backward it would accuse a
 * correctly linked file. Reachability therefore reads the raw source while
 * resolution reads prose only — see collectLinks().
 */
import { existsSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { linkPathVariants, linkTargets, stripNonProse } from './lib/markdown.mjs';
import {
  EXTENSIONLESS_NAMES,
  Reporter,
  gitIgnored,
  isDir,
  listDirs,
  listPlugins,
  readText,
  resolveRoot,
  run,
  walk,
} from './lib/util.mjs';

const MANIFEST_KEYS = ['skills', 'agents', 'rules', 'hooks', 'mcpServers', 'logo'];
const PARSED_AS_MARKDOWN = new Set(['.md', '.mdc']);

// A sidecar carries agent-specific metadata and is read by the agent, not the
// skill body, so nothing links to it. The extensionless names come from
// check-security's allowlist and are shared with it: one check blessing a file
// while its sibling makes it unshippable is the drift that list exists to stop.
const UNLINKED_BY_DESIGN = new Set(['agents']);

run(() => {
  const root = resolveRoot();
  const reporter = new Reporter('check-links');

  // tests/ holds deliberately broken inputs; the suite checks them with --root.
  // .specify/ and .claude/skills/ are spec-kit and its extensions, installed
  // verbatim by setup-speckit.sh — their links are the upstream repos' contract,
  // repaired by bumping a pinned tag, not by editing a vendored file here.
  // Excluded by path, not by directory name, so a plugin may still ship a
  // directory called `tests` and have it scanned.
  const notOurs = [
    path.join(root, 'tests') + path.sep,
    path.join(root, '.specify') + path.sep,
    path.join(root, '.claude', 'skills') + path.sep,
  ];
  const files = walk(
    root,
    (f) => PARSED_AS_MARKDOWN.has(path.extname(f)) || path.basename(f) === 'plugin.json',
  ).filter((f) => !notOurs.some((dir) => f.startsWith(dir)));

  for (const file of files) {
    if (path.basename(file) === 'plugin.json') checkManifest(root, file, reporter);
    else checkMarkdown(root, file, reporter);
  }

  checkReachability(root, reporter);

  return reporter.finish(root);
});

function checkMarkdown(root, file, reporter) {
  const rel = path.relative(root, file);
  for (const raw of linkTargets(stripNonProse(readText(file)))) {
    if (raw.startsWith('/')) {
      reporter.error(rel, `absolute link "${raw}" — use a path relative to the file`);
      continue;
    }
    const targets = linkPathVariants(raw).map((p) => path.resolve(path.dirname(file), p));
    if (!targets.some(existsSync)) reporter.error(rel, `broken link: ${raw}`);
  }
}

function checkManifest(root, file, reporter) {
  const rel = path.relative(root, file);
  let manifest;
  try {
    manifest = JSON.parse(readText(file));
  } catch (error) {
    reporter.error(rel, `not valid JSON: ${error.message}`);
    return;
  }

  const pluginDir = path.resolve(path.dirname(file), '..');
  for (const key of MANIFEST_KEYS) {
    const value = manifest[key];
    if (typeof value !== 'string') continue;
    if (/^(https?:|mailto:)/i.test(value)) {
      reporter.error(rel, `${key} must be a path inside the plugin, not a URL: ${value}`);
      continue;
    }
    const target = path.resolve(pluginDir, value);
    if (!target.startsWith(pluginDir + path.sep)) {
      reporter.error(rel, `${key} escapes the plugin directory: ${value}`);
      continue;
    }
    if (!existsSync(target)) reporter.error(rel, `${key} points at missing ${value}`);
  }
}

/**
 * Gates the `skills/` directory that exists on disk, not the one the manifest
 * declares — all three agents load `skills/<name>/SKILL.md` by convention, so an
 * undeclared or redirected tree ships anyway. `listPlugins` reports a directory
 * with no plugin.meta.json, so an unreadable plugin cannot pass silently here.
 */
function checkReachability(root, reporter) {
  const { plugins, errors } = listPlugins(root);
  for (const { file, message } of errors) reporter.error(file, message);

  for (const { dir } of plugins) {
    const skillsDir = path.join(dir, 'skills');
    if (!isDir(skillsDir)) continue;
    for (const skill of listDirs(skillsDir)) {
      checkSkill(root, path.join(skillsDir, skill), reporter);
    }
  }
}

function checkSkill(root, skillDir, reporter) {
  const entry = path.join(skillDir, 'SKILL.md');
  // check-portability owns the missing-SKILL.md message; reporting every bundled
  // file as unreachable on top of it would bury the real cause.
  if (!existsSync(entry)) return;

  const bundled = walk(skillDir, (f) => f !== entry).filter((f) => {
    const rel = path.relative(skillDir, f);
    return (
      !UNLINKED_BY_DESIGN.has(rel.split(path.sep)[0]) && !EXTENSIONLESS_NAMES.has(path.basename(f))
    );
  });
  if (bundled.length === 0) return;

  const ignored = gitIgnored(root, bundled, reporter);
  const reachable = reach(entry, skillDir);

  for (const file of bundled) {
    if (ignored.has(file)) continue; // Local junk is check-security's problem, not a missing link.
    if (reachable.has(identity(file))) continue;
    reporter.error(
      path.relative(root, file),
      'no link from SKILL.md reaches this file — the agent never loads it',
    );
  }
}

/**
 * Files inside `skillDir` reachable from `entry` by following relative links,
 * transitively: a reference may point at another, and only the component has to
 * hang off SKILL.md. Links that leave the skill are followed no further —
 * otherwise one `../../README.md` would launder the whole tree as reachable.
 *
 * Transitive, not depth-1, so this proves a file is loadable, not that SKILL.md
 * still indexes it: a reference dropped from the dispatch table stays reachable
 * through a sibling. Enforcing the index is a separate check.
 */
function reach(entry, skillDir) {
  const seen = new Set();
  const queue = [entry];
  const inside = (p) => p === skillDir || p.startsWith(skillDir + path.sep);

  while (queue.length > 0) {
    const file = queue.pop();
    const id = identity(file);
    if (seen.has(id)) continue;
    seen.add(id);

    let source;
    try {
      source = readText(file);
    } catch {
      continue; // A link to a missing file is the forward pass's error, not ours.
    }

    // Deliberately the raw source, not stripNonProse: a reference documented
    // inside a fence is still discoverable, and treating it as unlinked would
    // fail CI on a file that is genuinely there. Erring toward reachable keeps
    // this direction fail-open, like the forward one.
    for (const raw of linkTargets(source)) {
      if (raw.startsWith('/')) continue;
      for (const variant of linkPathVariants(raw)) {
        const target = path.resolve(path.dirname(file), variant);
        if (!inside(target)) continue;
        // A link to a directory reaches everything in it — "see the [references]
        // folder" is a real way to point an agent at a tree, and marking only the
        // directory would leave every file under it looking like an orphan.
        if (isDir(target)) for (const f of walk(target)) seen.add(identity(f));
        else if (PARSED_AS_MARKDOWN.has(path.extname(target))) queue.push(target);
        else seen.add(identity(target));
      }
    }
  }

  return seen;
}

/**
 * Comparison key for a path. macOS and Windows resolve case-insensitively and
 * follow symlinks, so the string a link resolves to and the string `walk` found
 * on disk can differ while naming one file; realpath collapses both.
 */
function identity(file) {
  try {
    return realpathSync.native(file);
  } catch {
    return file;
  }
}
