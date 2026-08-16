# Changelog

All notable changes to this plugin are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the plugin uses
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.3.0] - 2026-08-16

The build file gets its own skill. `gatling-build` carries all seven tool-by-language cells, so a
task that never opens the build file no longer loads a Maven or Gradle reference — adding a
scenario, reviewing a simulation and answering a workload question all used to carry one.

**Minor, not major: nothing installed goes away.** No skill is renamed or removed, the four ship in
the one plugin and arrive together, and every question the plugin answered it still answers. A link
written directly at `skills/galaxio-gatling-pro/references/build-*.md` is the one thing that
breaks; the seven files kept their names under `gatling-build`.

**One skill, not seven.** A cell is chosen by build tool _and_ language, and a request that says
"raise the Gatling plugin" usually names neither. Seven skills would have to discriminate on the
fact the user omitted; one skill detects both from the project and picks the cell in its own
dispatch table, where all seven are visible and the never-read-two rule can be stated once.

### Added

- **`gatling-build`** — the seven build references, plus cell detection and the source and resource
  roots per build tool. It owns the shape of the build file; it owns no version literal except a
  threshold, and no simulation code.
- **The Maven + Scala cell records that no template stands behind it.** `galax-io/templates-gatling`
  ships six and `scala-maven` is not among them, so nothing there has been rendered and run end to
  end — including its claim that `gatling-maven-plugin` v4+ cannot compile Scala without
  `scala-maven-plugin`. It now says so where an agent reads it, not only in an issue.

### Changed

- **`galaxio-gatling-pro` is the test-code skill now.** Its description no longer claims the build
  tools, so a build-file request stops pulling the 300-line router in alongside `gatling-build`.
  It keeps the language, protocol, layout and workload material.

### Fixed

- **The source and resource roots are stated in the router again.** They had been reachable only
  through a build reference, which the router no longer opens for a task that just adds a scenario
  — and under Gradle the wrong root compiles nothing while reporting BUILD SUCCESSFUL.
- **`starter-tree.md` showed the sbt roots with no caveat**, so a greenfield Gradle project got
  `src/test/scala` instead of `src/gatling/scala`.
- **`gatling-lines.md` and `version-lookup.md` pointed at "the build reference"** as if the router
  still had one. Both name `gatling-build` now.

## [2.2.0] - 2026-08-16

JMS was the one protocol a project could set up from the skill and still not run. Gatling ships the
API and no broker, and nothing said so.

### Added

- **`protocol-messaging.md` gains a `## Client` section**, mirroring the `## Driver` section
  `protocol-jdbc.md` has carried since 1.1.0. It names four broker clients, the Gatling lines each
  suits and the `InitialContextFactory` each provides. The choice turns on a detail the artifact
  name hides: every current client depends on `jakarta.jms:jakarta.jms-api`, but `2.0.3` of it
  ships the `javax.jms` classes and `3.1.0` ships `jakarta.jms`, so the version that resolves is
  what has to match the line. Mismatch fails differently per build tool — Maven evicts Gatling's
  API by nearest-wins and breaks `test-compile`, Gradle takes the highest and dies at run time.

### Fixed

- **The JMS protocol snippet did not compile on any supported line.** It called
  `connectionFactoryName` on `jms`, which only accepts a connection factory; the JNDI methods
  belong to `jmsJndiConnectionFactory`. The corrected chain also ends in `contextFactory`, which
  is not optional — it is the only call returning the type `connectionFactory` takes, and its
  argument is the broker class that loads the client jar.
- **`gatling-jms` is no longer listed as a dependency to add.** It arrives through
  `gatling-charts-highcharts` → `gatling-app` on every line from 3.9.x to 3.15.x, Java facade
  included, and Gradle's plugin adds that bundle itself. The row it had in `build-sbt-scala.md` is
  gone, and the seven build references now state the fact where the bundle is declared.
- **The Gradle configuration for a broker client depends on the code.** `gatlingRuntimeOnly`
  serves the JNDI form; a simulation that constructs the factory itself names a broker class at
  compile time and needs `gatlingImplementation`.
- **`README.md` framed the broker client as a 3.14+ requirement.** It is needed on every line;
  3.14 changes which client, not whether one is needed. The package-boundary note in
  `protocol-messaging.md` was likewise corrected — adding a client can put a second JMS API jar
  beside Gatling's, which the old wording said could not happen.

