# Changelog

All notable changes to this plugin are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the plugin uses
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-07-28

### Added

- Two Gatling version profiles, `references/version-3-13.md` and
  `references/version-3-11.md`, which own every version number and dependency
  coordinate; `references/migrate-3-11-to-3-13.md` for the upgrade between them; and
  `references/beyond-3-13.md`, which records why the skill stops at 3.13.x.
- One build reference per supported combination — `build-sbt-scala.md`,
  `build-maven-{java,kotlin,scala}.md`, `build-gradle-{java,kotlin,scala}.md` — each
  carrying its own source roots, run commands, build-plugin floor and the list of what to
  add to the build file. A build file is a cell of the language-by-tool matrix, so three
  files by tool could not avoid mixing languages.
- Per-language references (`lang-scala.md`, `lang-java.md`, `lang-kotlin.md`), including
  the `injectOpen`/`injectClosed` split and the Kotlin `shouldBe` alias.
- One Picatinny reference per Picatinny major — `picatinny-1-x.md` and `picatinny-0-x.md` —
  plus `picatinny-substitutes.md` for projects that cannot take the dependency. The split is
  on the Picatinny pin, not the Gatling line, because `1.x` spans both: `1.0.1`–`1.10.4`
  target Gatling 3.11.5 and `1.12.0`+ target 3.13.5. `0.x` is not the same library with
  fewer features — the Faker package does not exist, the `Random*Feeder` family is the
  current API rather than a deprecated one, `assertionFromYaml` carries no deprecation, and
  `getStringListParam`, `getConfigParam` and every `getOpt…` variant are absent. All three
  document the modules the skill never covered — transactions, JWT, Redis and
  `IntensityConverter` — and the `org.galaxio.gatling.javaapi` facade, present throughout.
- Per-protocol references (`protocol-http.md`, `protocol-jdbc.md`, `protocol-kafka.md`,
  `protocol-messaging.md`) and `workload-models.md` for injection profiles.
- `references/starter-tree.md`: the minimal project that compiles and runs — package clauses
  and every import — and `references/resource-files.md` for `simulation.conf`, `logback.xml`,
  the feeder CSV and the body template, which the layout demanded but nothing specified. They
  are separate files so that needing one resource does not mean reading the whole project.
- The rule that decides generated data against a CSV: identifiers the system under test must
  already know come from a CSV, everything else may be generated. Backwards, it produces a
  run that is green because it measured the error path.
- The JDBC driver requirement, the `JdbcProtocolBuilder` and `simpleCheckType` imports, and
  the parameterized-query case in Java and Kotlin.
- An Invariants section in `SKILL.md` for the rules that hold on every stack, including the
  rule that an existing repository outranks this skill, HOCON environment substitution so
  credentials stay out of a committed `simulation.conf`, and a `logback.xml` level guard.
- Detection guidance for the two build-plugin numbering schemes:
  `gatling-charts-highcharts`, `gatling-test-framework`, `gatling-app` and
  `${gatling.version}` name the Gatling line, `gatling-maven-plugin` and `gatling-sbt` are
  on their own 4.x numbering and say nothing about it, and `io.gatling.gradle` is the
  exception whose leading major.minor tracks the line.

### Changed

- `SKILL.md` is an index. Dispatch narrows by language, then build tool, then Gatling
  version, and only the matching references load. The body is 347 lines, down from 458:
  detection, dispatch and the invariants that apply to every stack. Anything that varies by
  version, build tool, language or protocol is a reference, loaded on demand.
- The default line for a new project is Gatling 3.13.x, not 3.11.x — that is where every
  library's current release sits. It is not where they only exist: Picatinny and the JDBC,
  Kafka and AMQP plugins each publish for 3.11.x too, so a Galaxio dependency is never
  evidence of the line. Every one of them declares `gatling-core` at `provided` scope; the
  project's own Gatling pin decides, and the library version is checked against it.
- Picatinny and the Galaxio protocol plugins are documented for all three languages. The
  `_2.13` suffix names the artifact, not the caller: each ships a Java and Kotlin facade
  under `org.galaxio.gatling…javaapi`.
- The Codex sidecar and the plugin description no longer describe the skill as Scala-only.

### Fixed

- The Picatinny coordinate was written as `org.galaxio.gatling-picatinny`, which does not
  resolve. It is `org.galaxio %% gatling-picatinny` in sbt and `gatling-picatinny_2.13`
  in Maven and Gradle.
- The sbt Picatinny dependency was missing its `% Test` scope.
- The JDBC section documented only `queryP`. Added `query`, the insert, batch and
  stored-procedure forms, the full HikariCP pool table, and the 1.5.0 behaviour changes —
  `where(...)` no longer accepts expression language, and a literal `"NULL"` is kept as
  text.
- The Picatinny feeder example paired `RandomUUIDFeeder` with the faker `Predef` import,
  which does not provide it. Scala now uses `GeneratedFeeder` from the faker API; the
  legacy objects live in `org.galaxio.gatling.feeders` and are deprecated from `1.5.0`.
- `${?VAR}` was described as making a variable mandatory. It is HOCON's _optional_
  substitution: with a default on the line above, an unset variable silently leaves the
  default in place. The sample `simulation.conf` gave `baseUrl` a `localhost` default under
  that misreading, so a run with no environment exported would have measured nothing and
  reported green. Keys that must come from the environment now carry no default.
- `intensity` was documented as requests per second while being passed to
  `rampUsersPerSec`/`constantUsersPerSec`, which meter virtual-user arrivals. A scenario
  issuing `k` requests per iteration ran at roughly `k` times the stated rate.
- The staged profile's duration was given as
  `stagesNumber * stageDuration + (stagesNumber - 1) * rampDuration`, one full ramp short of
  the profile the same file recommends: a starting rate of zero puts a ramp before every
  level, so it is `stagesNumber * (stageDuration + rampDuration)`. Sizing `testDuration` from
  the old formula truncated the top stage while the report still looked complete.
- The 3.11 profile listed Picatinny `0.18.2` as the ceiling and claimed the JDBC, Kafka and
  AMQP plugins had no 3.11 releases. The real ceilings are `1.10.4`, `0.17.2`, `0.20.5` and
  `1.0.4`; the old table cost a thirteen-release Picatinny downgrade and turned adding a
  protocol plugin into a whole-project Gatling upgrade.
- `gatling-gradle` was pinned as `3.11.0`, which does not exist — the line starts at
  `3.11.1` — and as `3.13.1 or later` on the 3.13 profile, where "or later" would move the
  project to Gatling 3.14.x or 3.15.x, since that plugin's major.minor is the Gatling line.
- The no-Picatinny config holder called `ConfigFactory.load("simulation.conf")`. That
  argument is a resource basename, so it looked for `simulation.conf.conf`, found nothing,
  and fell back to system properties alone — the failure the holder exists to prevent.
- The 3.11 Picatinny file claimed the same typed getters as the later line. `0.x` has five;
  `getStringListParam`, `getConfigParam` and every `getOpt…` variant arrive with `1.x`.
- The closed-model Scala scenario called `pace(pacing)` with `pacing` defined nowhere.
- Version detection recursed into `project/`, matching sbt's own build output, and never
  looked at `gradle/libs.versions.toml`, `settings.gradle[.kts]` or `buildSrc` — where a
  Gradle project usually keeps the version — so a catalog-based project read as greenfield.
- `gatling.conf` was listed in the mandatory layout while `resource-files.md` says not to
  create one without something to override.

### Removed

- `references/imports.md`, `cases.md`, `protocols.md` and `build-files.md`. Their content
  is redistributed across the version, build-tool, language and protocol references.

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
