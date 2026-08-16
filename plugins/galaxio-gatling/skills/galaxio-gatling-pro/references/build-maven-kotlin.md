# Maven + Kotlin

## Roots And Commands

| Concern            | Path or command                                        |
| ------------------ | ------------------------------------------------------ |
| Simulations        | `src/test/kotlin`                                      |
| Resources          | `src/test/resources`                                   |
| Compile            | `./mvnw test-compile`                                  |
| Run one simulation | `./mvnw gatling:test -Dgatling.simulationClass=<fqcn>` |

Not `src/gatling/*` — that is the Gradle convention, and under Maven it produces sources nothing compiles.

## What To Add

Under `<build>`: set `<testSourceDirectory>` to `${project.basedir}/src/test/kotlin`.

Under `<dependencies>`, all `test`-scoped:

| Artifact                                          | Version                | Notes                                                         |
| ------------------------------------------------- | ---------------------- | ------------------------------------------------------------- |
| `io.gatling.highcharts:gatling-charts-highcharts` | `${gatling.version}`   | always                                                        |
| `org.jetbrains.kotlin:kotlin-stdlib`              | `${kotlin.version}`    | Kotlin's own version is not pinned by Galaxio                 |
| `org.galaxio:gatling-picatinny_2.13`              | `${picatinny.version}` | when using Picatinny                                          |
| `org.galaxio:gatling-jdbc-plugin_2.13`            |                        | plus a JDBC driver — see [protocol-jdbc.md](protocol-jdbc.md) |
| `org.galaxio:gatling-kafka-plugin_2.13`           |                        | Kafka only                                                    |
| `org.galaxio:gatling-amqp-plugin_2.13`            |                        | AMQP only                                                     |

A JMS project adds its broker's client here — [protocol-messaging.md](protocol-messaging.md).

Under `<build><plugins>`:

| Plugin                                     | Configuration it needs                                                                                              |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| `io.gatling:gatling-maven-plugin`          | none                                                                                                                |
| `org.jetbrains.kotlin:kotlin-maven-plugin` | an `<execution>` binding the `test-compile` goal, with `<sourceDirs>` listing `src/test/kotlin` and `src/test/java` |

**The Kotlin execution is not optional.** `maven-compiler-plugin` handles only `.java`, and a plugin declared without `<executions>` never runs — so without it `./mvnw test-compile` succeeds having compiled nothing, and `gatling:test` then reports no simulation class.

No all-open compiler plugin. Gatling instantiates a simulation reflectively through its no-argument constructor rather than extending it, so a final Kotlin class is fine.

## The `_2.13` Suffix

Maven cannot append the Scala suffix, so every Galaxio artifact carries it explicitly. It names the artifact, not the language of your sources — each ships a Java facade that Kotlin consumes directly.

## Plugin Floor And The JVM Option

Raise `gatling-maven-plugin` past the floor in [gatling-lines.md](../../gatling-versions/references/gatling-lines.md) and it sets the JVM option 3.13 requires, `--add-opens=java.base/java.lang=ALL-UNNAMED`, on its own — the first fix. Only when it is pinned lower, add to the plugin's `<configuration>` a `<jvmArgs>` list containing that one flag.

On the 3.11 line the flag is unnecessary; the floor there is lower and carries a minimum Maven version of its own — [gatling-lines.md](../../gatling-versions/references/gatling-lines.md) names both.
