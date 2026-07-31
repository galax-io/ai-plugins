# Gradle + Java

## Roots And Commands

| Concern            | Path or command                            |
| ------------------ | ------------------------------------------ |
| Simulations        | `src/gatling/java`                         |
| Resources          | `src/gatling/resources`                    |
| Compile            | `./gradlew gatlingClasses`                 |
| Run one simulation | `./gradlew gatlingRun --simulation <fqcn>` |

`io.gatling.gradle` creates a `gatling` source set and simulations go there, not in `src/test/*`.
`testClasses` compiles `src/test/*`, which is empty here, and reports BUILD SUCCESSFUL having
built nothing.

## What To Add

`plugins`: `id 'java'` and `id 'io.gatling.gradle'`. The Gatling plugin pulls Gatling itself.

`repositories`: `mavenCentral()`.

`dependencies`:

| Configuration           | Use for                                                |
| ----------------------- | ------------------------------------------------------ |
| `gatling`               | Picatinny and anything the simulations compile against |
| `gatlingImplementation` | protocol plugins                                       |
| `gatlingRuntimeOnly`    | JDBC drivers and other runtime-only artifacts          |

Those three are what reach the `gatlingRun` classpath. A dependency on plain `implementation` is
missing at run time — which is how a JDBC driver goes absent; see
[protocol-jdbc.md](protocol-jdbc.md).

Every Galaxio artifact needs the explicit `_2.13`; Gradle cannot append it. In a `.kts` build
the dependency block takes parentheses — `gatling("coords")` — because a Groovy-style string
call is a syntax error there.

A Gradle project usually keeps the version literal in `gradle/libs.versions.toml`,
`gradle.properties` or `settings.gradle[.kts]`. Bump it there; a second literal in
`build.gradle` is the one that goes stale.

## Plugin Floor, The JVM Option, And Gradle 9

Raise `gatling-gradle` past the floor in [versions.md](versions.md) and it sets the JVM option
3.13 requires ([migrate.md](migrate.md)) on its own; only when pinned lower, set `jvmArgs` in the `gatling`
block to a list containing that flag.

Check the Gradle version before promising `gatlingRun`. `io.gatling.gradle` `3.13.1` fails to
register the task on Gradle 9 (`Could not get unknown property 'reportsDir'`) and works on
8.10.2. When it will not register, `gatlingClasses` still compiles and the simulation can be run
off the `gatlingRuntimeClasspath` with `io.gatling.app.Gatling -s <fqcn>`.

On the 3.11 line the flag is unnecessary and the floor is `3.11.1`.
