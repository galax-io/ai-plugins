#!/usr/bin/env node
/**
 * Plugins ship as source that agents execute on a developer's machine, so the
 * blast radius of a leaked token or a stray binary is the reviewer's laptop.
 *
 * Checks: file-type allowlist, no machine-specific absolute paths, and no
 * literal credentials in hook or MCP configuration.
 */
import path from 'node:path';
import { findSecrets } from './lib/secrets.mjs';
import {
  EXTENSIONLESS_NAMES,
  Reporter,
  gitIgnored,
  readText,
  resolveRoot,
  run,
  walk,
} from './lib/util.mjs';

const TEXT_EXTENSIONS = new Set([
  '.md',
  '.mdc',
  '.json',
  '.jsonc',
  '.yaml',
  '.yml',
  '.toml',
  '.txt',
  '.sh',
  '.bash',
  '.py',
  '.mjs',
  '.js',
  '.ts',
]);

const BINARY_EXTENSIONS = new Set(['.png', '.svg', '.jpg', '.jpeg']);

// Derived, never hand-copied: a text type added above must stay scannable.
const ALLOWED_EXTENSIONS = new Set([...TEXT_EXTENSIONS, ...BINARY_EXTENSIONS]);

const CONFIG_FILES = new Set(['hooks.json', '.mcp.json', 'mcp.json']);
const HOME_PATH = /(?:^|[\s"'`=(])((?:\/Users\/|\/home\/|[A-Z]:\\Users\\)[A-Za-z0-9._-]+)/g;

run(() => {
  const root = resolveRoot();
  const reporter = new Reporter('check-security');
  const pluginsDir = path.join(root, 'plugins');

  const files = walk(pluginsDir, () => true);
  const ignored = gitIgnored(root, files);

  for (const file of files) {
    // Untracked local junk (.DS_Store, *.pyc) is not what this gate is about.
    if (ignored.has(file)) continue;

    const rel = path.relative(root, file);
    const ext = path.extname(file);
    const name = path.basename(file);

    if (ext ? !ALLOWED_EXTENSIONS.has(ext) : !EXTENSIONLESS_NAMES.has(name)) {
      reporter.error(
        rel,
        `${ext ? `file type "${ext}"` : `file "${name}"`} is not allowed inside plugins/ — ship source, not binaries`,
      );
      continue;
    }
    if (ext && !TEXT_EXTENSIONS.has(ext)) continue;

    const content = readText(file);
    for (const [, machinePath] of content.matchAll(HOME_PATH)) {
      reporter.error(rel, `machine-specific absolute path: ${machinePath}`);
    }

    if (CONFIG_FILES.has(name)) checkConfigSecrets(rel, content, reporter);
  }

  return reporter.finish(root);
});

function checkConfigSecrets(rel, content, reporter) {
  let config;
  try {
    config = JSON.parse(content);
  } catch (error) {
    reporter.error(rel, `not valid JSON: ${error.message}`);
    return;
  }
  for (const problem of findSecrets(config)) reporter.error(rel, problem);
}
