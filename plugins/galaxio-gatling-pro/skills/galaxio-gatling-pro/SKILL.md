---
name: galaxio-gatling-pro
description: 'Use when creating, reviewing, or refactoring Gatling JVM performance tests in Galaxio style: Scala/Java/Kotlin projects with sbt, Maven, or Gradle, Gatling 3.x, Picatinny config/feeders where available, cases/feeders/scenarios/simulations layout, HTTP/JDBC/JMS/Kafka/AMQP protocols, open and closed workload models, smoke/debug simulations, and build-tool-correct project structure.'
---

# Galaxio Gatling Pro

## Core Rules

Use Gatling `3.11.x` and Scala `2.13.x` as the Galaxio baseline.

Supported JVM combinations:

- Scala + sbt: Scala DSL, `src/test/scala`, optional `src/it/scala`.
- Scala + Maven: Scala DSL, `src/test/scala`, `scala-maven-plugin`.
- Scala + Gradle: Scala DSL, `src/gatling/scala`, Gradle `gatling` source set.
- Java + Maven: Java DSL, `src/test/java`.
- Java + Gradle: Java DSL, `src/gatling/java`, Gradle `gatling` source set.
- Kotlin + Maven: Java DSL from Kotlin, `src/test/kotlin`, `kotlin-maven-plugin`.
- Kotlin + Gradle: Java DSL from Kotlin, `src/gatling/kotlin`, Gradle `gatling` source set.

Prefer `org.galaxio.gatling-picatinny` helpers when the repo has the dependency.
Picatinny examples in this skill are Scala-first; for Java/Kotlin, keep the same
architecture and use small local config/feeder helpers if Picatinny is not exposed
through the project's chosen DSL.

Generated Scala code in sbt projects must pass:

```bash
sbt scalafmtAll scalafmtSbt
```

When changing existing repo, follow local style first. If no style, use this skill.

## Build Tool Matrix

Use the build tool's conventional Gatling source roots. Do not move everything into
`src/test/scala` just because the Galaxio template started as sbt.

| Build tool | Languages | Simulation source root             | Resource root           | Run one simulation                                     |
| ---------- | --------- | ---------------------------------- | ----------------------- | ------------------------------------------------------ |
| sbt        | Scala     | `src/test/scala` or `src/it/scala` | `src/test/resources`    | `sbt 'Gatling/testOnly <fqcn>'`                        |
| Maven      | Scala     | `src/test/scala`                   | `src/test/resources`    | `./mvnw gatling:test -Dgatling.simulationClass=<fqcn>` |
| Maven      | Java      | `src/test/java`                    | `src/test/resources`    | `./mvnw gatling:test -Dgatling.simulationClass=<fqcn>` |
| Maven      | Kotlin    | `src/test/kotlin`                  | `src/test/resources`    | `./mvnw gatling:test -Dgatling.simulationClass=<fqcn>` |
| Gradle     | Scala     | `src/gatling/scala`                | `src/gatling/resources` | `./gradlew gatlingRun --simulation <fqcn>`             |
| Gradle     | Java      | `src/gatling/java`                 | `src/gatling/resources` | `./gradlew gatlingRun --simulation <fqcn>`             |
| Gradle     | Kotlin    | `src/gatling/kotlin`               | `src/gatling/resources` | `./gradlew gatlingRun --simulation <fqcn>`             |

Compile/pre-flight commands:

```bash
sbt Gatling/compile
./mvnw test-compile
./gradlew testClasses
```

## Project Layout

Keep the Galaxio boundaries regardless of language or build tool. Only the source
root changes.

Canonical Scala/sbt layout:

```text
src/test/scala/org/galaxio/performance/
  performance.scala # package object with protocols
  cases/            # atomic actions: HTTP, Kafka, JDBC, AMQP, JMS
  feeders/          # custom feeders; prefer Picatinny feeders
  scenarios/        # flows built from cases
  *Simulation.scala # simulations only
src/test/resources/
  simulation.conf
  gatling.conf
  logback.xml
```

Same layout adapted to each build tool:

