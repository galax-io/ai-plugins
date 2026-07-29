# Gatling 3.13.x

The default line. Every current Galaxio artifact targets it: `gatling-picatinny`,
`gatling-jdbc-plugin`, `gatling-kafka-plugin` and `gatling-amqp-plugin` all pin Gatling
`3.13.5` in their own builds. Use this line for any new project.

## Versions

| Artifact               | Version                                             |
| ---------------------- | --------------------------------------------------- |
| Gatling                | `3.13.5`                                            |
| Scala                  | `2.13.x` — Galaxio publishes `_2.13` artifacts only |
| Java                   | 17+                                                 |
| `gatling-picatinny`    | `1.25.0`; `1.12.0` is the first on this line        |
| `gatling-jdbc-plugin`  | `1.5.0`; `0.19.0` is the first on this line         |
| `gatling-kafka-plugin` | latest `1.x`; `0.22.0` is the first on this line    |
| `gatling-amqp-plugin`  | latest `1.x`; `1.2.0` is the first on this line     |
| `gatling-maven-plugin` | `4.11.0` or later                                   |
| `gatling-gradle`       | `3.13.1`–`3.13.x` — see below                       |
| `gatling-sbt`          | `4.10.2` or later                                   |

`gatling-gradle` is the one row without an open upper bound. Its leading major.minor **is** the
Gatling line, so "or later" would put the project on 3.14.x or 3.15.x, off the only line the
Galaxio artifacts target. Stay inside `3.13.x`, or set `gatlingVersion = '3.13.5'` explicitly.
Maven and sbt are on independent 4.x numbering, so "or later" is safe there.

Every Galaxio artifact in this table has a 3.11 release too — the first-on-this-line numbers
above are where each one crosses. [version-3-11.md](version-3-11.md) has the 3.11 ceilings.
Requiring `1.x` of the JDBC plugin means Java 17+ in practice: the whole `javaapi` facade in
`gatling-jdbc-plugin_2.13-1.5.0.jar` is class-file major 61, whatever the upstream README says.

## Coordinates

Nothing outside this table is a hard pin. The Galaxio templates carry their own overridable
defaults for Kotlin and scalafmt, and `scala-maven-plugin` is unpinned entirely — match what
the repository already declares, or take the current release.

The Scala patch is free: 2.13 is binary-compatible across patches, so any `2.13.x` works with
the `_2.13` artifacts.

These numbers go into the build file for your language and build tool — the dispatch table in
`SKILL.md` names it. Everything is test-scoped, and outside sbt every Galaxio artifact needs
the explicit `_2.13` suffix — see [picatinny-1-x.md](picatinny-1-x.md).

## Required JVM Option

From 3.13 the report generator needs `--add-opens=java.base/java.lang=ALL-UNNAMED`. Every
build plugin at the version listed above sets it automatically, so the first fix for a failing
run is to raise the plugin rather than hand-write JVM arguments. Only a project pinned to an
older plugin needs the manual fallback documented in the build reference — or one that cannot
raise the plugin, which on Gradle 9 is every project, since `gatling-gradle` `3.13.1` does not
register its task there. See your Gradle build reference before assuming the raise is
available.

## New On This Line

- PROXY protocol emulation, so a load generator can present itself as traffic from a proxy:
  `proxyProtocolSourceIpV4Address` and `proxyProtocolSourceIpV6Address`.
- `jmsProperty` check, for asserting on properties of an inbound JMS message.

## Gone Since 3.11

Akka and the Graphite writer were dropped in 3.12. `stopInjector` and `stopInjectorIf` were
renamed to `stopLoadGenerator` and `stopLoadGeneratorIf`. Coming from 3.11, work through
[migrate-3-11-to-3-13.md](migrate-3-11-to-3-13.md).

## JMS Package

Still `javax.jms` on this line. The move to `jakarta.jms` happens at 3.14 —
see [beyond-3-13.md](beyond-3-13.md).

## Reference Stack

`galax-io/templates-gatling` pack `0.15.0` ships Gatling `3.13.5` with Picatinny `1.17.1` —
older than the table above, which stays authoritative; the templates simply lag —
across six templates: `scala-sbt`, `scala-gradle`, `java-maven`, `java-gradle`,
`kotlin-maven`, `kotlin-gradle`. There is no Maven + Scala template, so that combination is
hand-wired — see [build-maven-scala.md](build-maven-scala.md).
