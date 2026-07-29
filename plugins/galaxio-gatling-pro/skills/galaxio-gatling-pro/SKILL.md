---
name: galaxio-gatling-pro
description: 'Use when creating, reviewing, refactoring or upgrading Gatling JVM performance tests in Galaxio style: Gatling 3.13.x or legacy 3.11.x, Scala, Java or Kotlin on sbt, Maven or Gradle, gatling-picatinny plus the Galaxio gatling-jdbc-plugin, gatling-kafka-plugin and gatling-amqp-plugin, HTTP, JDBC, Kafka, AMQP and JMS protocols, open and closed workload models, smoke and debug simulations, the cases/feeders/scenarios/simulations layout, and migrating between Gatling versions.'
---

# Galaxio Gatling Pro

This file carries the rules that hold on every stack, plus the index. Everything that varies by
Gatling version, build tool, language or protocol lives in `references/`, so only the part
matching the target project is loaded.

## How To Use This Skill

1. Run the detection below.
2. From the dispatch tables, read **one** language file, then **one** build file for that
   language, then **one** version file — plus only the protocol files the project actually uses.
3. Apply the invariants at the end of this file. They are here rather than in `references/`
   because they are needed on every task, and a file needed on every task is body, not
   reference.

A typical task loads five to nine files out of twenty-four. Do not read `references/` in bulk: the
version files disagree with each other on purpose, and reading two of them produces advice that
matches no real project. The split is for correctness per stack, not for token count — a task
that needs the whole matrix reads about as much as one flat file would.

**Writing and reviewing take the same route.** The skill produces the boilerplate and the
minimal working project; for a review, the same detection and dispatch identify what the code
should have been, and the invariants below are the checklist — layer boundaries, feeder choice,
config and secrets, checks, session handling, the injection model, and the `Do Not` list. A
review that skips detection compares the code against the wrong version's rules.

Nothing detected — a new project with no build file yet? Use the greenfield default: Gatling
`3.13.x`, Picatinny `1.25.0`, Scala `2.13`, Java 17, sbt.

**An existing repository outranks this skill.** When the project already has a layout, naming,
config keys, formatting or a Gatling version, follow it and add to it. Everything here
describes what to do when there is nothing to follow — it is not a mandate to restructure
working code.

## Detect The Target

Dispatch narrows in this order: **language, then build tool, then Gatling version.** Language is
the widest filter — it decides the DSL you write and already rules out combinations, since sbt
serves Scala only. Detection gathers the evidence in a different order, because the version
literal lives in the build file; that is a fact about where to look, not about what to decide
first.

Run these from the directory holding the build file. Most of them name paths that will not all
exist, so **a non-zero exit here means nothing** — read the output, not the status. Silence
across every step means greenfield, not failure.

Find the language and source root — the directory holding `*Simulation.*` wins any ambiguity:

```bash
ls -d src/test/scala src/test/java src/test/kotlin src/gatling/scala src/gatling/java src/gatling/kotlin 2>/dev/null
find src -name '*Simulation.*' 2>/dev/null
```

Find the build file:

```bash
ls -d build.sbt project pom.xml build.gradle build.gradle.kts settings.gradle settings.gradle.kts 2>/dev/null
```

Read the Gatling version. Restrict the search to authored build inputs — a recursive walk of
`project/` picks up sbt's own build output, where a stale resolution-cache report will name a
version the build no longer uses:

```bash
grep -rnE --include='*.sbt' --include='*.gradle' --include='*.kts' --include='pom.xml' \
  --include='*.toml' --include='*.properties' 'gatling|picatinny' . 2>/dev/null
```

That covers `gradle/libs.versions.toml`, `settings.gradle[.kts]` and `gradle.properties`, where
a Gradle project usually keeps the literal. If it still comes back empty, look in `buildSrc/`
and in a Maven parent POM before concluding greenfield.

Two different numbering schemes come back, so read the artifact, not just the number:

- `gatling-charts-highcharts`, `gatling-test-framework`, `gatling-app`, or a
  `${gatling.version}` property — **this is the Gatling line.**
