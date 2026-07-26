/**
 * Dependency-free validator for the JSON Schema subset used by schemas/*.json.
 *
 * Deliberately small: `npm run check` must work on a clean clone with no install
 * step. The dangerous failure mode for a subset validator is silence — a keyword
 * it does not implement would read as "constraint satisfied" forever. So the
 * supported set is explicit, and anything outside it throws at validation time
 * rather than passing quietly. Widening the schema means widening this file.
 */

const SUPPORTED = new Set([
  '$schema',
  '$id',
  'title',
  'description',
  'type',
  'const',
  'enum',
  'pattern',
  'minLength',
  'maxLength',
  'minItems',
  'maxItems',
  'uniqueItems',
  'items',
  'required',
  'properties',
  'additionalProperties',
  'minProperties',
  'maxProperties',
]);

function typeOf(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

function matchesType(value, expected) {
  const actual = typeOf(value);
  if (expected === 'integer') return actual === 'number' && Number.isInteger(value);
  return actual === expected;
}

export function validate(schema, data, pointer = '') {
  const errors = [];
  const at = pointer || '(root)';

  for (const keyword of Object.keys(schema)) {
    if (!SUPPORTED.has(keyword)) {
      throw new Error(
        `schema at ${at} uses "${keyword}", which scripts/lib/schema.mjs does not implement — implement it or the constraint is not enforced`,
      );
    }
  }

  if (schema.type !== undefined) {
    const expected = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!expected.some((t) => matchesType(data, t))) {
      errors.push(`${at}: expected ${expected.join(' or ')}, got ${typeOf(data)}`);
      return errors;
    }
  }

  if (schema.const !== undefined && data !== schema.const) {
    errors.push(`${at}: must be ${JSON.stringify(schema.const)}`);
  }

  if (schema.enum !== undefined && !schema.enum.includes(data)) {
    errors.push(`${at}: must be one of ${schema.enum.join(', ')}`);
  }

  if (typeof data === 'string') {
    if (schema.pattern !== undefined && !new RegExp(schema.pattern).test(data)) {
      errors.push(`${at}: ${JSON.stringify(data)} does not match ${schema.pattern}`);
    }
    if (schema.minLength !== undefined && data.length < schema.minLength) {
      errors.push(`${at}: shorter than ${schema.minLength} characters`);
    }
    if (schema.maxLength !== undefined && data.length > schema.maxLength) {
      errors.push(`${at}: longer than ${schema.maxLength} characters`);
    }
  }

  if (Array.isArray(data)) {
    if (schema.minItems !== undefined && data.length < schema.minItems) {
      errors.push(`${at}: needs at least ${schema.minItems} item(s)`);
    }
    if (schema.maxItems !== undefined && data.length > schema.maxItems) {
      errors.push(`${at}: more than ${schema.maxItems} item(s)`);
    }
    if (schema.uniqueItems && new Set(data.map((v) => JSON.stringify(v))).size !== data.length) {
      errors.push(`${at}: items must be unique`);
    }
    if (schema.items) {
      data.forEach((item, i) => errors.push(...validate(schema.items, item, `${pointer}[${i}]`)));
    }
  }

  if (typeOf(data) === 'object') {
    const size = Object.keys(data).length;
    if (schema.minProperties !== undefined && size < schema.minProperties) {
      errors.push(`${at}: needs at least ${schema.minProperties} entries, has ${size}`);
    }
    if (schema.maxProperties !== undefined && size > schema.maxProperties) {
      errors.push(`${at}: has ${size} entries, more than the ${schema.maxProperties} allowed`);
    }
    for (const key of schema.required ?? []) {
      if (!Object.hasOwn(data, key)) errors.push(`${at}: missing required property "${key}"`);
    }
    const known = new Set(Object.keys(schema.properties ?? {}));
    if (schema.additionalProperties === false) {
      for (const key of Object.keys(data)) {
        if (!known.has(key)) errors.push(`${at}: unknown property "${key}"`);
      }
    }
    for (const [key, subSchema] of Object.entries(schema.properties ?? {})) {
      if (Object.hasOwn(data, key)) {
        errors.push(...validate(subSchema, data[key], pointer ? `${pointer}.${key}` : key));
      }
    }
  }

  return errors;
}
