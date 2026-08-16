/**
 * Minimal YAML frontmatter reader for SKILL.md.
 *
 * The portable Agent Skills core is `name` and `description` — flat scalars.
 * Anything richer is agent-specific and lands in `unsupported`.
 *
 * The reader has to be more permissive than YAML — one that threw could report
 * nothing — so it reads each scalar the way a parser would and puts every line
 * where the two answers differ in `invalid`. `fields` holds the decoded value.
 * The corpus in tests/checks.test.mjs is replayed against `yaml` and `js-yaml`
 * to keep the two answers in step.
 */

const DELIMITER = /^---\s*$/;
// Folded and literal block scalars, with every chomping/indentation indicator YAML allows.
const BLOCK_SCALAR = /^[|>][+-]?\d*[+-]?$/;

const DROPS_EVERYTHING = 'the whole block fails to parse and the skill loads with no metadata';

/** A quoted scalar up to its closing quote; trailing text is the caller's problem. */
const QUOTED = { "'": /^'(?:[^']|'')*'/, '"': /^"(?:[^"\\]|\\.)*"/ };

// The same, accepting only the escapes YAML defines: a backslash outside this
// set throws in both parsers, so `"C:\Users\me"` is a broken value.
// cspell:ignore abtnvfre — a character class of escape letters, not a word.
const DQ_ESCAPED =
  /^"(?:[^"\\]|\\(?:[0abtnvfre"/\\N_LP \t]|x[0-9A-Fa-f]{2}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8}))*"/;

/** Everything YAML allows after a closed quoted scalar: blanks, then a comment. */
const AFTER_QUOTED = /^\s*(?:#.*)?$/;

const UNESCAPE = {
  '0': '\0', a: '\x07', b: '\b', t: '\t', n: '\n', v: '\v', f: '\f', r: '\r',
  e: '\x1b', '"': '"', '/': '/', '\\': '\\', N: '\u0085', _: '\u00a0',
  L: '\u2028', P: '\u2029',
};

// Indicators no plain scalar may open with, split by what a parser then does —
// one message cannot be true of all three. `-`, `?` and `:` count only when
// whitespace follows: `- x` starts a sequence, `-x` is a string. A bare `|`/`>`
// never reaches here; that is a block scalar, reported as unsupported.
const FATAL_FIRST = /^(?:[*%@`|>]|[-?:](?=\s|$))/;

/** Parses, but into something that is not the text on the line. */
const READS_AS = {
  '[': 'a list, not as text',
  '{': 'a map, not as text',
  '#': 'a comment, so the value is empty',
  '&': 'an anchor, which is stripped from the value',
  '!': 'a tag: yaml strips it and js-yaml rejects the block',
};

// `yaml` throws, `js-yaml` keeps the text. Reported rather than excused: a gate
// asking whether a skill loads in all three agents has to reject what any
// parser rejects, or it is fail-open.
const DISPUTED_FIRST = /^[,\]}]/;

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
    // Both parsers reject a repeated key and drop the block with it, so the
    // second line is not an override — it is the whole file failing to load.
    if (Object.hasOwn(fields, key)) {
      invalid.push({ ...fatal(`"${key}" is set twice`).problem, line: i + 1, key });
    }
    const { text, problem } = readScalar(value);
    // Recorded, not dropped. The field is gone at runtime, but withholding it
    // here would fire "frontmatter is missing name" on top of the real cause.
    if (problem) invalid.push({ ...problem, line: i + 1, key });
    fields[key] = text ?? value;
  }

  return { found: true, fields, unsupported, invalid, bodyLines: lines.length - end - 1 };
}

/**
 * The string a YAML parser reads from one value, or why it reads something the
 * author did not write. Every problem is fixed by quoting, which is why the
 * caller can offer one fix for all of them.
 */
function readScalar(value) {
  const scan = QUOTED[value[0]];
  if (scan) {
    const quote = value[0];
    const found = scan.exec(value);
    if (!found) return fatal(`the ${quote}-quoted value is never closed`);
    if (!AFTER_QUOTED.test(value.slice(found[0].length))) {
      // Where the fix for a colon lands when the value also holds an apostrophe:
      // YAML closes the string at that apostrophe and chokes on the remainder.
      return fatal(`text follows the closing ${quote}, so the value ends early`);
    }
    if (quote === '"' && !DQ_ESCAPED.test(found[0])) {
      return fatal('a backslash here does not open a YAML escape');
    }
    const body = found[0].slice(1, -1);
    return { text: quote === "'" ? body.replaceAll("''", "'") : unescape(body) };
  }

  const [indicator] = FATAL_FIRST.exec(value) ?? [];
  if (indicator) return fatal(`an unquoted value cannot start with "${indicator}"`);

  const reads = READS_AS[value[0]];
  if (reads) return lossy(`an unquoted value opening with "${value[0]}" reads as ${reads}`);

  const [disputed] = DISPUTED_FIRST.exec(value) ?? [];
  if (disputed) {
    // yaml throws where js-yaml keeps the text, so at least one agent loads nothing.
    return fatal(
      `an unquoted value cannot start with "${disputed}" — yaml rejects it and js-yaml keeps it, so what loads depends on the agent, and`,
    );
  }

  // Mid-value ": " is the mapping indicator, and a trailing ":" opens a nested map.
  if (/:(\s|$)/.test(value)) return fatal('an unquoted value cannot contain ": "');
  // Parses, but " #" opens a comment: the value silently loses its tail.
  if (/\s#/.test(value)) return lossy('" #" opens a comment, so the value is cut off there');

  return { text: value };
}

/** At least one parser rejects the block outright, so no field in it loads. */
function fatal(reason) {
  return { problem: { reason: `${reason} — ${DROPS_EVERYTHING}`, fatal: true } };
}

/** The block parses, but this one value is not the text on the line. */
function lossy(reason) {
  return { problem: { reason, fatal: false } };
}

function unescape(body) {
  return body.replace(/\\(x[0-9A-Fa-f]{2}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8}|[\s\S])/g, (_, esc) =>
    esc.length > 1
      ? String.fromCodePoint(Number.parseInt(esc.slice(1), 16))
      : (UNESCAPE[esc] ?? esc),
  );
}
