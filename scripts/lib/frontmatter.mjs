/**
 * Minimal YAML frontmatter reader for SKILL.md.
 *
 * The portable Agent Skills core is `name` and `description` — flat scalars.
 * Anything richer (lists, nested maps, block scalars) is agent-specific and is
 * reported as unsupported rather than silently parsed, which is exactly what
 * check-portability.mjs wants to flag.
 *
 * Being more permissive than YAML is the point — a reader that threw could not
 * report anything — but it is also a hazard: a line this accepts and a real
 * parser rejects ships a skill that installs with empty metadata. Every accepted
 * value is therefore checked back against the constructs a parser would choke
 * on, and reported in `invalid`.
 */

const DELIMITER = /^---\s*$/;
// Folded and literal block scalars, with every chomping/indentation indicator YAML allows.
const BLOCK_SCALAR = /^[|>][+-]?\d*[+-]?$/;

/**
 * What every agent does with frontmatter it cannot parse: the block is dropped
 * whole, so the failure is never one field. Claude Code says so out loud —
 * "at runtime this skill loads with empty metadata" — and Cursor and Codex are
 * no kinder. Naming it is what makes a quoting nit read as the outage it is.
 */
const DROPS_EVERYTHING = 'the whole block fails to parse and the skill loads with no metadata';

/** A quoted scalar closed on its own line. Anything else stops short of the line's end. */
const QUOTED = { "'": /^'(?:[^']|'')*'$/, '"': /^"(?:[^"\\]|\\.)*"$/ };

/**
 * Indicators a plain (unquoted) scalar may not open with. `-` and `?` count only
 * when whitespace follows — `- x` starts a sequence, `-x` is just a string. A
 * bare `|`/`>` never reaches here; that is a block scalar, reported above.
 *
 * Only characters both yaml@2 and js-yaml throw on. The rest of YAML's indicator
 * set is deliberately absent: `[`/`{` open a flow collection that is perfectly
 * legal once closed (`allowed-tools: [Read, Grep]`), parsers disagree about a
 * leading `,`/`]`/`}`, and `#`/`&`/`!` mangle the value rather than reject it.
 * Each of those already fails the capital-letter rule, and a message claiming a
 * parse failure has to be true of every parser that will read the file.
 */
const PLAIN_FIRST = /^(?:[*%@`|>]|[-?](?=\s|$))/;

export function parseFrontmatter(source) {
  const lines = source.split(/\r?\n/);
  if (lines.length === 0 || !DELIMITER.test(lines[0])) {
    return { found: false, fields: {}, unsupported: [], invalid: [], bodyLines: lines.length };
  }

  const end = lines.findIndex((line, i) => i > 0 && DELIMITER.test(line));
  if (end === -1) {
    return {
      found: false,
      malformed: true,
      fields: {},
      unsupported: [],
      invalid: [],
      bodyLines: lines.length,
    };
  }

  const fields = {};
  const unsupported = [];
  const invalid = [];
  for (let i = 1; i < end; i += 1) {
    const line = lines[i];
    if (line.trim() === '' || line.trim().startsWith('#')) continue;
    if (/^\s/.test(line) || line.trimStart().startsWith('-')) {
      unsupported.push({ line: i + 1, text: line.trim(), reason: 'nested or list value' });
      continue;
    }
    const match = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line);
    if (!match) {
      unsupported.push({ line: i + 1, text: line.trim(), reason: 'not a "key: value" pair' });
      continue;
    }
    const [, key, rawValue] = match;
    const value = rawValue.trim();
    if (value === '' || BLOCK_SCALAR.test(value)) {
      unsupported.push({ line: i + 1, text: line.trim(), reason: 'block or empty value' });
      continue;
    }
    const problem = valueProblem(value);
    // Recorded, not dropped. The field is gone at runtime, but withholding it
    // here would fire "frontmatter is missing name" on top of the real cause.
    if (problem) invalid.push({ line: i + 1, key, reason: problem });
    fields[key] = unquote(value);
  }

  return { found: true, fields, unsupported, invalid, bodyLines: lines.length - end - 1 };
}

/**
 * Why a real YAML parser reads this value as something other than the text on
 * the line, or null when it reads it verbatim. Every one of these is fixed by
 * quoting, which is why the caller can offer one fix for all of them.
 *
 * Deliberately not a YAML parser: `scripts/lib/` is dependency-free, and the
 * portable core is two flat scalars, so the whole surface is one line's value.
 * The rules are checked against yaml@2 and js-yaml in tests/checks.test.mjs —
 * over-rejecting here would block a legitimate description, so both directions
 * are pinned there.
 */
function valueProblem(value) {
  const closed = QUOTED[value[0]];
  if (closed) {
    // Covers the unterminated string and the fix-gone-wrong: quoting a value to
    // survive its colon, when the value also carries an apostrophe.
    return closed.test(value)
      ? null
      : `the quoted value closes before the end of the line (an apostrophe inside single quotes must be doubled) — ${DROPS_EVERYTHING}`;
  }
  const [indicator] = PLAIN_FIRST.exec(value) ?? [];
  if (indicator) return `an unquoted value cannot start with "${indicator}" — ${DROPS_EVERYTHING}`;
  // Mid-value ": " is the mapping indicator, and a trailing ":" opens a nested map.
  if (/:(\s|$)/.test(value)) return `an unquoted value cannot contain ": " — ${DROPS_EVERYTHING}`;
  // Parses, but " #" opens a comment: the value silently loses its tail.
  if (/\s#/.test(value)) return '" #" opens a comment, so the value is cut off there';
  return null;
}

function unquote(value) {
  const quoted = /^(['"])(.*)\1$/.exec(value);
  return quoted ? quoted[2] : value;
}
