# Demo Plugin

Fixture plugin for the repository test suite. It exists so the checks have a
known-good input, and so the Markdown scanner has prose that must NOT trip it.

A link that resolves: [the demo skill](skills/demo-skill/SKILL.md).

An example of link syntax, inside a fence, pointing at a file that does not exist:

```markdown
See [the deep dive](./references/deep-dive.md) for details.
```

The same in an inline code span: `[nope](./missing.md)`.

<!-- And in an HTML comment: [also nope](./missing-too.md) -->

A footnote definition, whose text must not be read as a path.[^1]

[^1]: See the upstream documentation for details.
