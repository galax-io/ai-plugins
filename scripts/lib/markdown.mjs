/**
 * Blanks out fenced blocks, inline code spans and HTML comments.
 *
 * This repository is documentation about writing Markdown skills, so an example
 * link inside a fence is content, not a link to resolve. Replacing with spaces
 * rather than deleting keeps every offset — and therefore every line number — intact.
 */
export function stripNonProse(source) {
  const blank = (match) => match.replace(/[^\n]/g, ' ');
  return source
    .replace(/^[ \t]*(`{3,}|~{3,})[\s\S]*?^[ \t]*\1[^\n]*$/gm, blank)
    .replace(/<!--[\s\S]*?-->/g, blank)
    .replace(/(`+)(?:(?!\1)[\s\S])*?\1/g, blank);
}

// Anchored on the `](` that opens a destination, not on the whole `[text](dest)`
// form. `matchAll` yields non-overlapping matches, so matching the outer form
// would swallow the inner destination of a nested link — `[![thumb](a.png)](b.md)`,
// an image wrapping a link, is the common shape — and reachability would then
// call the image an orphan. A destination is either <bracketed>, which may
// contain spaces, or a bare run. Titles come in all three CommonMark spellings;
// a title the pattern cannot read must not cost us the whole link, so it is
// matched loosely.
const INLINE_DESTINATION =
  /\]\(\s*(?:<([^>]*)>|([^()\s]+))(?:\s+(?:"[^"]*"|'[^']*'|\([^)]*\)))?\s*\)/g;
// `[^\]]` would also swallow a `[^1]:` footnote definition and treat the first
// word of the footnote text as a path, so reference ids may not start with `^`.
const REFERENCE_LINK = /^\s*\[(?!\^)[^\]]+\]:\s*(\S+)/gm;
// HTML is valid Markdown, and it is what an author reaches for when they need
// `width=` or `align=` on an image. Without this the file it points at looks
// unreachable.
const HTML_ATTRIBUTE =
  /<[a-zA-Z][^>]*?\s(?:src|href)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;
const EXTERNAL = /^(https?:|mailto:|tel:|#|data:)/i;

/**
 * Every local link destination in `source`, anchors stripped, in document order.
 * External schemes and bare `#anchor` links are dropped; an absolute path is
 * returned as-is so the caller can reject it with its own message.
 */
export function linkTargets(source) {
  const raw = [
    ...[...source.matchAll(INLINE_DESTINATION)].map((m) => m[1] ?? m[2]),
    ...[...source.matchAll(REFERENCE_LINK)].map((m) => m[1]),
    ...[...source.matchAll(HTML_ATTRIBUTE)].map((m) => m[1] ?? m[2] ?? m[3]),
  ];
  return raw.filter((target) => target && !EXTERNAL.test(target));
}

/** The path part of a link destination, without its `#fragment`. */
function linkPath(target) {
  return target.split('#')[0];
}

/**
 * The paths a destination may denote, most literal first. Editors percent-encode
 * a space as `%20`, so `references/my%20file.md` and `references/my file.md` are
 * the same link; a filename containing a literal `%20` is the rarer case, so the
 * undecoded form is tried first and both are offered rather than either guessed.
 */
export function linkPathVariants(target) {
  const literal = linkPath(target);
  try {
    const decoded = decodeURIComponent(literal);
    if (decoded !== literal) return [literal, decoded];
  } catch {
    // A malformed escape is not an encoding; the literal form is all there is.
  }
  return [literal];
}
