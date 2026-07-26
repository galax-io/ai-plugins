#!/usr/bin/env node
/**
 * Resolves every relative link in the repository's Markdown and every path a
 * generated manifest points at. A skill that references a missing reference file
 * fails at the moment the agent needs it, which is the worst possible moment.
 */
import { existsSync } from 'node:fs';
import path from 'node:path';
import { stripNonProse } from './lib/markdown.mjs';
import { Reporter, readText, resolveRoot, run, walk } from './lib/util.mjs';

// `[^\]]` would also swallow a `[^1]:` footnote definition and treat the first
// word of the footnote text as a path, so reference ids may not start with `^`.
const INLINE_LINK = /\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
const REFERENCE_LINK = /^\s*\[(?!\^)[^\]]+\]:\s*(\S+)/gm;
const EXTERNAL = /^(https?:|mailto:|tel:|#|data:)/i;
const MANIFEST_KEYS = ['skills', 'agents', 'rules', 'hooks', 'mcpServers', 'logo'];

run(() => {
  const root = resolveRoot();
  const reporter = new Reporter('check-links');

  // tests/ holds deliberately broken inputs; the suite checks them with --root.
  // Excluded by path, not by directory name, so a plugin may still ship a
  // directory called `tests` and have it scanned.
  const testsDir = path.join(root, 'tests') + path.sep;
  const files = walk(root, (f) => f.endsWith('.md') || path.basename(f) === 'plugin.json').filter(
    (f) => !f.startsWith(testsDir),
  );

  for (const file of files) {
    if (file.endsWith('.md')) checkMarkdown(root, file, reporter);
    else checkManifest(root, file, reporter);
  }

  return reporter.finish(root);
});

function checkMarkdown(root, file, reporter) {
  const source = stripNonProse(readText(file));
  const rel = path.relative(root, file);
  const targets = [
    ...[...source.matchAll(INLINE_LINK)].map((m) => m[1]),
    ...[...source.matchAll(REFERENCE_LINK)].map((m) => m[1]),
  ];

  for (const raw of targets) {
    if (EXTERNAL.test(raw)) continue;
    if (raw.startsWith('/')) {
      reporter.error(rel, `absolute link "${raw}" — use a path relative to the file`);
      continue;
    }
    const target = path.resolve(path.dirname(file), raw.split('#')[0]);
    if (!existsSync(target)) reporter.error(rel, `broken link: ${raw}`);
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
    if (EXTERNAL.test(value)) {
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
