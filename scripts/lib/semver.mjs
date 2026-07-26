// Anchored: trailing garbage such as "1.0.0.5" must throw, not silently compare equal.
// Build metadata is captured only to be ignored — semver says it never affects precedence.
const SEMVER = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/;
const NUMERIC = /^\d+$/;

/** -1, 0 or 1. Throws on anything the plugin schema would have rejected anyway. */
export function compareSemver(a, b) {
  const pa = SEMVER.exec(a);
  const pb = SEMVER.exec(b);
  if (!pa || !pb) throw new Error(`unparseable version: ${!pa ? a : b}`);

  for (let i = 1; i <= 3; i += 1) {
    const diff = Number(pa[i]) - Number(pb[i]);
    if (diff !== 0) return Math.sign(diff);
  }

  // A release outranks any prerelease carrying the same numbers.
  if (!pa[4] && !pb[4]) return 0;
  if (!pa[4]) return 1;
  if (!pb[4]) return -1;
  return comparePrerelease(pa[4], pb[4]);
}

/**
 * Per semver: identifiers are compared dot-separated, numeric ones numerically
 * (so rc.10 > rc.9), numeric always lower than alphanumeric, and a shorter
 * identifier list loses when every shared field is equal.
 */
function comparePrerelease(a, b) {
  const left = a.split('.');
  const right = b.split('.');

  for (let i = 0; i < Math.min(left.length, right.length); i += 1) {
    const x = left[i];
    const y = right[i];
    if (x === y) continue;

    const xNumeric = NUMERIC.test(x);
    const yNumeric = NUMERIC.test(y);
    if (xNumeric && yNumeric) return Math.sign(Number(x) - Number(y));
    if (xNumeric !== yNumeric) return xNumeric ? -1 : 1;
    return x < y ? -1 : 1;
  }

  return Math.sign(left.length - right.length);
}
