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
