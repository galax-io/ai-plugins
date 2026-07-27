#!/usr/bin/env node
/**
 * Generates the three per-agent plugin manifests and the three marketplace
 * catalogs from the authored sources (marketplace.meta.json, plugins/<n>/plugin.meta.json).
 *
 *   node scripts/sync-manifests.mjs            write
 *   node scripts/sync-manifests.mjs --check    verify only, non-zero exit on drift
 *   node scripts/sync-manifests.mjs --root DIR run against a fixture tree
 *
 * Cursor, Claude Code and Codex agree on the skill format and disagree on
 * everything around it. The dialect differences live here and nowhere else.
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { validate } from './lib/schema.mjs';
import {
  PACKAGE_ROOT,
  Reporter,
  hasFlag,
  isDir,
  listDirs,
  listPlugins,
  readJson,
  readText,
  resolveRoot,
  run,
  serialize,
} from './lib/util.mjs';

const CLAUDE_MANIFEST_SCHEMA = 'https://json.schemastore.org/claude-code-plugin-manifest.json';

/** Reserved by Anthropic for official sources; a marketplace using one stops loading. */
const RESERVED_MARKETPLACE_NAMES = new Set([
  'claude-code-marketplace',
  'claude-code-plugins',
  'claude-plugins-official',
  'claude-plugins-community',
  'claude-community',
  'anthropic-marketplace',
  'anthropic-plugins',
  'agent-skills',
  'anthropic-agent-skills',
  'knowledge-work-plugins',
  'life-sciences',
  'claude-for-legal',
  'claude-for-financial-services',
  'financial-services-plugins',
  'first-party-plugins',
  'healthcare',
]);

const RESERVED_PREFIXES = ['anthropic-', 'official-claude'];

export function buildOutputs(root, reporter) {
  const marketplaceMeta = loadMeta(
    root,
    path.join(root, 'marketplace.meta.json'),
    path.join(PACKAGE_ROOT, 'schemas', 'marketplace.meta.schema.json'),
    reporter,
  );

  checkMarketplaceName(marketplaceMeta?.name, reporter);

  const { plugins: pluginDirs, errors } = listPlugins(root);
  for (const { file, message } of errors) reporter.error(file, message);

  const repoLicense = detectRepoLicense(root, reporter);
  const skillOwners = new Map();
  const plugins = [];

  for (const entry of pluginDirs) {
    const meta = loadMeta(
      root,
      entry.metaFile,
      path.join(PACKAGE_ROOT, 'schemas', 'plugin.meta.schema.json'),
      reporter,
    );
    if (!meta) continue;

    const rel = path.relative(root, entry.dir);
    if (meta.name !== entry.name) {
      reporter.error(rel, `plugin.meta.json name "${meta.name}" does not match directory "${entry.name}"`);
    }
    if (repoLicense && meta.license !== repoLicense) {
      reporter.error(rel, `license "${meta.license}" does not match repository LICENSE (${repoLicense})`);
    }

    checkComponentPaths(root, entry.dir, meta, reporter);
    collectSkillNames(root, entry, meta, skillOwners, reporter);

    plugins.push({ ...entry, meta });
  }

  // Nothing below is safe on invalid input: the emitters read fields the schema
  // guarantees. Emitting anyway turns a precise schema error into a raw TypeError
  // and throws away everything the reporter has collected.
  if (!marketplaceMeta || reporter.failed) return null;

  const files = new Map();

  for (const { dir, meta } of plugins) {
    files.set(path.join(dir, '.claude-plugin', 'plugin.json'), claudePlugin(meta));
    files.set(path.join(dir, '.cursor-plugin', 'plugin.json'), cursorPlugin(meta));
    files.set(path.join(dir, '.codex-plugin', 'plugin.json'), codexPlugin(meta));
  }

  files.set(path.join(root, '.claude-plugin', 'marketplace.json'), claudeMarketplace(marketplaceMeta, plugins));
  files.set(path.join(root, '.cursor-plugin', 'marketplace.json'), cursorMarketplace(marketplaceMeta, plugins));
  files.set(path.join(root, '.agents', 'plugins', 'marketplace.json'), codexMarketplace(marketplaceMeta, plugins));

  return { files };
}

