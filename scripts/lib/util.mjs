import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

/** Where the tooling itself lives. Schemas are read from here, never from --root. */
export const PACKAGE_ROOT = path.resolve(HERE, '..', '..');

/** Repository root, overridable with `--root <dir>` so the checks can run against fixtures. */
export function resolveRoot(argv = process.argv.slice(2)) {
  const value = flagValue('--root', argv);
  return value ? path.resolve(process.cwd(), value) : PACKAGE_ROOT;
}

export function hasFlag(flag, argv = process.argv.slice(2)) {
  return argv.includes(flag);
}

/** Value of `--name <value>`, or null. Throws when the flag is present with nothing after it. */
export function flagValue(flag, argv = process.argv.slice(2)) {
  const i = argv.indexOf(flag);
  if (i === -1) return null;
  const value = argv[i + 1];
  if (!value || value.startsWith('--')) throw new Error(`${flag} needs a value`);
  return value;
}

/** Editors on Windows prepend a BOM; JSON.parse and the frontmatter delimiter both choke on it. */
export function readText(file) {
  return readFileSync(file, 'utf8').replace(/^﻿/, '');
}

/** Throws without a filename — callers own the path, and they report it relative to the root. */
export function readJson(file) {
  try {
    return JSON.parse(readText(file));
  } catch (error) {
    throw new Error(`not valid JSON: ${error.message}`);
  }
}

/** Canonical on-disk form for every generated manifest: 2-space indent, trailing newline. */
export function serialize(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export function isDir(p) {
  return existsSync(p) && statSync(p).isDirectory();
}

export function listDirs(dir) {
  if (!isDir(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
    .map((entry) => entry.name)
    .sort();
}

/** Plugin directories under <root>/plugins. A directory without plugin.meta.json is an error, not a skip. */
export function listPlugins(root) {
  const pluginsDir = path.join(root, 'plugins');
  const found = [];
  const errors = [];
  for (const name of listDirs(pluginsDir)) {
    const metaFile = path.join(pluginsDir, name, 'plugin.meta.json');
    if (!existsSync(metaFile)) {
      errors.push({ file: path.join('plugins', name), message: 'missing plugin.meta.json' });
      continue;
    }
    found.push({ name, dir: path.join(pluginsDir, name), metaFile });
  }
  return { plugins: found, errors };
}

const SKIP_DIRS = new Set(['node_modules', '.git']);

/**
 * Every file under `dir` matching `predicate`, depth-first. Dot-directories are
 * walked on purpose: the generated manifests live in .claude-plugin/, .cursor-plugin/
 * and .codex-plugin/.
 *
 * Nothing else is excluded by name. A directory name one caller wants to ignore
 * must never become a hole in another caller's scan, least of all the security
 * one — callers that need an exclusion filter the result by path.
 */
export function walk(dir, predicate) {
  const out = [];
  if (!isDir(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full, predicate));
    else if (predicate(full)) out.push(full);
  }
  return out;
}

/** Collects problems and turns them into a single exit code, so one run reports everything at once. */
export class Reporter {
  #label;
  #problems = [];
  #notes = [];

  constructor(label) {
    this.#label = label;
  }

  error(file, message) {
    this.#problems.push({ file, message });
  }

  note(message) {
    this.#notes.push(message);
  }

  get failed() {
    return this.#problems.length > 0;
  }

  finish(root) {
    for (const note of this.#notes) console.log(note);
    if (!this.failed) {
      console.log(`${this.#label}: ok`);
      return 0;
    }
    console.error(`${this.#label}: ${this.#problems.length} problem(s)`);
    for (const { file, message } of this.#problems) {
      const rel = root ? path.relative(root, path.resolve(root, file)) || file : file;
      console.error(`  ${rel}: ${message}`);
    }
    return 1;
  }
}

export function run(main) {
  try {
    process.exitCode = main() ?? 0;
  } catch (error) {
    console.error(`${error.message}`);
    process.exitCode = 1;
  }
}