## [2.1.0] - 2026-08-07

Migration and version coordinates leave the router and become skills of their own. An upgrade task
loaded 444 lines and now loads 83, because the 309-line writing skill no longer activates for it.
`gatling-migration` is standalone: 83 lines on its own, 123 when the build declares `org.galaxio`.

**Minor, not major: nothing installed goes away.** No skill is renamed or removed, the three ship
in the one plugin and arrive together, and every question the plugin answered it still answers.
What moved is which skill answers an upgrade — `galaxio-gatling-pro` gave up the verbs that reach
one, and `references/versions.md`, `references/migrate.md` and `references/version-lookup.md` left
it for `gatling-versions`. A link written directly at one of those three paths is the one thing
that breaks.

### Added

- **`gatling-migration`** — moving a project between Gatling lines, 3.9.x to 3.15.x. Carries the
  line deltas, the upgrade procedure and one smoke run. The target defaults to 3.13.x and says so
  rather than presenting a ceiling. Nothing in its body is Galaxio; a build that declares
  `org.galaxio` takes `references/galaxio-upgrade.md`, which names the runtime failure rather than
  reporting that the libraries were left alone.
- **`gatling-versions`** — every number, for all three skills. `references/gatling-lines.md` holds
  Gatling, Scala, Java and the three build plugins and mentions Galaxio nowhere;
  `references/galaxio-artifacts.md` holds the four Galaxio libraries. A project without
  `org.galaxio` never loads the second file. The two replace the single `references/versions.md`,
  which mixed both and could not be linked from a Galaxio-free context.
- **The Gradle 9 boundary.** `gatling-gradle` below `3.14.3.1` throws
  `Could not get unknown property 'reportsDir'` when `gatlingRun` is realized, while
  `gatlingClasses` still compiles — the whole 3.11 and 3.13 lines and 3.14 up to `3.14.3`. It is a floor on the plugin only: raise the plugin and pin
  `gatling { gatlingVersion = '3.13.5' }` and a Gradle 9 project runs 3.13 fine, Galaxio libraries
  included.
- **sbt 1.x named explicitly.** `gatling-sbt` is cross-built for sbt 1.0 only; no sbt 2.x artifact
  exists, so a project on sbt 2 cannot resolve the plugin.

### Changed

- **On Gradle the Gatling version is `gatling { gatlingVersion = '…' }`, not the plugin number.**
  The plugin's own leading three numbers are only the default, used when that block is absent, and
  the override wins even across lines. So the table entry is a floor on all three build tools, and
  the detection rule is to read the block first. No reference named `gatlingVersion` before.
- **`gatling-maven-plugin`'s 3.13 floor is `4.10.2`**, not `4.11.0`. Measured: `4.10.1` fails with
  `IllegalAccessException: module java.base does not open java.lang`, `4.10.2` runs.
- **A wrong-column Galaxio pin fails late, not early.** It resolves, it compiles, and it dies at
  run time only on the APIs binding Gatling internals — Picatinny `0.18.2` on Gatling `3.13.5`
  feeds fine and throws `NoSuchMethodError` on `CoreComponents.actorSystem()` at the first
  transaction. The previous wording claimed it would not run at all.
- **Dropping the Graphite writer is silent.** From 3.12 an unknown writer in `gatling.conf` is
  accepted, the run stays green and no data is exported. The consequence is missing metrics, not a
  failing build.
- **The `stopInjector` and JMS renames have no overlap window.** Neither spelling compiles on the
  other side of its line, so both edits land in the same commit as the version bump.
- **Line-scoped API facts now sit where the task loads them.**
  `proxyProtocolSourceIpV4Address`/`V6` and `logActualValueInError` moved into
  `references/protocol-http.md`, and the removal of the `eager` and `batch` feeder modes into
  `references/resource-files.md`. Each was reachable only from the migration material before, so a
  review of a project already on that line never saw them.
- **The `--add-opens` flag is written out in all seven build references** instead of being reached
  through a link, since a build task never opens the migration material.

## [2.0.0] - 2026-08-07

The plugin and the marketplace are both renamed. An install does not follow a rename, so an
existing one has to be removed and re-added. Nothing else about the plugin moved.

### Changed