- `gatling-maven-plugin` (4.x) and `gatling-sbt` (4.x) are build-plugin versions on their own
  numbering. They say nothing about the Gatling line.
- `io.gatling.gradle` is the exception: its leading major.minor tracks the Gatling line, so
  `3.11.1` means 3.11.x and `3.13.1` means 3.13.x.
- A Gradle project often names no Gatling version at all and takes the plugin's default. When
  nothing above appears, treat the `io.gatling.gradle` version as the line, and say so.

Check for Galaxio libraries:

```bash
grep -rnE --include='*.sbt' --include='*.gradle' --include='*.kts' --include='pom.xml' \
  --include='*.toml' --include='*.properties' 'org\.galaxio' . 2>/dev/null
```

Three rules decide the rest:

- **A Galaxio version does not tell you the Gatling line — check it against the line instead.**
  Every Galaxio artifact declares `gatling-core` at `provided` scope, so it never carries a
  Gatling version into the project; the project's own pin is authoritative. All four libraries
  ship for both lines:

  | Artifact               | Top release on 3.11.x | First release on 3.13.x |
  | ---------------------- | --------------------- | ----------------------- |
  | `gatling-picatinny`    | `1.10.4`              | `1.12.0`                |
  | `gatling-jdbc-plugin`  | `0.17.2`              | `0.19.0`                |
  | `gatling-kafka-plugin` | `0.20.5`              | `0.22.0`                |
  | `gatling-amqp-plugin`  | `1.0.4`               | `1.2.0`                 |

  Between those columns sit the 3.12 releases. A `-latest` suffix jumps the line — `0.17.1` is
  a 3.11 release and `0.17.1-latest` is not — and `gatling-jdbc-plugin 0.13.0` is a mis-publish
  pinned to 3.13.1 between two 3.11 releases, so read the artifact's POM when a pin looks out
  of sequence.

- **Language does not gate the Galaxio libraries.** Picatinny and the JDBC, Kafka and AMQP
  plugins ship Java facades under `org.galaxio.gatling…javaapi`, so Java and Kotlin use them
  directly. The substitutions in
  [references/picatinny-substitutes.md](references/picatinny-substitutes.md) are for a project
  that cannot take the dependency — one that simply does not have it yet should add it.
- **A protocol plugin on 3.11 is a version choice, not an upgrade.** Adding JDBC, Kafka or AMQP
  to a 3.11 project means taking that library's 3.11 release from the table above, not moving
  the project. Only a request that genuinely needs 3.13 — the current release of a library, or
  a Gatling feature added after 3.11 — makes it an upgrade, and that is a decision to put to
  the user before changing the build. Never hand-roll a substitute for a protocol plugin.

## Dispatch

These four tables are the whole reference index. Each axis owns one kind of fact: language files
own DSL syntax and declaration shapes, build files own source roots, run commands, build-file
shape and the build-plugin floor, version files own the version numbers that do not depend on
the build tool. Where a fact has to appear twice, the version files are the source of truth.

**1. By language** — read one:

| Detected   | Read                                                   |
| ---------- | ------------------------------------------------------ |
| `*/scala`  | [references/lang-scala.md](references/lang-scala.md)   |
| `*/java`   | [references/lang-java.md](references/lang-java.md)     |
| `*/kotlin` | [references/lang-kotlin.md](references/lang-kotlin.md) |

**2. By build tool, within that language** — read one. Each cell is its own file, so nothing
here mixes languages:

| Language | `build.sbt`                                         | `pom.xml`                                                 | `build.gradle[.kts]`                                        |
| -------- | --------------------------------------------------- | --------------------------------------------------------- | ----------------------------------------------------------- |
| Scala    | [build-sbt-scala.md](references/build-sbt-scala.md) | [build-maven-scala.md](references/build-maven-scala.md)   | [build-gradle-scala.md](references/build-gradle-scala.md)   |
| Java     | not supported — sbt serves Scala only               | [build-maven-java.md](references/build-maven-java.md)     | [build-gradle-java.md](references/build-gradle-java.md)     |
| Kotlin   | not supported                                       | [build-maven-kotlin.md](references/build-maven-kotlin.md) | [build-gradle-kotlin.md](references/build-gradle-kotlin.md) |

