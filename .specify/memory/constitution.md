<!--
Sync Impact Report
Version change: (template) -> 1.0.0
Bump rationale: MAJOR, the first ratified constitution of galax-io/ai-plugins.
Sections:
  - Precedence (new)
  - Core Principles (new): 1. One authored source, generated manifests; 2. Portable skills;
    3. Everything bundled is reachable and shippable; 4. Every plugin change is a version and
    a release; 5. Fail-closed, dependency-free tooling; 6. Each fact has one owning skill;
    7. No secrets, no machine paths
  - Public Contracts and Compatibility (new)
  - Development Workflow and Quality Gates (new)
  - Governance (new)
Templates checked:
  - .specify/templates/plan-template.md: "Constitution Check" is filled per plan from the
    principles below; no change needed (the template is the kit's and is not edited here)
  - .specify/templates/spec-template.md, tasks-template.md: no change needed
Follow-up: none
-->

# ai-plugins Constitution

`galax-io/ai-plugins` is the Galaxio plugin marketplace (`galaxio`): plugins authored once and installed unchanged into Cursor, Claude Code and Codex. Its first plugin is `plugins/galaxio-gatling`.

## Precedence

1. The maintainer's direct instruction.
2. The ecosystem constitution (`galax-io/galaxio-sdlc-backlog`, `.specify/memory/constitution.md`).
3. This constitution.
4. `AGENTS.md` of this repository (the working guide: commands, structure, how to write a skill).

This constitution may tighten the ecosystem principles and adds the invariants of this repository; it never relaxes them. Where `AGENTS.md` disagrees with it, this file wins and `AGENTS.md` is corrected.

## Core Principles

### 1. One authored source, generated manifests

- A plugin MUST be described only by `plugins/<name>/plugin.meta.json` plus its `skills/` tree; the marketplace only by `marketplace.meta.json`.
- The six generated files (`.claude-plugin/marketplace.json`, `.cursor-plugin/marketplace.json`, `.agents/plugins/marketplace.json`, and `plugins/<name>/{.claude-plugin,.cursor-plugin,.codex-plugin}/plugin.json`) MUST NOT be edited by hand; they change only through `npm run sync`, and `npm run check` MUST pass with no drift, byte for byte.
- Knowledge of how the three agent dialects differ MUST live only in the projection functions of `scripts/sync-manifests.mjs` (`claudePlugin()`, `cursorPlugin()`, `codexPlugin()` and the marketplace counterparts).

Rationale: the single-source promise is the product. A hand-edited manifest ships a plugin to one agent that the others never see.

### 2. Portable skills

- `SKILL.md` frontmatter MUST carry only `name` and `description`, and every value MUST read the same in `yaml` and `js-yaml` (`scripts/lib/frontmatter.mjs`, `check-portability.mjs`). Agent-specific keys go in a sidecar such as `agents/openai.yaml`.
- A skill directory name MUST equal its frontmatter `name` and MUST be unique across all plugins; a plugin `name` MUST equal its directory, in kebab-case.
- A `SKILL.md` body MUST NOT exceed 500 lines; a `description` MUST start with a capital letter and stay under 1024 characters; the descriptions of one plugin MUST total under 4000.
- The descriptions of skills in one plugin MUST stay disjoint: a verb or trigger claimed by one skill MUST NOT be claimed by a sibling.

Rationale: a non-portable frontmatter installs a skill with no name and no description that never triggers; overlapping descriptions load several bodies and undo the split.

### 3. Everything bundled is reachable and shippable

- Every file under a skill (except `agents/` and the names in `EXTENSIONLESS_NAMES`, `scripts/lib/util.mjs`) MUST be reachable from its `SKILL.md` through relative links that stay inside the skill, and every relative link and `components.*` path MUST resolve (`check-links.mjs`).
- `components.*` paths MUST be relative, start with `./` and stay inside the plugin.
- Files under `plugins/` MUST be source files of the allowlisted text types or png/svg/jpg; binaries and archives MUST NOT be committed (`check-security.mjs`).
- `tests/fixtures/` MUST stay test input, excluded by path from the checks and never published.

Rationale: an unreachable file ships and is never loaded, and the next author edits it believing it is live.

### 4. Every plugin change is a version and a release

- A pull request that touches `plugins/<name>/` MUST raise its `version` in `plugin.meta.json` to a semver strictly greater than the base branch and MUST add a `## [<new version>]` section to `plugins/<name>/CHANGELOG.md` (`check-version-bump.mjs`, the `version bump` job).
- The unit of release is the marketplace: a merge to `main` publishes at most one `release-<date>`, built by `scripts/release.mjs` from a green `main` only, with each moved plugin's changelog section verbatim. No version moved, no release.
- `scripts/release.mjs` MUST stay stateless and fail closed: the previous release is read from the Releases API, a dead API or an unresolvable previous tag throws, and one missing changelog section publishes nothing.

Rationale: without a bump Claude Code keeps serving the previous build to everyone who installed it; a fail-open release re-announces the whole marketplace.

### 5. Fail-closed, dependency-free tooling

- `npm run sync`, `npm run check` and `npm test` MUST run on Node 22+ built-ins alone, on a clean clone with no `npm install`; `scripts/lib/` MUST NOT import third-party packages. Scripts are ESM `.mjs`.
- Every check MUST collect all problems into one `Reporter` and exit once; `scripts/check-all.mjs` MUST run every check rather than stop at the first failure.
- `scripts/lib/schema.mjs` MUST throw on any JSON Schema keyword outside `SUPPORTED`; a guard that cannot read its input (an unrecognised `LICENSE`, an unparseable manifest) MUST report an error, not skip.
- A new or changed rule MUST land with a fixture case in `tests/` that fails without it, and assertions MUST check the message (it names the file and the fix), not only the exit code.

Rationale: a gate that disables itself on bad input fails exactly when it is needed; one run reporting everything keeps a leaked credential from hiding behind a drift error.

### 6. Each fact has one owning skill

- The Gatling line-to-artifact matrix MUST be stated only in `gatling-versions` (`references/gatling-lines.md`, `references/galaxio-artifacts.md`); other skills link to it and MUST NOT restate a coordinate. The one exception is a threshold owned by the skill that crosses it (`gatling-migration`).
- A fact that holds on every stack belongs in `SKILL.md`; a fact that varies by version, build tool, language or protocol belongs in `references/`. Sibling dispatch files (one per cell) MAY repeat a fact; a reference MUST NOT restate an invariant of the `SKILL.md` that dispatches to it.
- `gatling-migration` MUST NOT link into Galaxio-specific material: a project without `org.galaxio` never sees Galaxio.
- A skill states facts, coordinates and consequences, and MUST NOT describe its own construction or coverage.

Rationale: a coordinate written outside the matrix is how a skill goes stale; skill bodies are paid for on every activation.

### 7. No secrets, no machine paths

- A credential MUST NOT be committed, not even a throwaway one. User secrets are declared as `cursor.variables` or `userConfig` in `plugin.meta.json` and referenced as `${VAR}`.
- `hooks.json`, `.mcp.json` and `mcp.json` MUST NOT hold a literal value under a token-shaped key, and a shipped file MUST NOT contain a machine-specific absolute path (`check-security.mjs`; gitleaks in the `security` job).
- Scripts inside a plugin MUST be idempotent, exit non-zero with the reason on stderr, and MUST NOT delete or push without an explicit flag.

Rationale: plugins run inside users' agents; anything committed here is public and executes on their machines.

## Public Contracts and Compatibility

- The marketplace name `galaxio`, plugin names and skill names are public: users install `<plugin>@galaxio` and invoke `$<skill-name>`, and an install does not follow a rename. Renaming or removing a plugin, a skill or the marketplace MUST come with a CHANGELOG entry that tells users how to reinstall (precedent: `galaxio-gatling` 2.0.0).
- The marketplace name MUST NOT be one reserved by Anthropic (`RESERVED_MARKETPLACE_NAMES`, `RESERVED_PREFIXES` in `scripts/sync-manifests.mjs`).
- Every plugin `license` MUST equal the repository `LICENSE` (Apache-2.0).
- `galaxio-gatling` teaches the APIs of the components in `catalog-info.yaml` `dependsOn` (`gatling-picatinny`, `gatling-kafka-plugin`, `gatling-jdbc-plugin`, `gatling-amqp-plugin`). A skill MUST NOT name an artifact coordinate or API of these libraries that their released versions do not have; a change in one of them reaches the skills through `gatling-versions` and a plugin version bump.
- The Spec Kit kit (`.claude/skills/speckit-*`, `.agents/skills/speckit-*`, `.specify/` except `memory/`) belongs to `spec-kit-galaxio-bootstrap`. It MUST match `.specify/speckit-kit.sha256` (`scripts/check-speckit.sh`) and MUST NOT be edited here; changes arrive by `copier update`.

## Development Workflow and Quality Gates

- Required before merge: `npm run check` and `npm test`; `npm run format:check`, `npm run lint:md` and `npm run spell` (after `npm install`); `claude plugin validate ./plugins/<name> --strict` for every plugin; the `version bump` job; `check-speckit.sh`; `check-linkage.sh --pr`; and the `security` job (gitleaks, actionlint, shellcheck on plugin shell scripts, byte-compiling plugin Python).
- New vocabulary in Markdown or code comments MUST be added to `cspell.json`.
- A new or changed plugin MUST be installed and exercised in at least one agent before the PR is opened, and the PR MUST name that agent.
- Changes to `plugins/`, `scripts/`, `schemas/`, `tests/`, `.github/`, `marketplace.meta.json` and `package.json` need a CODEOWNERS approval (`.github/CODEOWNERS`).
- Every PR carries a milestone and `Part of galax-io/galaxio-sdlc-backlog#<feature>`, as the ecosystem constitution requires.

## Governance

- This constitution is amended only by a pull request to `galax-io/ai-plugins` with the maintainer's explicit approval, and every amendment updates the Sync Impact Report at the top of this file.
- Its version follows semver: MAJOR when a principle is removed or redefined incompatibly, MINOR when a principle or section is added or materially expanded, PATCH for clarifications.
- Plans check themselves against the principles in their "Constitution Check". An exception MUST be recorded in the plan's Complexity Tracking with an owner and a removal date.
- Reviewers and the review critic answer, for each principle, whether a change violates it.

**Version**: 1.0.0 | **Ratified**: 2026-10-20 | **Last Amended**: 2026-10-20