- **The plugin is `galaxio-gatling`**, dropping the `-pro`. It carried the name of the single
  skill inside it, inherited from the standalone repository it was migrated from rather than
  chosen, and `-pro` marked a tier that does not exist. A plugin is the unit of installation
  and of always-on context cost, so it is named for its domain — otherwise the split that
  turns one skill into several leaves the container named after one of its own parts.
- **The marketplace is `galaxio`**, dropping `-performance-kit`. It named a domain where it
  should have named a publisher, and the first plugin that is not about performance would have
  made it wrong — the same failure one level up. An install now reads `galaxio-gatling@galaxio`.
- **The skill is untouched.** It is still `galaxio-gatling-pro`, so `$galaxio-gatling-pro` in
  Codex and anything referencing it by name keep working. It is renamed when the split reaches
  it.

### Migration

Claude Code — uninstall, drop the old marketplace, add the new one:

```bash
claude plugin uninstall galaxio-gatling-pro@galaxio-performance-kit
claude plugin marketplace remove galaxio-performance-kit
claude plugin marketplace add galax-io/ai-plugins
claude plugin install galaxio-gatling@galaxio
```

Codex — `codex plugin remove galaxio-gatling-pro`, then `codex plugin marketplace add
galax-io/ai-plugins` and `codex plugin add galaxio-gatling`.

Cursor — a team install picks the rename up from the Plugins UI. A local install is the
directory you copied, so delete `~/.cursor/plugins/local/galaxio-gatling-pro`, copy
`plugins/galaxio-gatling` in its place, and run **Developer: Reload Window**.

## [1.3.0] - 2026-07-31

`simulation.conf` now answers which keys a run requires, per protocol.

### Added

- **A key registry in `references/resource-files.md`**, checked against Picatinny's own
  `SimulationConfig` on the `0.x` and `1.x` lines. Every default parameter with its type and the
  condition that makes it required, then the custom keys each protocol declares. Required means
  the getter carries no default, and because every accessor is a `lazy val` the throw lands at
  first access — which is why a project can leave out what it never reads.
- **The two defaulted keys, named as traps.** `stagesNumber` defaults to `1`, so a staged profile
  missing it runs one stage at full intensity and reports a complete breaking-point test that
  never stepped. `testDuration` defaults to `(rampDuration + stageDuration) * stagesNumber` —
  exactly the length `maxDuration` must exceed — so omitting it truncates the run, and it drags
  `rampDuration` and `stageDuration` into the required set for any simulation that reads it.
- **`intensity` is a string, not a double.** `IntensityConverter` takes at most one digit after
  the decimal point, so `16.67` fails where `16.7` or `"1000 rpm"` works. `IntensityConverter`
  itself reads no config.
- **`baseUrl` is scoped by the holder, not the request.** Picatinny's accessor is lazy, but the
  shared holder is not, so a JDBC-only simulation reaching into a holder that also builds an HTTP
  protocol still forces the key.
- **Every protocol reference names its own config keys.** `dbUrl`, `dbUser` and `dbPassword` for
  JDBC; `kafkaUrl` for Kafka; `amqpHost`, `amqpPort`, `amqpLogin` and `amqpPassword` for AMQP;
  `jmsUrl`, `jmsUser` and `jmsPassword` for JMS; `baseUrl` for HTTP. `users` and `pacing` are
  named where the closed model introduces them.
- **What a `-D` override can carry.** System properties do not go through the HOCON parser, so
  every value arrives as a string: both duration spellings work, but a list- or object-valued key
  cannot be overridden this way and fails at startup with a type error.

### Changed

- **`${?VAR}` is stated as the rule that makes a variable mandatory**, not only as a secrets
  idiom: with no default line above it, an unset variable leaves the key undefined and the run
  stops on first read, naming it.
- **`migrate.md` counted two 3.12 rows where the table has three.** An upgrade following the
  count left `stopInjector` in place, which does not exist from 3.12.
- **Duplication across dispatch axes removed.** The Session invariant no longer repeats in
  `lang-scala.md`, the `saveAs`-needs-a-passing-check rule no longer repeats in
  `protocol-http.md`, and the package-object trap is stated once in `lang-scala.md` rather than
  twice with `starter-tree.md`. Facts repeated between sibling files on the same axis are left
  alone: an agent reads one language file and one build file, never two.

## [1.2.1] - 2026-07-31

The skill reads 13% shorter with every rule, coordinate and command it had before.

### Changed

