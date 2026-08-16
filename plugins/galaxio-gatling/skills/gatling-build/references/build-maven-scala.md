# Maven + Scala

A repository already committed to Maven stays on Maven: add, never restructure. Prefer sbt for Scala only when choosing the build tool from nothing, and then read the sbt cell instead of this one, never both.

## Roots And Commands

| Concern            | Path or command                                        |
| ------------------ | ------------------------------------------------------ |
| Simulations        | `src/test/scala`                                       |
| Resources          | `src/test/resources`                                   |
| Compile            | `./mvnw test-compile`                                  |
| Run one simulation | `./mvnw gatling:test -Dgatling.simulationClass=<fqcn>` |

Not `src/gatling/*` — that is the Gradle convention, and under Maven it produces sources nothing compiles.

## What To Add

Under `<build>`: set `<testSourceDirectory>` to `src/test/scala`.

Under `<dependencies>`, all `test`-scoped:

| Artifact                                          | Version                | Notes                                                                                              |
| ------------------------------------------------- | ---------------------- | -------------------------------------------------------------------------------------------------- |
| `io.gatling.highcharts:gatling-charts-highcharts` | `${gatling.version}`   | always                                                                                             |
| `org.galaxio:gatling-picatinny_2.13`              | `${picatinny.version}` | when using Picatinny                                                                               |
| `org.galaxio:gatling-jdbc-plugin_2.13`            |                        | plus a JDBC driver — see [protocol-jdbc.md](../../galaxio-gatling-pro/references/protocol-jdbc.md) |
| `org.galaxio:gatling-kafka-plugin_2.13`           |                        | Kafka only                                                                                         |
| `org.galaxio:gatling-amqp-plugin_2.13`            |                        | AMQP only                                                                                          |

A JMS project adds its broker's client here — [protocol-messaging.md](../../galaxio-gatling-pro/references/protocol-messaging.md).

Under `<build><plugins>`:

| Plugin                                  | Configuration it needs                          |
| --------------------------------------- | ----------------------------------------------- |
| `io.gatling:gatling-maven-plugin`       | none                                            |
| `net.alchim31.maven:scala-maven-plugin` | an `<execution>` binding the `testCompile` goal |

**The `scala-maven-plugin` execution is not optional.** `gatling-maven-plugin` v4 and later do not compile Scala, so without it the simulations are silently never built.

`scala-maven-plugin` is not pinned by Galaxio; take the current release or match what the repository declares.

## The `_2.13` Suffix

Maven cannot append the Scala suffix even for a Scala project, so every Galaxio artifact carries it explicitly.

## Plugin Floor And The JVM Option

Raise `gatling-maven-plugin` past the floor in [gatling-lines.md](../../gatling-versions/references/gatling-lines.md) and it sets the JVM option 3.13 requires, `--add-opens=java.base/java.lang=ALL-UNNAMED`, on its own — the first fix. Only when it is pinned lower, add to the plugin's `<configuration>` a `<jvmArgs>` list containing that one flag.

On the 3.11 line the flag is unnecessary; the floor there is lower and carries a minimum Maven version of its own — [gatling-lines.md](../../gatling-versions/references/gatling-lines.md) names both.
