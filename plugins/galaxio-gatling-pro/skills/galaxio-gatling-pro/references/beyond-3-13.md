# Above 3.13.x

Gatling ships newer lines than the ones this skill profiles. The latest is `3.15.1`
(2026-05-25), with `3.14.9` before it. This skill stops at 3.13.x on purpose.

## Why The Ceiling

The whole Galaxio toolchain pins Gatling `3.13.5`: `gatling-picatinny` (current release
`1.25.0`), `gatling-jdbc-plugin`, `gatling-kafka-plugin` and `gatling-amqp-plugin`. No release
of any of them targets 3.14 or 3.15.

**Rule: a project depending on the Galaxio JDBC, Kafka or AMQP plugin stays on 3.13.x.**
Raising Gatling alone produces a build that resolves and then fails at runtime on missing or
incompatible classes.

## What Changes Above The Line

Useful to know when reading someone else's 3.14+ project, or when deciding to leave Galaxio
plugins behind.

| Change                                               | Line | Effect                                                                                                  |
| ---------------------------------------------------- | ---- | ------------------------------------------------------------------------------------------------------- |
| `javax.jms` → `jakarta.jms`                          | 3.14 | Import rewrite in JMS code, plus a broker client that speaks the Jakarta API                            |
| gRPC on Gatling Enterprise needs newer build plugins | 3.14 | `gatling-maven-plugin` `4.15.0`, `gatling-gradle` `3.14.0.2`, `gatling-sbt` `4.13.0`                    |
| Feeder loading modes `eager` and `batch` removed     | 3.15 | Any explicit loading mode on a file-based feeder must be deleted; the default is now the only behaviour |
| `httpConcurrentRequests` added                       | 3.15 | Concurrent requests without a parent request                                                            |
| `logActualValueInError` added                        | 3.15 | Suppresses the actual value in a failing check message, to limit error cardinality                      |

The `--add-opens=java.base/java.lang=ALL-UNNAMED` requirement introduced at 3.13 still holds
above the line; any build plugin at the versions above sets it already.

The upstream upgrade guide writes the Gradle floor as `3.14.01`, which does not exist — the
3.14 line starts at `3.14.0.2`. Use a published version or the plugin does not resolve.

## If The Target Really Is 3.14 Or 3.15

Only viable for a project with no Galaxio plugin dependency. Everything in this skill about
layout, workload models, checks and session handling still applies — those are Gatling core
and unchanged. What does not apply is Picatinny: use the substitutions in
[picatinny-substitutes.md](picatinny-substitutes.md), and treat the version numbers in
[version-3-13.md](version-3-13.md) as no longer valid.
