# Galaxio Artifacts Per Gatling Line

Read the column for the line the project is on — [gatling-lines.md](gatling-lines.md) says how to establish it. A **range** is closed. **`+`** is open, top looked up. A **bare version** is the only release on that line. **none** means no release targets that line — not that the number is unknown.

| Artifact               | 3.9.x             | 3.11.x            | 3.13.x    | 3.14.x, 3.15.x |
| ---------------------- | ----------------- | ----------------- | --------- | -------------- |
| `gatling-picatinny`    | `0.14.0`–`0.14.1` | `0.16.0`–`1.10.4` | `1.12.0`+ | **none**       |
| `gatling-jdbc-plugin`  | `0.10.3`          | `0.12.0`–`0.17.2` | `0.19.0`+ | **none**       |
| `gatling-kafka-plugin` | `0.12.0`          | `0.14.0`–`0.20.5` | `0.22.0`+ | **none**       |
| `gatling-amqp-plugin`  | `0.10.3`          | `0.12.0`–`1.0.4`  | `1.2.0`+  | **none**       |

- Test-scoped, `_2.13` suffix on every artifact outside sbt, any `2.13.x` patch. Nothing outside this table is a hard pin.
- **Java 8 on 3.9.x is a Scala-only floor.** The Scala classes are class-file major 52 there, but the `org.galaxio.gatling.javaapi` facade every Java and Kotlin project goes through is major 61 in the same jars — measured in Picatinny `0.14.1` and `gatling-jdbc-plugin 0.10.3`. Java 8 runs a Scala 3.9.x project and nothing else; Java and Kotlin need 17 on every line.
- **3.14.x and 3.15.x have no release** — confirm with [version-lookup.md](version-lookup.md) before relying on it. A project keeping any of the four **stays on 3.13.x**. Without those libraries the higher lines are an ordinary target, Picatinny replaced by [picatinny-substitutes.md](../../galaxio-gatling-pro/references/picatinny-substitutes.md).

## A Pin From The Wrong Column Fails Late, Not Early

Every artifact declares `gatling-core` at `provided` scope, so a pin from a lower column resolves cleanly against whatever Gatling the project declares, and the simulation **compiles**. The failure is at run time, and only on the APIs that bind Gatling internals.

Measured with Picatinny `0.18.2` — a 3.11 release — on Gatling `3.13.5`:

| API                                                                           | Result                                                                                               |
| ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `RandomUUIDFeeder` and the rest of `org.galaxio.gatling.feeders`              | runs                                                                                                 |
| `startTransaction` / `endTransaction` from `org.galaxio.gatling.transactions` | `java.lang.NoSuchMethodError: 'akka.actor.ActorSystem io.gatling.core.CoreComponents.actorSystem()'` |

That method left with Akka at 3.12, which is exactly what makes a `0.x` pin unusable above it. So a green build proves nothing: a feeder-only project can sit on a wrong pin indefinitely and break the day someone adds a transaction. Read the column, do not infer it from a passing compile.

## Which Line A Version Targets

Version order will not tell you: `gatling-jdbc-plugin 0.17.1` is a 3.11 release and `0.17.1-latest` is not; `0.13.0` is a mis-publish on 3.13.1 sitting between two 3.11 releases; `gatling-picatinny` has no 3.12 release at all.

Each artifact's own POM is the answer:

```bash
curl -s https://repo1.maven.org/maven2/org/galaxio/gatling-picatinny_2.13/1.12.0/gatling-picatinny_2.13-1.12.0.pom \
  | grep -A2 gatling-core
```

Swap in `gatling-jdbc-plugin_2.13`, `gatling-kafka-plugin_2.13` or `gatling-amqp-plugin_2.13`. Run it whenever a pin looks out of sequence.

Take the newest release **whose POM names the line the project is on**, never the newest release outright. Crossing a line is a decision to put to the user, not a side effect of picking a version.
