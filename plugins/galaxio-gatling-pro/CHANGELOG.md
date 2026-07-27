# Changelog

All notable changes to this plugin are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the plugin uses
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-07-27

### Added

- Initial release. The `galaxio-gatling-pro` skill, migrated from the standalone
  repository `galax-io/galaxio-gatling-pro`, which is now deprecated and archived.
- Gatling 3.x guidance for Scala, Java and Kotlin across sbt, Maven and Gradle:
  build-tool source roots, the cases/feeders/scenarios/simulations layout,
  Picatinny-first config and feeders, and open and closed workload models.
- Reference material split out of the skill body into `references/`: imports,
  cases, protocols and build files.

### Changed

- Frontmatter reduced to the portable core (`name` and `description`). The old
  `version` key now lives in `plugin.meta.json`; `scope` and `file_policy` are
  dropped, since no agent reads them.
- Installation is through the Galaxio Performance Kit marketplace rather than a
  `git clone` into `~/.claude/skills/`.
