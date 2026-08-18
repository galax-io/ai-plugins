---
name: galaxio-gatling-pro
description: 'Use when writing, reviewing or refactoring the Gatling test code itself in Galaxio style: simulations, scenarios, cases and feeders in Scala, Java or Kotlin, HTTP, JDBC, Kafka, AMQP and JMS protocols, gatling-picatinny and the Galaxio protocol plugins, open and closed workload models, smoke and debug simulations, simulation.conf and the cases/feeders/scenarios/simulations layout.'
---

# Galaxio Gatling Pro

## How To Use This Skill

1. Run the detection below. Reviews take the same route as writing.
2. From dispatch read **one** language file and only the protocol files used. Writing or changing
   the build file itself is `gatling-build`; hand off only when the build file is in play.
3. Apply the invariants below; on a review they are the checklist.

Every version number is owned elsewhere — [gatling-lines.md](../gatling-versions/references/gatling-lines.md)
for Gatling, Scala, Java and the build plugins,
[galaxio-artifacts.md](../gatling-versions/references/galaxio-artifacts.md) for the four Galaxio
libraries, and [gatling-versions](../gatling-versions/SKILL.md) for reading a line off a build
file. Moving a project from one Gatling line to another is a migration, not a version choice.

Nothing detected? Greenfield default: Gatling `3.13.x`, Scala `2.13`, Java 17, sbt, and the 3.13
column of [galaxio-artifacts.md](../gatling-versions/references/galaxio-artifacts.md) for Picatinny.

**An existing repository outranks this skill.** Follow its conventions and version; add, never
restructure.

## Detect The Target

Run these from the directory holding the build file. **A non-zero exit means nothing** — read the
output, not the status. Silence everywhere means greenfield.

Language and source root; `*Simulation.*` wins any ambiguity:

```bash
ls -d src/test/scala src/test/java src/test/kotlin src/gatling/scala src/gatling/java src/gatling/kotlin 2>/dev/null
find src -name '*Simulation.*' 2>/dev/null
```

Build file:

```bash
ls -d build.sbt project pom.xml build.gradle build.gradle.kts settings.gradle settings.gradle.kts 2>/dev/null
```

Dependencies, for the line and for Picatinny — authored build inputs only, or a recursive walk of
`project/` picks up sbt's own stale resolution-cache report:

```bash
grep -rnE --include='*.sbt' --include='*.gradle' --include='*.kts' --include='pom.xml' \
  --include='*.toml' --include='*.properties' 'gatling|picatinny|org\.galaxio' . 2>/dev/null
```

Empty? Try `buildSrc/` and a Maven parent POM before concluding greenfield.

**Turning that output into a line is [gatling-versions](../gatling-versions/SKILL.md).** A
`gatling-maven-plugin`, `gatling-sbt` or `org.galaxio` number is not the line; `io.gatling.gradle`
is only the default, and `gatling { gatlingVersion = '…' }` overrides it.

## Dispatch

**1. By language** — read one:

| Detected   | Read                                                   |
| ---------- | ------------------------------------------------------ |
| `*/scala`  | [references/lang-scala.md](references/lang-scala.md)   |
| `*/java`   | [references/lang-java.md](references/lang-java.md)     |
| `*/kotlin` | [references/lang-kotlin.md](references/lang-kotlin.md) |

**2. By build tool** — only when the task opens the build file. Adding a scenario, reviewing a
simulation or answering a workload question does not, and the roots below cover those:

| Task                                                             | Read                                                                           |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Adding a dependency, raising a build plugin, scaffolding a build | [gatling-build](../gatling-build/SKILL.md), which picks one of its seven cells |

**3. By Gatling version** — every number lives in `gatling-versions`, read one:

| Detected                                         | Read                                                                        |
| ------------------------------------------------ | --------------------------------------------------------------------------- |
| Gatling, Scala, Java or a build plugin           | [gatling-lines.md](../gatling-versions/references/gatling-lines.md)         |
| `gatling-picatinny` or a Galaxio protocol plugin | [galaxio-artifacts.md](../gatling-versions/references/galaxio-artifacts.md) |
| What is published right now                      | [version-lookup.md](../gatling-versions/references/version-lookup.md)       |

Both tables have a column per line: 3.9.x, 3.11.x, 3.13.x, and 3.14.x/3.15.x together. **3.10.x
and 3.12.x have no column** — they say what to do instead. Everything outside the coordinates —
the DSL, the invariants — applies as on the nearest line below that has one.

**Moving a project onto a different line is not dispatched here.** It is an upgrade, with renames
and removals attached, and it has its own skill.

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

**Language does not gate the Galaxio libraries.** Picatinny and the JDBC, Kafka and AMQP plugins
ship Java facades under `org.galaxio.gatling…javaapi`, so Java and Kotlin use them directly.
[picatinny-substitutes.md](references/picatinny-substitutes.md) is for a project that cannot take
the dependency, or is on a line Picatinny does not publish for; one that simply does not have it
yet should add it.

**Adding a protocol plugin is a version choice, not an upgrade.** Take that library's release for
the line the project is already on. Raising the line is a decision to put to the user before the
build changes. Never hand-roll a substitute for a protocol plugin.

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

The roots come from the build tool, not from preference:

| Build tool | `<source-root>`          | `<resource-root>`       |
| ---------- | ------------------------ | ----------------------- |
| sbt        | `src/test/scala`         | `src/test/resources`    |
| Maven      | `src/test/<language>`    | `src/test/resources`    |
| Gradle     | `src/gatling/<language>` | `src/gatling/resources` |

Under Gradle the Gatling source set is `src/gatling/*`; a simulation written under `src/test/*`
fails to compile on its `io.gatling` imports, because Gatling's dependencies never reach that
source set. Outside Java the Maven row is configuration rather than a default — an existing
project reaches `src/test/kotlin` or `src/test/scala` only because its POM wires them, so follow
what the repository already does. Writing the build file itself is `gatling-build`.

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
Use it for non-sensitive overrides. Which keys a run requires, and what a `-D` override can and
cannot carry, are in [references/resource-files.md](references/resource-files.md).

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
  [galaxio-artifacts.md](../gatling-versions/references/galaxio-artifacts.md).
