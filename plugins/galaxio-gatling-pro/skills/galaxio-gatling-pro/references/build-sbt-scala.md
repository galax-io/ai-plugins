# sbt + Scala

## Roots And Commands

| Concern            | Path or command                                                                  |
| ------------------ | -------------------------------------------------------------------------------- |
| Simulations        | `src/test/scala`, or `src/it/scala` when the project separates integration tests |
| Resources          | `src/test/resources`                                                             |
| Compile            | `sbt Gatling/compile`                                                            |
| Run one simulation | `sbt 'Gatling/testOnly org.galaxio.performance.DebugSimulation'`                 |

## What To Add

`enablePlugins(GatlingPlugin)`, and `ThisBuild / scalaVersion` set to the Scala version from
the version file.

`libraryDependencies`, every one `% Test` — Picatinny included. Dropping the scope pulls the
library onto the main classpath of a project that has no main sources to speak of:

| Artifact                    | Written as                    | Notes                                                         |
| --------------------------- | ----------------------------- | ------------------------------------------------------------- |
| `gatling-charts-highcharts` | `"io.gatling.highcharts" % …` | always                                                        |
| `gatling-test-framework`    | `"io.gatling" % …`            | always                                                        |
| `gatling-picatinny`         | `"org.galaxio" %% …`          | when using Picatinny                                          |
| `gatling-jms`               | `"io.gatling" % …`            | JMS only                                                      |
| `gatling-jdbc-plugin`       | `"org.galaxio" %% …`          | plus a JDBC driver — see [protocol-jdbc.md](protocol-jdbc.md) |
| `gatling-kafka-plugin`      | `"org.galaxio" %% …`          | Kafka only                                                    |
| `gatling-amqp-plugin`       | `"org.galaxio" %% …`          | AMQP only                                                     |

`%%` appends the `_2.13` suffix for the Galaxio artifacts — never write the suffix by hand here.

In `project/plugins.sbt`: `addSbtPlugin("io.gatling" % "gatling-sbt" % "<version>")`.

## Plugin Floor And The JVM Option

Raise `gatling-sbt` past the floor in [versions.md](versions.md) and it adds the JVM option 3.13
requires ([migrate.md](migrate.md)) for you, which is why that is the first fix. Only
when it is pinned lower and cannot move, add the flag to `Gatling / javaOptions`.

On the 3.11 line the flag is unnecessary and there is no floor — follow what the repository
already declares.
