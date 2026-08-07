# Galaxio Artifacts Per Gatling Line

**range** — closed. **`+`** — top looked up. **bare version** — the only release on that line. **none** — no release targets it.

| Artifact            | 3.9.x             | 3.11.x            | 3.13.x    | 3.14.x, 3.15.x |
| ------------------- | ----------------- | ----------------- | --------- | -------------- |
| `gatling-picatinny` | `0.14.0`–`0.14.1` | `0.16.0`–`1.10.4` | `1.12.0`+ | **none**       |

`gatling-picatinny 0.15.0` targets 3.10.x, which has no column of its own — the only Galaxio release on that line.

| `gatling-jdbc-plugin` | `0.10.3` | `0.12.0`–`0.17.2`, not `0.13.0` | `0.19.0`+ | **none** |
| `gatling-kafka-plugin` | `0.12.0` | `0.14.0`–`0.20.5` | `0.22.0`+ | **none** |
| `gatling-amqp-plugin` | `0.10.3` | `0.12.0`–`1.0.4` | `1.2.0`+ | **none** |

- Test-scoped, `_2.13` outside sbt, any `2.13.x` patch.
- **Java 8 on 3.9.x is Scala-only.** The Scala classes are major 52; the `org.galaxio.gatling.javaapi` facade in the same jars is major 61. Java and Kotlin need 17 on every line.
- A project keeping any of the four **stays on 3.13.x**. Without them, [picatinny-substitutes.md](../../galaxio-gatling-pro/references/picatinny-substitutes.md).

## A Wrong-Column Pin Fails Late

`gatling-core` is `provided` in every artifact, so a pin from a lower column resolves and **compiles**. It breaks at run time, and only on APIs that bind Gatling internals. Picatinny `0.18.2`, a 3.11 release, on Gatling `3.13.5`:

| API                                | Result                                                                                               |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `org.galaxio.gatling.feeders`      | runs                                                                                                 |
| `org.galaxio.gatling.transactions` | `java.lang.NoSuchMethodError: 'akka.actor.ActorSystem io.gatling.core.CoreComponents.actorSystem()'` |

That method left with Akka at 3.12. Read the column.

## Which Line A Version Targets

Version order will not tell you: `gatling-jdbc-plugin 0.17.1` is a 3.11 release and `0.17.1-latest` is not; `0.13.0` is a mis-publish on 3.13.1 between two 3.11 releases; `gatling-picatinny` has no 3.12 release.

```bash
curl -s https://repo1.maven.org/maven2/org/galaxio/gatling-picatinny_2.13/1.12.0/gatling-picatinny_2.13-1.12.0.pom \
  | grep -A2 gatling-core
```

Swap in `gatling-jdbc-plugin_2.13`, `gatling-kafka-plugin_2.13`, `gatling-amqp-plugin_2.13`. Take the newest release **whose POM names the project's line**, never the newest outright.