**3. By Gatling version** — read one. The numbers here are build-tool-independent; the plugin
floors live in the build file above:

| Detected                      | Read                                                                           |
| ----------------------------- | ------------------------------------------------------------------------------ |
| `3.13.x`, or nothing detected | [references/version-3-13.md](references/version-3-13.md)                       |
| `3.11.x`                      | [references/version-3-11.md](references/version-3-11.md)                       |
| `3.12.x`                      | [references/version-3-13.md](references/version-3-13.md), and flag the upgrade |
| `3.14.x`, `3.15.x`            | [references/beyond-3-13.md](references/beyond-3-13.md)                         |
| Moving between lines          | [references/migrate-3-11-to-3-13.md](references/migrate-3-11-to-3-13.md)       |

**4. By protocol and library** — read only what the task uses:

| Task involves                                                             | Read                                                                       |
| ------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Creating a project from nothing                                           | [references/starter-tree.md](references/starter-tree.md)                   |
| Writing `simulation.conf`, `logback.xml`, a feeder CSV or a body template | [references/resource-files.md](references/resource-files.md)               |
| HTTP requests                                                             | [references/protocol-http.md](references/protocol-http.md)                 |
| SQL, a database                                                           | [references/protocol-jdbc.md](references/protocol-jdbc.md)                 |
| Kafka topics                                                              | [references/protocol-kafka.md](references/protocol-kafka.md)               |
| AMQP, RabbitMQ, JMS queues                                                | [references/protocol-messaging.md](references/protocol-messaging.md)       |
| Picatinny pinned `1.x`                                                    | [references/picatinny-1-x.md](references/picatinny-1-x.md)                 |
| Picatinny pinned `0.x` — a materially different API                       | [references/picatinny-0-x.md](references/picatinny-0-x.md)                 |
| A project that cannot take Picatinny                                      | [references/picatinny-substitutes.md](references/picatinny-substitutes.md) |
| Writing or changing a simulation                                          | [references/workload-models.md](references/workload-models.md)             |

## Invariants

True for every version, build tool and language below. The snippets are Scala; Java and Kotlin
syntax is in [references/lang-java.md](references/lang-java.md) and
[references/lang-kotlin.md](references/lang-kotlin.md).

### Layout

One tree, with only the source root changing per build tool:

```text
<source-root>/org/galaxio/performance/
  performance.scala | Performance.java | Performance.kt   # shared protocols
  cases/            # atomic actions: HTTP, Kafka, JDBC, AMQP, JMS
  feeders/          # custom feeders
  scenarios/        # flows built from cases
  *Simulation.*     # simulations only
<resource-root>/
  simulation.conf
  logback.xml
```

The source and resource roots come from the build tool, not from preference — they are in the
build reference the dispatch table sent you to.

Boundaries:

- `cases`: request or action only. No workload, no scenario.
- `feeders`: data only. No requests.
- `scenarios`: business flow only. No injection profile.
- `simulations`: injection, protocols, max duration. No request definitions.
- `performance.scala`, `Performance.java`, `Performance.kt`: shared protocols only.

`pace` belongs inside the scenario loop. Injection controls how many users arrive; `pace`
controls the rhythm of one user's iterations. They are not interchangeable.

### Feeders

Default to `circular`:

```scala
val accounts = csv("accounts.csv").circular
```

Use `queue` only when each row must be consumed once and the file is large enough for the whole
run. A small `queue` feeder runs dry mid-test and the simulation fails. Feeder exhaustion is a
test defect, not a finding about the system under test.

