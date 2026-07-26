/**
 * Credential detection for hook and MCP configuration.
 *
 * Structural rather than line-based: credentials hide in nested objects and in
 * positional argument arrays, neither of which a `"key": "value"` regex sees.
 */

const SECRETISH_KEY = /token|secret|password|passwd|api[_-]?key|credential|authorization/i;
// `--api-key <value>` in an args array is how most MCP servers actually take a key.
const SECRETISH_FLAG = /^--?[A-Za-z0-9-]*(?:token|secret|password|api[_-]?key|credential)/i;
const PLACEHOLDER = /^\$\{[^}]+\}$|^\$[A-Z_][A-Z0-9_]*$|^$/;

// Vendor prefixes assembled from parts so this file carries no contiguous token
// for a secret scanner to flag. Shapes that are a credential wherever they appear.
const CREDENTIAL_SHAPE = new RegExp(
  [
    `${'s'}k-[A-Za-z0-9-]{8,}`,
    `${'g'}h[pousr]_[A-Za-z0-9]{16,}`,
    `${'A'}KIA[0-9A-Z]{12,}`,
    `${'x'}ox[abps]-[A-Za-z0-9-]{8,}`,
    `${'e'}yJ[A-Za-z0-9_-]{16,}\\.[A-Za-z0-9_-]{8,}`,
  ].join('|'),
);

export function isPlaceholder(value) {
  return PLACEHOLDER.test(value.trim());
}

export function looksLikeCredential(value) {
  return CREDENTIAL_SHAPE.test(value);
}

/** Messages describing every literal credential in a parsed config object. */
export function findSecrets(config) {
  const problems = [];

  const visit = (node, trail) => {
    if (typeof node === 'string') {
      if (looksLikeCredential(node)) problems.push(`${trail || 'value'} looks like a live credential`);
      return;
    }
    if (Array.isArray(node)) {
      node.forEach((item, i) => {
        const next = node[i + 1];
        if (
          typeof item === 'string' &&
          SECRETISH_FLAG.test(item) &&
          typeof next === 'string' &&
          !isPlaceholder(next)
        ) {
          problems.push(`${trail}[${i}] passes "${item}" a literal value — use a \${VAR} placeholder`);
        }
        visit(item, `${trail}[${i}]`);
      });
      return;
    }
    if (node && typeof node === 'object') {
      for (const [key, value] of Object.entries(node)) {
        if (SECRETISH_KEY.test(key) && typeof value === 'string' && !isPlaceholder(value)) {
          problems.push(
            `"${key}" holds a literal value — use a \${VAR} placeholder and let the user supply it`,
          );
        }
        visit(value, trail ? `${trail}.${key}` : key);
      }
    }
  };

  visit(config, '');
  return problems;
}
