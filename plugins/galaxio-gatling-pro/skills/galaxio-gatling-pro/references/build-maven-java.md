# Maven + Java

What to add to an existing `pom.xml`. For a whole project see
[starter-tree.md](starter-tree.md); the numbers are in [versions.md](versions.md).

## Roots And Commands

| Concern            | Path or command                                        |
| ------------------ | ------------------------------------------------------ |
| Simulations        | `src/test/java`                                        |
| Resources          | `src/test/resources`                                   |
| Compile            | `./mvnw test-compile`                                  |
| Run one simulation | `./mvnw gatling:test -Dgatling.simulationClass=<fqcn>` |

Not `src/gatling/*` — that is the Gradle convention, and under Maven it produces sources
nothing compiles.

## What To Add

Under `<dependencies>`, all `test`-scoped:

| Artifact                                          | Version                | Notes                                                         |
| ------------------------------------------------- | ---------------------- | ------------------------------------------------------------- |
| `io.gatling.highcharts:gatling-charts-highcharts` | `${gatling.version}`   | always                                                        |
| `org.galaxio:gatling-picatinny_2.13`              | `${picatinny.version}` | when using Picatinny                                          |
| `org.galaxio:gatling-jdbc-plugin_2.13`            |                        | plus a JDBC driver — see [protocol-jdbc.md](protocol-jdbc.md) |
| `org.galaxio:gatling-kafka-plugin_2.13`           |                        | Kafka only                                                    |
| `org.galaxio:gatling-amqp-plugin_2.13`            |                        | AMQP only                                                     |

Under `<build><plugins>`: `io.gatling:gatling-maven-plugin`, no configuration.

Nothing else. `maven-compiler-plugin` already compiles `.java` from `src/test/java`, which is
why Java is the only combination that needs no compiler plugin of its own.

## The `_2.13` Suffix

Maven cannot append the Scala suffix, so every Galaxio artifact carries it explicitly. It names
the artifact, not the language of your sources — each ships a Java facade.

## Plugin Floor And The JVM Option

Raise `gatling-maven-plugin` past the floor in [versions.md](versions.md) and it sets the JVM
option 3.13 requires ([migrate.md](migrate.md)) on its own, so that is the first fix. Only when it is pinned lower, add to the plugin's `<configuration>` a `<jvmArgs>`
list containing that one flag.

On the 3.11 line the flag is unnecessary; the floor there is lower and carries a minimum Maven
version of its own — [versions.md](versions.md) names both.
