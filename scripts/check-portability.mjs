#!/usr/bin/env node
/**
 * Keeps every SKILL.md installable in Cursor, Claude Code and Codex without edits.
 *
 * The portable core of the Agent Skills standard is `name` + `description` + body.
 * Agent-specific frontmatter is rejected here and belongs in a sidecar instead.
 */
import { existsSync } from 'node:fs';
import path from 'node:path';
import { parseFrontmatter } from './lib/frontmatter.mjs';
import {
  Reporter,
  isDir,
  listDirs,
  listPlugins,
  readJson,
  readText,
  resolveRoot,
  run,
} from './lib/util.mjs';

const PORTABLE_KEYS = new Set(['name', 'description']);

/** Keys that exist, but only for one agent — the error names the owner so the fix is obvious. */
const AGENT_SPECIFIC_KEYS = {
  'when_to_use': 'Claude Code',
  'allowed-tools': 'Claude Code',
  'disallowed-tools': 'Claude Code',
  'argument-hint': 'Claude Code',
  'arguments': 'Claude Code',
  'user-invocable': 'Claude Code',
  'model': 'Claude Code',
  'effort': 'Claude Code',
  'disable-model-invocation': 'Claude Code and Cursor',
  'paths': 'Cursor',
  'metadata': 'Cursor',
  'license': 'no agent (put it in plugin.meta.json)',
};

const MAX_BODY_LINES = 500;
const MAX_DESCRIPTION_CHARS = 1024;
const MAX_PLUGIN_DESCRIPTION_BUDGET = 4000;
const KEBAB_CASE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

run(() => {
  const root = resolveRoot();
  const reporter = new Reporter('check-portability');
  const { plugins, errors } = listPlugins(root);
  for (const { file, message } of errors) reporter.error(file, message);

  for (const entry of plugins) {
    let meta;
    try {
      meta = readJson(entry.metaFile);
    } catch (error) {
      // One malformed manifest must not hide the problems in every other plugin.
      reporter.error(path.relative(root, entry.metaFile), error.message);
      continue;
    }

    const declared = meta.components?.skills;
    // All three agents load skills/<name>/SKILL.md by convention, so a skills
    // directory on disk ships whether or not the manifest declares it. Gate what
    // exists, not what was declared.
    const skillsDir = path.resolve(entry.dir, declared ?? './skills/');
    if (!isDir(skillsDir)) continue;

    const skillDirs = listDirs(skillsDir);
    if (!declared && skillDirs.length > 0) {
      reporter.error(
        path.relative(root, entry.metaFile),
        'skills/ exists on disk but components.skills is not declared — the skills ship anyway and no manifest points at them',
      );
    }
    if (declared && skillDirs.length === 0) {
      reporter.error(path.relative(root, skillsDir), 'components.skills is set but no skills are present');
    }

    let descriptionBudget = 0;
    for (const skillName of skillDirs) {
      descriptionBudget += checkSkill(root, skillsDir, skillName, reporter);
    }

    if (descriptionBudget > MAX_PLUGIN_DESCRIPTION_BUDGET) {
      reporter.error(
        path.relative(root, entry.dir),
        `skill descriptions total ${descriptionBudget} chars, over the ${MAX_PLUGIN_DESCRIPTION_BUDGET} budget — every one of them sits in context at startup`,
      );
    }
  }

  return reporter.finish(root);
});

function checkSkill(root, skillsDir, skillName, reporter) {
  const dir = path.join(skillsDir, skillName);
  const file = path.join(dir, 'SKILL.md');
  const rel = path.relative(root, file);

  if (!existsSync(file)) {
    reporter.error(path.relative(root, dir), 'skill directory has no SKILL.md');
    return 0;
  }
  if (!KEBAB_CASE.test(skillName)) {
    reporter.error(path.relative(root, dir), 'skill directory name must be kebab-case');
  }

  const parsed = parseFrontmatter(readText(file));
  if (!parsed.found) {
    reporter.error(rel, parsed.malformed ? 'frontmatter is not closed by ---' : 'missing YAML frontmatter');
    return 0;
  }

  for (const { line, text, reason } of parsed.unsupported) {
    reporter.error(rel, `frontmatter line ${line} (${reason}) is not portable: ${text}`);
  }

  for (const { line, key, reason } of parsed.invalid) {
    reporter.error(rel, `frontmatter line ${line}: ${reason}. Quote it: ${key}: '...'`);
  }

  for (const key of Object.keys(parsed.fields)) {
    if (PORTABLE_KEYS.has(key)) continue;
    const owner = AGENT_SPECIFIC_KEYS[key];
    reporter.error(
      rel,
      owner
        ? `frontmatter key "${key}" is understood by ${owner} only — move it to a sidecar`
        : `frontmatter key "${key}" is not part of the portable core (name, description)`,
    );
  }

  // A rejected line drops the whole block, so nothing in the file loads and the
  // rules below would measure text no agent sees. A value that merely reads as
  // something else costs only its own key.
  if (parsed.invalid.some((entry) => entry.fatal)) return 0;
  const lossy = new Set(parsed.invalid.map((entry) => entry.key));

  const { name, description } = parsed.fields;
  if (!name) reporter.error(rel, 'frontmatter is missing "name"');
  else if (!lossy.has('name') && name !== skillName)
    reporter.error(rel, `frontmatter name "${name}" does not match directory "${skillName}"`);

  if (!description) {
    reporter.error(rel, 'frontmatter is missing "description" — without it the agent never triggers the skill');
  } else if (!lossy.has('description')) {
    if (description.length > MAX_DESCRIPTION_CHARS) {
      reporter.error(rel, `description is ${description.length} chars; keep it under ${MAX_DESCRIPTION_CHARS}`);
    }
    if (!/^[A-Z]/.test(description)) {
      reporter.error(rel, 'description should start with a capital letter and lead with the primary use case');
    }
  }

  // Reported even when the description was missing or unreadable: unrelated.
  if (parsed.bodyLines > MAX_BODY_LINES) {
    reporter.error(
      rel,
      `body is ${parsed.bodyLines} lines, over ${MAX_BODY_LINES} — move reference material into references/`,
    );
  }

  return description && !lossy.has('description') ? description.length : 0;
}