**Generated data or a CSV is decided by the field, not by preference.** A value the system
under test must already know — an account id, a customer number, an existing order — comes from
a CSV of real identifiers. A value the system only stores or echoes — a message id, a name, a
phone, a payload field — can be generated, and generated feeders never exhaust. Getting this
backwards produces the worst kind of result: a generated account id that no lookup matches, so
every request 404s or returns an empty set, the run is green because nothing asserted on the
body, and the report measures the error path at full speed.

Feeder files and body templates resolve against the **resource root**, not the source root:
`csv("accounts.csv")` reads `<resource-root>/accounts.csv`, which is `src/test/resources` under
sbt and Maven but `src/gatling/resources` under Gradle.

### Config And Secrets

No environment data in source. Host, port, topic, queue and database URL live in
`simulation.conf`. Keep the key names identical across languages so one `simulation.conf` serves
a Scala, Java or Kotlin project unchanged.

Credentials are the exception: `simulation.conf` is a committed resource, so a password written
into it is a committed secret. Reference the environment instead — HOCON substitutes it at load
time and the file stays safe to commit:

```hocon
dbUser = ${?DB_USER}
dbPassword = ${?DB_PASSWORD}
```

Give such a key **no default line**. `${?VAR}` is HOCON's optional substitution: with a default
above it, an unset variable silently leaves the default in place; with no default, the key stays
undefined and the getter fails at class-initialization naming it. The same rule applies to
`baseUrl`, where a surviving `localhost` default turns a load test into a green report against
nothing.

`-Dparam=value` is not a substitute for a secret: it lands in `ps` output and in CI job logs.
Use it for non-sensitive overrides.

### Checks

Validate technically and on business meaning:

```scala
.check(
  status.is(200),
  jsonPath("$.id").saveAs("id"),
)
```

`status.is(200)` alone is wrong whenever the body can carry a business error. A saved value
exists only after its check succeeded — anything downstream that reads it must be on the success
path. Use `checkIf` for optional branches rather than a second unconditional check.

### Session

The session is immutable. Return the changed session; do not discard it.

Bad:

```scala
exec { session =>
  session.set("id", "1")
  session
}
```

Good:

```scala
exec { session =>
  session.set("id", "1")
}
```

Expression-language strings resolve inside the Gatling DSL. Plain functions do not — they need
an explicit read:

```scala
exec { session =>
  myFunction(session("id").as[String])
  session
}
```

`myFunction("#{id}")` passes the literal text, not the value.

### Assertions And NFR

Never add assertions by default. Add them only when the user asks for NFR, SLA, pass/fail gates
or a quality gate in CI. A gate nobody asked for turns a measurement run into a red build.

When asked, the plain form is:

```scala
.assertions(
  global.successfulRequests.percent.gt(99),
  global.responseTime.percentile3.lt(1000),
)
```

Picatinny's YAML form is in the Picatinny file for your line.

### Operations

- `maxDuration` on every simulation, as a safety fuse.
- Groups for business transaction timings.
- `before` and `after` for setup and teardown only, never for virtual-user work.
- No `println` under load. Debug output belongs in the smoke simulation.
- Ship `logback.xml` at `WARN` for the Gatling loggers. Request and response logging —
  `io.gatling.http.engine.response` at `DEBUG` or `TRACE` — writes every body and every header
  to the log, including `Authorization` and any token a virtual user minted. It is a debugging
  aid for one smoke run, never a committed default: under load it also costs more than the
  requests being measured.

### Do Not

- Do not mix cases, scenarios and simulations in one file.
- Do not put injection in a scenario.
- Do not put request definitions in a simulation.
- Do not hardcode secrets.
- Do not use `Thread.sleep`; use `pause` or `pace`.
- Do not use throttling as the primary workload model. Model with injection first.
- Do not create a client or connection per request.
- Do not mutate shared state from virtual users unless it is thread-safe.
- Do not ignore feeder exhaustion.
- Do not add NFR gates unless asked.
- Do not use Scala 3: every Galaxio artifact is published for `_2.13` only.
- Do not mix a Gatling line with a Galaxio plugin line — see
  [references/beyond-3-13.md](references/beyond-3-13.md).