```text
# sbt or Maven + Scala
src/test/scala/org/galaxio/performance/{performance.scala,cases,feeders,scenarios,*Simulation.scala}
src/test/resources/{simulation.conf,gatling.conf,logback.xml}

# Maven + Java
src/test/java/org/galaxio/performance/{Performance.java,cases,feeders,scenarios,*Simulation.java}
src/test/resources/{simulation.conf,gatling.conf,logback.xml}

# Maven + Kotlin
src/test/kotlin/org/galaxio/performance/{Performance.kt,cases,feeders,scenarios,*Simulation.kt}
src/test/resources/{simulation.conf,gatling.conf,logback.xml}

# Gradle + Scala
src/gatling/scala/org/galaxio/performance/{performance.scala,cases,feeders,scenarios,*Simulation.scala}
src/gatling/resources/{simulation.conf,gatling.conf,logback.xml}

# Gradle + Java
src/gatling/java/org/galaxio/performance/{Performance.java,cases,feeders,scenarios,*Simulation.java}
src/gatling/resources/{simulation.conf,gatling.conf,logback.xml}

# Gradle + Kotlin
src/gatling/kotlin/org/galaxio/performance/{Performance.kt,cases,feeders,scenarios,*Simulation.kt}
src/gatling/resources/{simulation.conf,gatling.conf,logback.xml}
```

Keep boundaries strict:

- `cases`: request/action only. No workload. No scenario.
- `feeders`: data only. No requests.
- `scenarios`: business flow only. No injection profile.
- `simulations`: injection, protocols, max duration. No request definitions.
- `performance.scala`, `Performance.java`, or `Performance.kt`: shared protocols only.

Do not use Gradle's `src/test/*` for Gatling simulations unless the project already
customizes the `gatling` source set. Do not use Maven's `src/gatling/*` unless the
project explicitly customizes plugin/source directories.

## Imports

Scala, Java and Kotlin import sets, plus the per-protocol imports:
[references/imports.md](references/imports.md).

Only add assertion imports when user explicitly asks for NFR/assertions.

## Config

Use Picatinny `SimulationConfig`.
For Java/Kotlin projects without Picatinny bindings, centralize the same config
keys in `Performance.java`/`Performance.kt` or a dedicated `Config` helper using
system properties and resource config. Keep names compatible with Scala projects.

Default params:

```scala
baseUrl
baseAuthUrl
wsBaseUrl
intensity
stagesNumber
rampDuration
stageDuration
testDuration
```

Custom params:

```scala
val kafkaUrl = getStringParam("kafkaUrl")
val pacing   = getDurationParam("pacing")
val debug    = getBooleanParam("debug", false)
```

Do not hardcode env data in Scala. Put host, login, password, topic, queue, DB URL in `simulation.conf` or pass via `-Dparam=value`.

## Cases

Case = one atomic action. HTTP, Kafka, JDBC, AMQP and JMS case examples in Scala,
Java and Kotlin: [references/cases.md](references/cases.md).

## Feeders

Prefer Picatinny feeders:

```scala
object Feeders {
  val messageId = RandomUUIDFeeder("messageId")
  val phone     = RandomPhoneFeeder("phone")
}
```

CSV feeder:

```scala
val accounts = csv("accounts.csv").circular
```

Use `queue` only when each row must be unique and data volume is enough.

Do not use tiny `queue` feeder under load. Feeder ends, test fails.

## Scenarios

Scala pattern:

```scala
object MainScenario {
  def apply(): ScenarioBuilder = new MainScenario().scn
}

class MainScenario {
  val scn: ScenarioBuilder = scenario("Main Scenario")
    .feed(Feeders.messageId)
    .exec(HttpCases.getMainPage)
}
```

Closed model with pacing:

```scala
object ClosedPacingScenario {
  def apply(): ScenarioBuilder = new ClosedPacingScenario().scn
}

class ClosedPacingScenario {
  val scn: ScenarioBuilder = scenario("Closed Pacing Scenario")
    .forever(
      pace(pacing)
        .feed(Feeders.messageId)
        .exec(HttpCases.getMainPage),
    )
}
```

`pace` belongs inside scenario loop. Injection controls users. `pace` controls iteration rhythm.

Java pattern:

```java
public final class MainScenario {
  public static ScenarioBuilder create() {
    return scenario("Main Scenario")
        .feed(Feeders.messageId)
        .exec(HttpCases.getMainPage);
  }

  private MainScenario() {}
}
```

Kotlin pattern:

```kotlin
object MainScenario {
    fun create(): ScenarioBuilder = scenario("Main Scenario")
        .feed(Feeders.messageId)
        .exec(HttpCases.getMainPage)
}
```

## Protocols

Keep in `performance.scala`, `Performance.java`, or `Performance.kt`. HTTP, JDBC,
Kafka, AMQP and JMS protocol builders: [references/protocols.md](references/protocols.md).

