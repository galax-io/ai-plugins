# sbt + Scala

## Roots And Commands

| Concern            | Path or command                                                  |
| ------------------ | ---------------------------------------------------------------- |
| Simulations        | `src/test/scala`                                                 |
| Resources          | `src/test/resources`                                             |
| Compile            | `sbt Gatling/compile`                                            |
| Run one simulation | `sbt 'Gatling/testOnly org.galaxio.performance.DebugSimulation'` |

**A project already split onto `src/it/scala` is a different configuration.** `gatling-sbt` also
ships `GatlingIt`, which extends sbt's `IntegrationTest` — that extends `Runtime`, not `Test`, so
its resources are `src/it/resources`, its dependencies need `% "it,test"` rather than `% Test`,
and its commands are `GatlingIt/compile` and `GatlingIt/testOnly`. No Galaxio template renders
that layout, so follow what the repository already does and change nothing about it here.

## What To Add

`enablePlugins(GatlingPlugin)`, and `ThisBuild / scalaVersion` set to the Scala version from the version file.

`libraryDependencies`, every one `% Test` — Picatinny included. Dropping the scope pulls the library onto the main classpath of a project that has no main sources to speak of:

| Artifact                    | Written as                    | Notes                                                                                              |
| --------------------------- | ----------------------------- | -------------------------------------------------------------------------------------------------- |
| `gatling-charts-highcharts` | `"io.gatling.highcharts" % …` | always                                                                                             |
| `gatling-test-framework`    | `"io.gatling" % …`            | always                                                                                             |
| `gatling-picatinny`         | `"org.galaxio" %% …`          | when using Picatinny                                                                               |
| `gatling-jdbc-plugin`       | `"org.galaxio" %% …`          | plus a JDBC driver — see [protocol-jdbc.md](../../galaxio-gatling-pro/references/protocol-jdbc.md) |
| `gatling-kafka-plugin`      | `"org.galaxio" %% …`          | Kafka only                                                                                         |
| `gatling-amqp-plugin`       | `"org.galaxio" %% …`          | AMQP only                                                                                          |

`%%` appends the `_2.13` suffix for the Galaxio artifacts — never write the suffix by hand here.

A JMS project adds its broker's client here, with a single `%` — [protocol-messaging.md](../../galaxio-gatling-pro/references/protocol-messaging.md).

In `project/plugins.sbt`: `addSbtPlugin("io.gatling" % "gatling-sbt" % "<version>")`.

## Plugin Floor And The JVM Option

Raise `gatling-sbt` past the floor in [gatling-lines.md](../../gatling-versions/references/gatling-lines.md) and it adds the JVM option 3.13 requires, `--add-opens=java.base/java.lang=ALL-UNNAMED`, for you — the first fix. Only when it is pinned lower and cannot move, add the flag to `Gatling / javaOptions`.

On the 3.11 line the flag is unnecessary and there is no floor — follow what the repository declares.
