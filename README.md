# Galaxio Performance Kit

[![License: Apache 2.0](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
![Plugin Marketplace](https://img.shields.io/badge/type-plugin--marketplace-orange.svg)
![Cursor](https://img.shields.io/badge/Cursor-compatible-black.svg)
![Claude Code](https://img.shields.io/badge/Claude%20Code-compatible-blueviolet.svg)
![Codex](https://img.shields.io/badge/Codex-compatible-green.svg)
[![CI](https://github.com/galax-io/ai-plugins/actions/workflows/validate.yml/badge.svg)](https://github.com/galax-io/ai-plugins/actions/workflows/validate.yml)
![Node](https://img.shields.io/badge/node-%3E%3D22-brightgreen.svg)
[![Plugins](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2Fgalax-io%2Fai-plugins%2Fmain%2F.claude-plugin%2Fmarketplace.json&query=%24.plugins.length&label=plugins&color=informational)](.claude-plugin/marketplace.json)
[![Agent Skills](https://img.shields.io/badge/Agent%20Skills-standard-informational.svg)](https://agentskills.io)

Galaxio engineering workflows packaged as portable agent plugins for **Cursor**, **Claude Code** and **Codex**.

One plugin is authored once. The three agents disagree about manifests, not about
skills, so this repository keeps a single `skills/` tree per plugin and generates the
Cursor, Claude Code and Codex manifests from one source file.

## Plugins

| Plugin                                              | What it does                                                                                                                              |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| [galaxio-gatling-pro](plugins/galaxio-gatling-pro/) | Gatling JVM performance testing in Galaxio style — Scala/Java/Kotlin on sbt, Maven or Gradle, Picatinny helpers, HTTP/JDBC/JMS/Kafka/AMQP |

## Install

Claude Code:

```bash
claude plugin marketplace add galax-io/ai-plugins
```

Codex:

```bash
codex plugin marketplace add galax-io/ai-plugins
```

Cursor installs from the marketplace UI once the kit is published. Until then, copy a
plugin directory into `~/.cursor/plugins/local` and restart Cursor.

Then install a plugin by name, for example `galaxio-gatling-pro@galaxio-performance-kit`.

## Repository layout

```text
marketplace.meta.json              authored: marketplace identity
plugins/<name>/plugin.meta.json    authored: everything about one plugin
plugins/<name>/skills/<skill>/SKILL.md
schemas/                           JSON Schema for both authored sources
scripts/                           generator and checks
tests/                             the suite and its fixtures — not shipped content
.claude-plugin/marketplace.json    generated
.cursor-plugin/marketplace.json    generated
.agents/plugins/marketplace.json   generated
plugins/<name>/.claude-plugin/plugin.json   generated
plugins/<name>/.cursor-plugin/plugin.json   generated
plugins/<name>/.codex-plugin/plugin.json    generated
```

Generated files are never edited by hand. `npm run check` fails when they drift from
the authored sources.

## Commands

```bash
npm run sync
```

```bash
npm run check
```

```bash
npm test
```

`sync` regenerates the manifests. `check` runs the same generator in verify mode plus
the portability, link and security checks. `test` exercises the scripts against the
fixtures in `tests/fixtures/`. All three run on Node built-ins alone.

The plugins under `tests/fixtures/` are deliberately broken inputs for the suite,
not marketplace content. Nothing there is published, and the checks skip it.

CI also requires the prose gates, so run them before opening a PR. They need
`npm install` first:

```bash
npm run format:check && npm run lint:md && npm run spell
```

## Adding a plugin

See [CONTRIBUTING.md](CONTRIBUTING.md). The short version: create
`plugins/<name>/plugin.meta.json`, write skills under `plugins/<name>/skills/`, run
`npm run sync`, run `npm run check`, and install the result in at least one agent
before opening a PR.

Background on the primitives and the three manifest dialects:
[docs/plugins-vs-skills.md](docs/plugins-vs-skills.md).

## License

Apache-2.0. See [LICENSE](LICENSE).
