#!/usr/bin/env node
/**
 * Behavior eval for `gatling-migration`. `npm run check` proves a file is
 * there and its links resolve; this proves the agent reaches it and that
 * what it edits still builds.
 *
 * Each run is: render the fixture, compile, let the agent migrate it,
 * compile again, then assert on the files it left behind. A compile that
 * fails *before* the agent runs is a broken fixture and the case is dropped
 * rather than scored — otherwise a template regression reads as a skill
 * regression.
 *
 * Everything here exists to stop a false green:
 *
 *   - The work tree is outside this repository, and user-scope settings are
 *     not loaded. Both matter: `enabledPlugins` there can enable a published
 *     copy of the very skill under test, and AGENTS.md states which skill
 *     owns the version matrix — the routing answer would be in the system
 *     prompt before the agent read anything. With ANTHROPIC_API_KEY set this
 *     uses `--bare`, which also skips plugin sync and hooks; on an OAuth
 *     session `--bare` cannot authenticate, so it falls back to
 *     `--setting-sources project`, which leaves the user scope unread.
 *   - A nonzero exit from `claude` fails the run. Otherwise a case whose
 *     assertions are satisfied by the fixture scores green with no agent.
 *   - Grep and Glob are withheld. Grep in content mode reads a skill body
 *     without naming a file, which would make every `readsNone` vacuous.
 *   - Bash is withheld, so the agent edits and does not build. The build is
 *     ours, before and after.
 *   - An unmatched case filter is an error, not an empty green run.
 *
 * Model output is not deterministic, so a case is a rate over N runs.
 *
 *   node evals/run.mjs                 all cases, 3 runs each
 *   node evals/run.mjs from-311        one case
 *   EVAL_RUNS=5 node evals/run.mjs     more runs
 *   EVAL_REGISTRY=local:/path          a template registry other than the default
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compiles, render } from './fixtures.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const SKILLS = path.join(ROOT, 'plugins/galaxio-gatling/skills');
const RUNS = Number(process.env.EVAL_RUNS || 3);
const REGISTRY = process.env.EVAL_REGISTRY;
const ONLY = process.argv[2];

// `--bare` is the stronger isolation but authenticates only with an API key.
// `--setting-sources project` is what an OAuth session can use: the fixture
// has no project settings, so nothing from the user scope is read.
const ISOLATION = process.env.ANTHROPIC_API_KEY
  ? ['--bare']
  : ['--setting-sources', 'project'];

/** All three skills go into every fixture. The negative assertions are the
 *  reason: "the router did not load" cannot be asserted against a tree where
 *  the router is absent. */
function stageSkills(dir) {
  const dest = path.join(dir, '.claude/skills');
  mkdirSync(dest, { recursive: true });
  execFileSync('cp', ['-R', `${SKILLS}/.`, dest]);
}

function askAgent(dir, prompt) {
  let raw = '';
  let crashed = null;
  try {
    raw = execFileSync(
      'claude',
      [
        '-p',
        prompt,
        ...ISOLATION,
        '--output-format',
        'stream-json',
        '--verbose',
        '--allowedTools',
        'Read Skill Edit Write',
        '--permission-mode',
        'acceptEdits',
      ],
      { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 },
    );
  } catch (error) {
    raw = `${error.stdout || ''}${error.stderr || ''}`;
    // A plain-text CLI failure never reaches the stream-json parser below, so
    // record it here or the run scores on a fixture no agent ever touched.
    crashed = (raw.trim().split('\n').pop() || `claude exited ${error.status}`).slice(0, 160);
  }

  const opened = [];
  let failed = crashed;
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue;
    let event;
    try {
      event = JSON.parse(line);
    } catch {
      continue;
    }
    if (event.type === 'assistant') {
      for (const block of event.message?.content || []) {
        if (block.type !== 'tool_use') continue;
        // Read names a path, Skill names a skill. Both go in unnormalized and
        // the expectations are bare skill names, so either form matches.
        for (const key of ['file_path', 'skill', 'path']) {
          if (block.input?.[key]) opened.push(String(block.input[key]));
        }
      }
    }
    if (event.type === 'result' && event.is_error) {
      failed = failed || (event.result || 'error').slice(0, 160);
    }
  }
  return { opened, failed };
}