## Simulations

Simulation = load profile only.

Scala open model, stable load:

```scala
class StabilitySimulation extends Simulation {
  setUp(
    MainScenario().inject(
      rampUsersPerSec(0).to(intensity).during(rampDuration),
      constantUsersPerSec(intensity).during(stageDuration),
    ),
  ).protocols(httpProtocol)
    .maxDuration(testDuration)
}
```

Open model, stages:

```scala
class MaxPerformanceSimulation extends Simulation {
  setUp(
    MainScenario().inject(
      incrementUsersPerSec(intensity / stagesNumber)
        .times(stagesNumber)
        .eachLevelLasting(stageDuration)
        .separatedByRampsLasting(rampDuration)
        .startingFrom(0.0),
    ),
  ).protocols(httpProtocol)
    .maxDuration(testDuration)
}
```

Closed model with pacing:

```scala
class ClosedPacingSimulation extends Simulation {
  setUp(
    ClosedPacingScenario().inject(
      rampConcurrentUsers(0).to(intensity.toInt).during(rampDuration),
      constantConcurrentUsers(intensity.toInt).during(stageDuration),
    ),
  ).protocols(httpProtocol)
    .maxDuration(testDuration)
}
```

Smoke/debug:

```scala
class DebugSimulation extends Simulation {
  setUp(
    MainScenario().inject(atOnceUsers(1)),
  ).protocols(httpProtocol)
    .maxDuration(1.minute)
}
```

Run:

```bash
sbt 'Gatling/testOnly org.galaxio.performance.DebugSimulation'
sbt 'Gatling/testOnly org.galaxio.performance.StabilitySimulation'
```

Java simulation shape:

```java
public class DebugSimulation extends Simulation {
  {
    setUp(
        MainScenario.create().injectOpen(atOnceUsers(1))
    ).protocols(Performance.httpProtocol);
  }
}
```

Kotlin simulation shape:

```kotlin
class DebugSimulation : Simulation() {
    init {
        setUp(
            MainScenario.create().injectOpen(atOnceUsers(1))
        ).protocols(Performance.httpProtocol)
    }
}
```

## Checks

Check technical and business success.

Good:

```scala
.check(
  status.is(200),
  jsonPath("$.id").saveAs("id"),
)
```

Do not check HTTP `200` only when response body carries business error.

Saved value exists only after successful check.

Use `checkIf` for optional branches.

## Session

Session immutable. Return changed session.

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

EL strings work inside Gatling DSL. Plain Scala functions need explicit session read.

Bad:

```scala
myFunction("#{id}")
```

Good:

```scala
exec { session =>
  myFunction(session("id").as[String])
  session
}
```

## Assertions And NFR

Do not add NFR/assertions by default.

Add only when user explicitly asks for NFR, SLA, assertions, or pass/fail gates.

When asked and Picatinny exists:

```scala
import org.galaxio.gatling.assertions.AssertionsBuilder.assertionFromYaml

.assertions(assertionFromYaml("src/test/resources/nfr.yml"))
```

Without Picatinny:

```scala
.assertions(
  global.successfulRequests.percent.gt(99),
  global.responseTime.percentile3.lt(1000),
)
```

## Operations

Use `maxDuration` as safety fuse.

Use groups for business transaction timings.

Use `before` and `after` only for setup/teardown outside virtual-user flow.

No `println` under load. Debug only in smoke simulation.

## Build Files

`.scalafmt.conf`, `build.sbt`, Maven `pom.xml` and Gradle build shapes for every
supported language: [references/build-files.md](references/build-files.md).

## Do Not

Do not mix cases, scenario, simulation in one file.

Do not put injection in scenarios.

Do not put request definitions in simulations.

Do not hardcode secrets.

Do not use `Thread.sleep`; use `pause` or `pace`.

Do not use throttling as main workload model. Use injection first.

Do not use `status.is(200)` as only validation for business APIs.

Do not create clients/connections per request.

Do not mutate shared vars from virtual users unless thread-safe.

Do not ignore feeder exhaustion.

Do not add NFR gates unless user asks.

Do not use Scala 3 for Gatling plugin projects unless repo already supports it.

Do not put Gatling Gradle simulations in `src/test/*` unless the project has
explicitly customized the `gatling` source set.

Do not omit `scala-maven-plugin` in Maven Scala projects; Gatling Maven plugin v4+
does not compile Scala simulations by itself.
