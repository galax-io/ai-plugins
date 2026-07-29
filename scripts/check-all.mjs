#!/usr/bin/env node
/**
 * Runs every check and reports all of their failures.
 *
 * An `&&` chain stops at the first non-zero exit, which means the cheapest and
 * most common failure hides the most important one: forget `npm run sync`, and
 * the manifest-drift error is the only thing anyone sees — a leaked credential
 * in the same commit goes unreported until someone regenerates and pushes again.
 * Each check already collects all of its own problems into one Reporter rather
 * than stopping at the first; this extends that to the set of checks.
 *
 * Ordering here is presentation only. Every check runs regardless, and the exit
 * code is non-zero if any of them failed.
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const CHECKS = [
  ['sync-manifests.mjs', '--check'],
  ['check-security.mjs'],
  ['check-portability.mjs'],
  ['check-links.mjs'],
];

const dir = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
let failed = 0;

for (const [script, ...flags] of CHECKS) {
  const result = spawnSync(process.execPath, [path.join(dir, script), ...flags, ...args], {
    stdio: 'inherit',
  });
  // A signal death or a spawn failure has no exit code; treat it as failure
  // rather than letting a killed check read as a pass.
  if (result.status !== 0) failed += 1;
}

process.exit(failed === 0 ? 0 : 1);
