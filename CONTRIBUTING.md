# Contributing to Galaxio Performance Kit

## 1. What belongs here

One plugin covers one coherent topic. A plugin named `utils`, `helpers` or `misc` will
be rejected — Cursor's marketplace review scores scope tightness on its own, and a
vague plugin is also a plugin nobody can decide to install.

Before adding, check that no existing plugin already covers the workflow. Extending an
existing plugin beats shipping a near-duplicate.

## 2. Skill, rule, subagent, hook or MCP server

| The thing you want                                          | Use                                                                                 |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| A one-line invariant that must hold in every conversation   | rule (`rules/*.mdc`, Cursor only — mirror the text into `AGENTS.md` for the others) |
| A procedure, checklist or workflow                          | skill                                                                               |
| Work that needs its own context window, or runs in parallel | subagent (`agents/`, Cursor and Claude Code)                                        |
| A deterministic reaction to an event                        | hook (`hooks/hooks.json`)                                                           |
| Access to an external system                                | MCP server (`.mcp.json`)                                                            |

Default to a skill. Rules are in context on every request and add up; skills cost only
their `description` until the agent decides to use them.

## 3. Writing `description`

`description` is not a human-facing blurb. It is the only text the agent sees when
deciding whether to load the skill.

- Lead with the primary use case, not with background.
- Use the verbs and nouns that appear in real requests.
- Name the triggers: file types, tools, error messages, commands.

A weak `description` means the skill never fires, no matter how good the body is.

## 4. What goes in `SKILL.md`

The body loads in full every time the skill activates. Keep it to what is always
needed and push the rest out:

- `references/` — lookup material the skill points at by name
- `scripts/` — anything deterministic enough to execute
- `assets/` — templates and fixtures

The portability check fails a `SKILL.md` body over 500 lines.

Whatever you push out has to be linked back: `check-links.mjs` fails a bundled file that no
link from `SKILL.md` reaches, transitively and within the skill. A reference the agent cannot
discover is dead weight that still ships, and the next author edits it believing it is live.
`agents/` and marker files like `.gitkeep` are exempt — nothing can link them.

## 5. Portable frontmatter only

Allowed keys: `name` and `description`. Nothing else.

Rejected, with the agent that owns them: `when_to_use`, `allowed-tools`,
`disallowed-tools`, `argument-hint`, `arguments`, `user-invocable`, `model`, `effort`
(Claude Code); `paths`, `metadata` (Cursor); `disable-model-invocation` (Claude Code
and Cursor, not Codex).

Agent-specific behaviour goes in a sidecar next to the skill — for example
`agents/openai.yaml` for Codex UI metadata — never in the shared frontmatter.

## 6. Metadata and versions

`plugins/<name>/plugin.meta.json` is the only _metadata_ file you edit. The six
generated artifacts — three per-plugin manifests and three marketplace catalogs —
are produced by `npm run sync` and must not be touched in a PR. Your skills,
scripts, README and CHANGELOG are of course yours to write.

Every change to a plugin needs:

- a `version` bump in `plugin.meta.json`, semver, strictly greater than `main`
- a matching entry in `plugins/<name>/CHANGELOG.md` (Keep a Changelog format)

This is enforced. Without a version bump, Claude Code keeps serving the previous
release to everyone who already installed the plugin.

## 7. Secrets

Never commit a credential, not even a throwaway one.

- Cursor: declare `cursor.variables` in `plugin.meta.json` and reference them as `${VAR}`
- Claude Code: declare `userConfig` in `plugin.meta.json` and let the user fill it at enable time

Both are passed through to the generated manifests by `npm run sync`.

`check-security.mjs` fails any `hooks.json`, `.mcp.json` or `mcp.json` where a
token-shaped key holds a literal value, and any machine-specific absolute path such as
`/Users/you/...`.

## 8. Scripts inside a plugin

- live in `scripts/`, with a shebang and the executable bit
- idempotent: running twice must be safe
- non-zero exit on failure, with the reason on stderr
- no destructive action without an explicit flag; never delete or push by default

Only source files are allowed under `plugins/`. Binaries and archives are rejected.

## 9. Before opening a PR

```bash
npm run check && npm test
```

```bash
npm run format:check && npm run lint:md && npm run spell
```

```bash
claude plugin validate ./plugins/<name> --strict
```

Then install the plugin in at least one agent and exercise the skill for real:

- Claude Code — `/plugin marketplace add /abs/path/ai-plugins`, then `/plugin install <name>@galaxio-performance-kit`
- Cursor — copy `plugins/<name>` into `~/.cursor/plugins/local` (the `.cursor-plugin/plugin.json` manifest must sit at the plugin root), run **Developer: Reload Window**, check the Customize panel
- Codex — `codex plugin marketplace add /abs/path/ai-plugins`, then `/plugins`, invoke with `$<skill-name>`

State in the PR which agent you verified in.

## 10. PR checklist

Use the template in `.github/pull_request_template.md`. It repeats the gates above so
review can focus on whether the plugin is worth shipping.

## 11. Review

`plugins/**`, `scripts/**`, `schemas/**` and `.github/**` are covered by CODEOWNERS and
need an approval. Reviewers check the CI gates plus the two things CI cannot judge:
whether the plugin earns its place, and whether it overlaps something already here.