/** For a project already on the target, the assertion is that nothing moved.
 *  Without it the case passes whether the agent acted or sat still. */
function snapshot(dir, files) {
  return Object.fromEntries(
    files.map((f) => {
      const full = path.join(dir, f);
      return [f, existsSync(full) ? readFileSync(full, 'utf8') : null];
    }),
  );
}

function checkFiles(dir, expectations) {
  const problems = [];
  for (const { file, matches = [], notMatches = [] } of expectations) {
    const full = path.join(dir, file);
    if (!existsSync(full)) {
      problems.push(`${file} is gone`);
      continue;
    }
    const text = readFileSync(full, 'utf8');
    for (const pattern of matches) {
      if (!new RegExp(pattern, 'm').test(text)) problems.push(`${file} lacks /${pattern}/`);
    }
    for (const pattern of notMatches) {
      if (new RegExp(pattern, 'm').test(text)) problems.push(`${file} still has /${pattern}/`);
    }
  }
  return problems;
}

const all = JSON.parse(readFileSync(path.join(HERE, 'cases.json'), 'utf8'));
const cases = ONLY ? all.filter((c) => c.id === ONLY) : all;
if (cases.length === 0) {
  console.error(`no case named "${ONLY}" — have: ${all.map((c) => c.id).join(', ')}`);
  process.exit(2);
}

// Outside the repository on purpose: a work tree inside it puts this repo's
// CLAUDE.md, and through it AGENTS.md, into the agent's context.
const WORK = mkdtempSync(path.join(os.tmpdir(), 'gatling-eval-'));
let worst = 1;

for (const testCase of cases) {
  const failures = [];
  let passes = 0;
  let broken = false;

  for (let i = 0; i < RUNS && !broken; i++) {
    const dir = path.join(WORK, `${testCase.id}-${i + 1}`);
    try {
      render(testCase.line, dir, REGISTRY);
    } catch (error) {
      console.log(`BROKEN ${testCase.id.padEnd(12)} render failed: ${error.message.slice(0, 120)}`);
      broken = true;
      break;
    }

    if (!compiles(dir)) {
      console.log(`BROKEN ${testCase.id.padEnd(12)} fixture does not compile before the agent runs`);
      broken = true;
      break;
    }

    stageSkills(dir);
    const before = snapshot(dir, testCase.unchanged || []);
    const { opened, failed } = askAgent(dir, testCase.prompt);
    if (failed) {
      failures.push(`run ${i + 1}: ${failed}`);
      continue;
    }

    const after = snapshot(dir, testCase.unchanged || []);
    const problems = [
      ...(compiles(dir) ? [] : ['does not compile after the migration']),
      ...checkFiles(dir, testCase.expect || []),
      ...Object.keys(before)
        .filter((f) => before[f] !== after[f])
        .map((f) => `${f} was edited and should not have been`),
      ...(testCase.reads || [])
        .filter((s) => !opened.some((o) => o.includes(s)))
        .map((s) => `never opened ${s}`),
      ...(testCase.readsNone || [])
        .filter((s) => opened.some((o) => o.includes(s)))
        .map((s) => `opened ${s}`),
    ];
    if (problems.length === 0) passes++;
    else failures.push(`run ${i + 1}: ${problems.join('; ')}`);
  }

  if (broken) {
    worst = 0;
    continue;
  }

  const rate = passes / RUNS;
  worst = Math.min(worst, rate);
  const mark = rate === 1 ? 'ok' : rate === 0 ? 'FAIL' : 'FLAKY';
  console.log(`${mark.padEnd(6)} ${testCase.id.padEnd(12)} ${passes}/${RUNS}`);
  if (rate < 1) {
    console.log(`       ${testCase.why}`);
    for (const failure of failures) console.log(`       ${failure}`);
  }
}

console.log(`\nisolation: ${ISOLATION.join(' ')}   work tree: ${WORK}`);
process.exit(worst === 1 ? 0 : 1);