function loadMeta(root, file, schemaFile, reporter) {
  const rel = path.relative(root, file);
  if (!existsSync(file)) {
    reporter.error(rel, 'file is missing');
    return null;
  }
  let meta;
  try {
    meta = readJson(file);
  } catch (error) {
    reporter.error(rel, error.message);
    return null;
  }
  for (const message of validate(loadSchema(schemaFile), meta)) reporter.error(rel, message);
  return meta;
}

const schemaCache = new Map();

/** Schemas are repo constants; reading and parsing them once per plugin is pure waste. */
function loadSchema(file) {
  if (!schemaCache.has(file)) schemaCache.set(file, readJson(file));
  return schemaCache.get(file);
}

function checkMarketplaceName(name, reporter) {
  if (!name) return;
  const reserved =
    RESERVED_MARKETPLACE_NAMES.has(name) || RESERVED_PREFIXES.some((p) => name.startsWith(p));
  if (reserved) {
    reporter.error('marketplace.meta.json', `marketplace name "${name}" is reserved by Anthropic and will not load`);
  }
}

function checkComponentPaths(root, dir, meta, reporter) {
  const rel = path.relative(root, dir);
  for (const [key, value] of Object.entries(meta.components ?? {})) {
    if (!value) continue;
    if (path.isAbsolute(value) || !value.startsWith('./')) {
      reporter.error(rel, `components.${key} must be a relative path starting with "./"`);
      continue;
    }
    const target = path.resolve(dir, value);
    if (!target.startsWith(path.resolve(dir) + path.sep)) {
      reporter.error(rel, `components.${key} escapes the plugin directory`);
      continue;
    }
    if (!existsSync(target)) reporter.error(rel, `components.${key} points at missing ${value}`);
  }
}

function collectSkillNames(root, entry, meta, skillOwners, reporter) {
  // Skills on disk ship whether or not the manifest declares them, so collisions
  // are collected from the conventional location too. check-portability.mjs
  // separately reports the undeclared directory.
  const skillsDir = path.resolve(entry.dir, meta.components?.skills ?? './skills/');
  if (!isDir(skillsDir)) return;
  for (const skill of listDirs(skillsDir)) {
    const previous = skillOwners.get(skill);
    if (previous) {
      reporter.error(
        path.relative(root, path.join(skillsDir, skill)),
        `skill name "${skill}" already used by plugin "${previous}"`,
      );
      continue;
    }
    skillOwners.set(skill, entry.name);
  }
}

/**
 * Detects the repository license so plugin manifests cannot drift from it.
 * Fails closed: an unreadable or unrecognized LICENSE is reported, never treated
 * as "no check" — a relicense is exactly when the guard must not turn itself off.
 */
function detectRepoLicense(root, reporter) {
  const file = path.join(root, 'LICENSE');
  if (!existsSync(file)) {
    reporter.error('LICENSE', 'missing — plugin license fields cannot be verified');
    return null;
  }
  const text = readText(file);
  if (/Apache License/i.test(text) && /Version 2\.0/i.test(text)) return 'Apache-2.0';
  if (/MIT License/i.test(text)) return 'MIT';
  reporter.error(
    'LICENSE',
    'license text is not recognized — teach detectRepoLicense() the new license before plugins can claim it',
  );
  return null;
}

function commonFields(meta) {
  const out = {
    name: meta.name,
    displayName: meta.displayName,
    version: meta.version,
    description: meta.description,
    author: meta.author,
  };
  if (meta.homepage) out.homepage = meta.homepage;
  if (meta.repository) out.repository = meta.repository;
  out.license = meta.license;
  if (meta.keywords?.length) out.keywords = meta.keywords;
  return out;
}

