/**
 * Minimal YAML frontmatter reader for SKILL.md.
 *
 * The portable Agent Skills core is `name` and `description` — flat scalars.
 * Anything richer (lists, nested maps, block scalars) is agent-specific and is
 * reported as unsupported rather than silently parsed, which is exactly what
 * check-portability.mjs wants to flag.
 */

const DELIMITER = /^---\s*$/;
// Folded and literal block scalars, with every chomping/indentation indicator YAML allows.
const BLOCK_SCALAR = /^[|>][+-]?\d*[+-]?$/;

export function parseFrontmatter(source) {
  const lines = source.split(/\r?\n/);
  if (lines.length === 0 || !DELIMITER.test(lines[0])) {
    return { found: false, fields: {}, unsupported: [], bodyLines: lines.length };
  }

  const end = lines.findIndex((line, i) => i > 0 && DELIMITER.test(line));
  if (end === -1) {
    return { found: false, malformed: true, fields: {}, unsupported: [], bodyLines: lines.length };
  }

  const fields = {};
  const unsupported = [];
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
    fields[key] = unquote(value);
  }

  return { found: true, fields, unsupported, bodyLines: lines.length - end - 1 };
}

function unquote(value) {
  const quoted = /^(['"])(.*)\1$/.exec(value);
  return quoted ? quoted[2] : value;
}
