# Plugins, skills and the three dialects

Reference for anyone authoring in this repository. Everything below was checked
against the primary docs of each vendor; links at the bottom.

## Skill: the unit of capability

A skill is a directory containing `SKILL.md` — YAML frontmatter (`name`,
`description`), a Markdown body, and optional `scripts/`, `references/`, `assets/`.

It loads by progressive disclosure, in three stages:

1. **Discovery** — only `name` and `description` sit in context at startup.
2. **Activation** — the body is read when the agent judges the task a match.
3. **Execution** — referenced files load on demand.

This is the [Agent Skills](https://agentskills.io) open standard: originated at
Anthropic, released openly, governed under the Linux Foundation's Agentic AI
Foundation. The same `SKILL.md` is read by Claude Code, Cursor, Codex CLI, Gemini CLI
and others.

## Plugin: the unit of distribution

A plugin is a directory with a manifest that bundles skills plus what a bare skill
cannot carry: subagents, rules, hooks, MCP servers, connectors, LSP servers. It is the
versioned, installable, shareable thing. Marketplaces list plugins, not loose skills.

Cursor Team Kit 1.2.0 is a good reference shape: 18 skills, 2 subagents, 2 rules —
installed as one unit.

## Choosing a primitive

| Primitive                               | Loads                     | Good for                                | Context cost                           |
| --------------------------------------- | ------------------------- | --------------------------------------- | -------------------------------------- |
| Rule (`.mdc`), `AGENTS.md`, `CLAUDE.md` | always                    | short invariants                        | every request                          |
| Skill                                   | on relevance or `/name`   | procedures, workflows, domain knowledge | name + description always; body on use |
| Command                                 | explicit `/name` only     | a skill you never want auto-invoked     | same as skill                          |
| Subagent                                | on call, separate context | parallel or isolated work               | none in the main context               |
| Hook                                    | on lifecycle event        | deterministic automation                | none                                   |
| MCP server                              | on tool call              | external systems                        | tool schemas                           |

Commands have effectively merged into skills. Claude Code treats
`.claude/commands/deploy.md` and `.claude/skills/deploy/SKILL.md` as the same `/deploy`.
Cursor 2.4 ships `/migrate-to-skills`, which converts dynamic rules and slash commands
into skills and marks the converted commands `disable-model-invocation: true`.

## The three dialects

|                    | Cursor                               | Claude Code                           | Codex                                     |
| ------------------ | ------------------------------------ | ------------------------------------- | ----------------------------------------- |
| Plugin manifest    | `.cursor-plugin/plugin.json`         | `.claude-plugin/plugin.json`          | `.codex-plugin/plugin.json`               |
| Marketplace file   | `.cursor-plugin/marketplace.json`    | `.claude-plugin/marketplace.json`     | `.agents/plugins/marketplace.json`        |
| Skills in a plugin | `skills/<name>/SKILL.md`             | same                                  | same                                      |
| Loose skill dirs   | `.cursor/skills/`, `.agents/skills/` | `.claude/skills/`                     | `.agents/skills/`                         |
| Subagents          | `agents/`                            | `agents/`                             | not supported                             |
| Rules              | `rules/*.mdc`                        | not supported                         | not supported                             |
| MCP config         | `mcp.json` by default                | `.mcp.json` by default                | `.mcp.json` by default                    |
| Hooks              | `hooks/hooks.json`                   | `hooks/hooks.json`                    | `hooks/hooks.json`                        |
| Add a marketplace  | UI, or the publish form              | `/plugin marketplace add owner/repo`  | `codex plugin marketplace add owner/repo` |
| Local testing      | `~/.cursor/plugins/local`            | `claude plugin validate ./p --strict` | local marketplace source                  |

Manifest fields overlap by roughly 90%: `name` (the only required one, kebab-case),
`displayName`, `version`, `description`, `author`, `homepage`, `repository`, `license`,
`keywords`, plus component paths. Claude Code explicitly ignores unrecognized top-level
fields, which is what makes a shared authored source practical.

Divergences that matter:

- Cursor `rules/` has no equivalent elsewhere.
- Codex has no subagents.
- Codex adds `.app.json` for connectors and an `interface{}` block for store metadata.
- The default MCP filename differs — Cursor looks for `mcp.json`, the other two for
  `.mcp.json` — but all three accept an explicit `mcpServers` path in the manifest.
  Declaring the path is what lets one authored file serve all three; relying on the
  defaults would force a duplicate. The same holds for `hooks`.

## Frontmatter: portable core versus extensions

Portable: `name`, `description`, body. That is the whole contract.

Extensions, by owner:

- Claude Code — `when_to_use`, `allowed-tools`, `disallowed-tools`, `argument-hint`,
  `arguments`, `user-invocable`, `model`, `effort`. Note that `description` plus
  `when_to_use` is truncated at 1536 characters in the skill listing, so the primary
  use case must come first.
- Cursor — `paths` (glob restriction), `metadata`.
- Codex — nothing in the frontmatter; UI metadata lives in a sidecar `agents/openai.yaml`.
- Claude Code and Cursor share `disable-model-invocation`; Codex does not.

## Discovery order and name collisions

- **Claude Code** — enterprise overrides personal (`~/.claude/skills/`), which overrides
  project (`.claude/skills/`); any of them overrides a bundled skill of the same name.
  Plugin skills are namespaced `plugin-name:skill-name` and cannot collide. Nested
  `.claude/skills/` in a monorepo become `apps/web:deploy`. Editing `SKILL.md` takes
  effect in the live session; changing `hooks/`, `.mcp.json` or `agents/` needs
  `/reload-plugins`.
- **Codex** — `.agents/skills` in the working directory, then parents, then
  `~/.agents/skills`, then `/etc/codex/skills`, then built-ins.
- **Cursor** — `.cursor/skills/` and `.agents/skills/` per project, the same two under
  `~`, plus nested directories in a monorepo.

Cross-agent trap: `.agents/skills/` is read by Cursor and Codex but **not** by Claude
Code, which only looks in `.claude/skills/`. Shipping as a plugin sidesteps this — all
three manifests point at the same physical `skills/` directory.

## Publishing

**Cursor.** Public git repo, `.cursor-plugin/plugin.json`, optional
`.cursor-plugin/marketplace.json` for multi-plugin repos. Test locally from
`~/.cursor/plugins/local`, then submit at `cursor.com/marketplace/publish`. Manual
security review; the repository must be open source. Teams plan gets one private
marketplace, Enterprise unlimited, with Default Off / Default On / Required install
modes.

**Claude Code.** No gatekeeper: any git repo with `.claude-plugin/marketplace.json` is a
marketplace. `source` accepts a relative path, `github`, `url`, `git-subdir` or `npm`.
Validate with `claude plugin validate ./plugin --strict`. Always set `version` — without
it, Claude Code falls back to the git SHA and every commit ships as an update. Some
marketplace names are reserved for Anthropic and refuse to load.

**Codex.** `.codex-plugin/plugin.json` plus `.agents/plugins/marketplace.json`;
`codex plugin marketplace add owner/repo`, browse with `/plugins`, invoke a skill with
`$name`. The public directory goes through OpenAI Platform review.

## Sources

- [Cursor plugins reference](https://cursor.com/docs/reference/plugins)
- [Cursor Agent Skills](https://cursor.com/docs/skills)
- [Cursor plugins](https://cursor.com/docs/plugins)
- [cursor/plugins](https://github.com/cursor/plugins)
- [Claude Code plugins reference](https://code.claude.com/docs/en/plugins-reference)
- [Claude Code plugin marketplaces](https://code.claude.com/docs/en/plugin-marketplaces)
- [Claude Code skills](https://code.claude.com/docs/en/skills)
- [Codex: build skills](https://learn.chatgpt.com/docs/build-skills)
- [Codex: build plugins](https://developers.openai.com/codex/plugins/build)
- [Agent Skills standard](https://agentskills.io)
