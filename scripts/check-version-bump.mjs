#!/usr/bin/env node
/**
 * Release gate: touching a plugin without bumping its version silently reships
 * old behaviour under an unchanged version string, and Claude Code pins updates
 * to that string. Every plugin change must move `version` and land a CHANGELOG entry.
 *
 *   node scripts/check-version-bump.mjs --base origin/main
 */
import { execFileSync } from 'node:child_process';
import { changelogSection } from './lib/changelog.mjs';
import { compareSemver } from './lib/semver.mjs';
import { Reporter, flagValue, resolveRoot, run } from './lib/util.mjs';

run(() => {
  const root = resolveRoot();
  const reporter = new Reporter('check-version-bump');
  const base = baseRef();

  const changed = git(root, ['diff', '--name-only', `${base}...HEAD`])
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const touched = new Set();
  for (const file of changed) {
    const match = /^plugins\/([^/]+)\//.exec(file);
    if (match) touched.add(match[1]);
  }

  if (touched.size === 0) {
    reporter.note('check-version-bump: no plugin changed');
    return reporter.finish(root);
  }

  for (const name of [...touched].sort()) {
    const metaPath = `plugins/${name}/plugin.meta.json`;
    const current = readVersion(root, 'HEAD', metaPath);
    const previous = readVersion(root, base, metaPath);

    // Removing a plugin also touches plugins/<n>/, but there is nothing left to
    // bump and no changelog to write. Only a manifest that exists on neither side
    // is a real problem.
    if (!current) {
      if (!previous) {
        reporter.error(metaPath, 'plugin directory changed but plugin.meta.json is unreadable at HEAD');
      }
      continue;
    }

    // A new plugin has no version to outrank, but it still owes a changelog.
    if (previous && compareSemver(current, previous) <= 0) {
      reporter.error(metaPath, `version ${current} must be greater than ${previous} on ${base}`);
    }
    // The entry for the new version is what the release job publishes as the
    // release body, so this gate proves the release exists before the merge that
    // would try to cut it. Checking the section rather than "was CHANGELOG.md
    // touched" is what makes that guarantee: a touched file with the heading
    // still naming the old version passes the weaker check and then fails on main,
    // after the change is already public.
    const changelog = `plugins/${name}/CHANGELOG.md`;
    const entry = readFile(root, 'HEAD', changelog);
    if (!entry) {
      reporter.error(
        changelog,
        previous ? 'plugin changed without a CHANGELOG entry' : 'new plugin ships without a CHANGELOG',
      );
    } else if (!changelogSection(entry, current)) {
      reporter.error(
        changelog,
        `no "## [${current}]" section; the release for ${current} publishes that section as its notes`,
      );
    } else if (!changed.includes(changelog)) {
      reporter.error(changelog, `not touched, yet ${metaPath} moved to ${current}`);
    }
  }

  return reporter.finish(root);
});

function baseRef() {
  // flagValue throws on `--base` with no value, so a typo cannot silently fall
  // through to origin/main and compare against the wrong ref.
  return flagValue('--base') ?? (process.env.GITHUB_BASE_REF ? `origin/${process.env.GITHUB_BASE_REF}` : 'origin/main');
}

function git(root, args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' });
}

function readVersion(root, ref, file) {
  const text = readFile(root, ref, file);
  if (!text) return null;
  try {
    return JSON.parse(text).version ?? null;
  } catch {
    return null;
  }
}

/** File contents at a ref, or null when it is not there — the caller's "missing". */
function readFile(root, ref, file) {
  try {
    return git(root, ['show', `${ref}:${file}`]);
  } catch {
    return null;
  }
}