function claudePlugin(meta) {
  const { skills, agents, hooks, mcpServers } = meta.components;
  const manifest = { $schema: CLAUDE_MANIFEST_SCHEMA, ...commonFields(meta) };
  if (skills) manifest.skills = skills;
  if (agents) manifest.agents = agents;
  if (hooks) manifest.hooks = hooks;
  if (mcpServers) manifest.mcpServers = mcpServers;
  // The declaration that gives ${VAR} placeholders their values at enable time.
  if (meta.userConfig) manifest.userConfig = meta.userConfig;
  return serialize(manifest);
}

function cursorPlugin(meta) {
  const { skills, agents, rules, hooks, mcpServers } = meta.components;
  const manifest = commonFields(meta);
  if (meta.cursor?.logo) manifest.logo = meta.cursor.logo;
  if (meta.category) manifest.category = meta.category;
  if (meta.tags?.length) manifest.tags = meta.tags;
  if (skills) manifest.skills = skills;
  if (agents) manifest.agents = agents;
  if (rules) manifest.rules = rules;
  // Cursor defaults to hooks/hooks.json and mcp.json, but the manifest fields
  // override that, so a custom path works here exactly as it does for the other two.
  if (hooks) manifest.hooks = hooks;
  if (mcpServers) manifest.mcpServers = mcpServers;
  if (meta.cursor?.variables) manifest.variables = meta.cursor.variables;
  return serialize(manifest);
}

function codexPlugin(meta) {
  const { skills, hooks, mcpServers } = meta.components;
  const manifest = commonFields(meta);
  if (skills) manifest.skills = skills;
  if (hooks) manifest.hooks = hooks;
  if (mcpServers) manifest.mcpServers = mcpServers;
  // Codex has no subagents and no Cursor rules; both are intentionally dropped.
  if (meta.codex?.interface) manifest.interface = meta.codex.interface;
  return serialize(manifest);
}

function claudeMarketplace(marketplace, plugins) {
  return serialize({
    name: marketplace.name,
    owner: marketplace.owner,
    metadata: {
      description: marketplace.description,
      pluginRoot: './plugins',
    },
    plugins: plugins.map(({ meta }) => ({
      name: meta.name,
      // A path relative to the marketplace root, not a bare name: Claude Code
      // rejects `source: "<name>"` with "Invalid input" regardless of pluginRoot.
      source: `./plugins/${meta.name}`,
      description: meta.description,
      version: meta.version,
      author: meta.author,
      license: meta.license,
      ...(meta.category ? { category: meta.category } : {}),
      ...(meta.keywords?.length ? { keywords: meta.keywords } : {}),
    })),
  });
}

function cursorMarketplace(marketplace, plugins) {
  return serialize({
    name: marketplace.name,
    owner: marketplace.owner,
    metadata: { description: marketplace.description },
    plugins: plugins.map(({ meta }) => ({
      name: meta.name,
      source: `plugins/${meta.name}`,
      description: meta.description,
      version: meta.version,
      ...(meta.category ? { category: meta.category } : {}),
    })),
  });
}

function codexMarketplace(marketplace, plugins) {
  return serialize({
    name: marketplace.name,
    interface: { displayName: marketplace.displayName },
    plugins: plugins.map(({ meta }) => ({
      name: meta.name,
      // Paths are resolved from the repository root, not from .agents/plugins/.
      source: { source: 'local', path: `./plugins/${meta.name}` },
      policy: { installation: 'AVAILABLE', authentication: 'ON_INSTALL' },
      ...(meta.codex?.interface?.category ? { category: meta.codex.interface.category } : {}),
    })),
  });
}

run(() => {
  const root = resolveRoot();
  const check = hasFlag('--check');
  const reporter = new Reporter(check ? 'sync-manifests --check' : 'sync-manifests');

  const result = buildOutputs(root, reporter);
  if (!result || reporter.failed) return reporter.finish(root);

  let written = 0;
  for (const [file, content] of result.files) {
    const rel = path.relative(root, file);
    const current = existsSync(file) ? readText(file) : null;
    if (current === content) continue;
    if (check) {
      reporter.error(rel, current === null ? 'generated file is missing' : 'generated file is out of date');
      continue;
    }
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, content);
    written += 1;
  }

  if (!check && !reporter.failed) reporter.note(`sync-manifests: ${written} file(s) written`);
  return reporter.finish(root);
});
