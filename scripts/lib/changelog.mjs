import { stripNonProse } from './markdown.mjs';

const HEADING = /^##\s/;
// Keep a Changelog puts `[1.1.0]: https://…` definitions at the end of the file.
// They belong to the document, not to its last release, and render as nothing.
const REFERENCE_DEFINITION = /^\[[^\]]+\]:\s*\S+\s*$/;

/** Keep a Changelog writes `## [1.1.0] - 2026-07-28`; a bare `## 1.1.0` is accepted too. */
function headingFor(version) {
  const escaped = version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^##\\s+\\[?${escaped}\\]?(?:\\s|$)`);
}

/**
 * The section for `version`, without its heading — the release notes for it, and
 * the reason nothing is generated from commit subjects: two descriptions of one
 * release drift, and this is the one the version-bump gate already demands.
 *
 * Null when there is no such section: a missing entry is the caller's error to
 * report, not ours to paper over with an empty release body.
 */
export function changelogSection(source, version) {
  const lines = source.split('\n');
  // Matched against stripped prose, so a `## ` inside a fenced example — this
  // repository documents changelog format — cannot open or close a section.
  const prose = stripNonProse(source).split('\n');
  const heading = headingFor(version);

  const start = prose.findIndex((line) => heading.test(line));
  if (start === -1) return null;
  let end = start + 1;
  while (end < prose.length && !HEADING.test(prose[end])) end += 1;

  const body = lines.slice(start + 1, end);
  // Blank lines go with them, so a definition list separated by one is trimmed
  // whole rather than down to its first entry.
  while (body.length > 0) {
    const last = body[body.length - 1].trim();
    if (last !== '' && !REFERENCE_DEFINITION.test(last)) break;
    body.pop();
  }
  return body.join('\n').trim();
}