- **`SKILL.md` stack detection is half its former size.** All five shell commands are unchanged,
  and so is the table that reads a Gatling line out of an artifact name —
  `gatling-charts-highcharts` against `gatling-maven-plugin` against `io.gatling.gradle`, plus
  the `-latest` trap. What went was the dispatch-ordering rationale, which the numbered dispatch
  tables already are, and the framing around the rules rather than the rules.
- **The opening section is now the three steps, the greenfield default and one rule.** "An
  existing repository outranks this skill" survives, as does the greenfield stack — Gatling
  3.13.x, Scala 2.13, Java 17, sbt.
- **Two rules moved from detection to dispatch**, where the choice they govern is actually made:
  that the Galaxio libraries ship Java facades and so are not gated by language, and that adding
  a protocol plugin means taking its release for the line you are on rather than raising the
  line.
- **3.10.x and 3.12.x are described accurately.** The skill said it carried no coordinates for
  them while `picatinny-0-x.md` supplied one for 3.10.x. The claim now names what is true: the
  version matrix has no column for either line.

### Removed

- **Prose explaining the skill's own construction**, in `SKILL.md` and across all 23 reference
  files — why the reference tree is split, which file owns which fact, what a typical task
  loads. None of it changed what the skill does, and it was read on every activation. The
  design rationale now lives in the repository's `AGENTS.md`, where authors read it.
- **Restatements of the adjacent code, table or command**, and the pointers that duplicated an
  invariant already loaded from `SKILL.md`.

## [1.2.0] - 2026-07-30

Four Gatling lines are covered — 3.9.x, 3.11.x, 3.13.x, 3.15.x — and every version number now lives in one file.

### Added

- **Gatling 3.9.x**, where both the old and new API spellings compile — the skill says to write
  the one that survives 3.11.
- **Gatling 3.15.x**, a supported target for any project without a Galaxio dependency.
- **`references/versions.md`.** One matrix, a column per line, holding every coordinate the skill
  names — a row read across the columns _is_ where that library crosses.
- **`references/version-lookup.md`.** Two commands: what is published, and which line a release
  targets. Used wherever a current version used to be written down.
- **Routing for 3.10.x, 3.12.x and 3.14.x.** A detected 3.10.x used to match no row and silently
  got 3.13 coordinates — wrong on every one.

### Changed

- **Snapshots are gone, thresholds stay.** Out: `3.13.5`, `3.11.5`, `1.25.0` and every other
  "current release" number. In: every crossing, every build-plugin floor, the version traps.
- **Bounds follow the line.** A range is a closed line, `+` an open one whose top is looked up.
- **The Galaxio ceiling is a dependency fact, not a limit of the skill** — stopping at 3.13.x
  applies only to projects keeping Picatinny or a protocol plugin.
- **One fact, one file.** Numbers live in `versions.md`, line deltas in `migrate.md`, Picatinny's
  API thresholds in the Picatinny references. Protocol and build references carry no versions at
  all — `--add-opens` had been spelled out in twelve files, the crossing table in four.
- **Picatinny `0.x` covers `0.14.0` upward** — the class set is identical up to `0.16.0`.

### Fixed

- **Java 8 on 3.9.x is a Scala-only floor.** The `javaapi` facade every Java and Kotlin project
  goes through is class-file major 61 in the very first `0.14.x` and `0.10.3` jars, so a Java or
  Kotlin project on that line needs 17 like every other.
- `gatling-gradle` is bounded on every line: an open bound on a plugin whose major.minor _is_ the
  Gatling line silently moves the project off it.
- `gatling-maven-plugin 4.8.0` needs Maven 3.6.3+, dropped in the consolidation while three build
  references still promised it.
- Picatinny's two extra utility classes arrive at `0.17.0`, not `0.18.2`.
- `gatling-picatinny` has no 3.12 release at all — `SKILL.md` claimed one sat between the
  crossing columns.
- A `0.x` Picatinny pin spans three Gatling lines, so raising it can move the Gatling line
  without changing an import. The reference said it never could.
- `httpConcurrentRequests` was marked unavailable on the profiled lines; 3.15.x is now one.

### Removed

- `references/beyond-3-13.md` and the four `references/version-3-*.md` profiles, folded into
  `versions.md`; `references/migrate-3-11-to-3-13.md` renamed to `references/migrate.md`.

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
