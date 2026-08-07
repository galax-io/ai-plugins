---
name: gatling-versions
description: 'Use when choosing or checking a version coordinate for a Gatling JVM performance project: which Gatling line a project is on, which release of gatling-maven-plugin, gatling-gradle or gatling-sbt goes with it, which gatling-picatinny, gatling-jdbc-plugin, gatling-kafka-plugin or gatling-amqp-plugin release targets that line, the Java and Scala floors, and what is published right now.'
---

# Gatling Versions

## Establish The Line First

The project's own Gatling pin is authoritative. Authored build inputs only — a recursive walk of `project/` picks up sbt's stale resolution-cache report:

```bash
grep -rnE --include='*.sbt' --include='*.gradle' --include='*.kts' --include='pom.xml' \
  --include='*.toml' --include='*.properties' 'gatling|picatinny' . 2>/dev/null
```

Empty? Try `buildSrc/` and a Maven parent POM before concluding there is no project.

**Read the artifact, not the number.**

- `gatling-charts-highcharts`, `gatling-test-framework`, `gatling-app`, `${gatling.version}` — **the Gatling line.**
- `gatling-maven-plugin` and `gatling-sbt`, both 4.x — build-plugin numbering, saying nothing about the line.
- `io.gatling.gradle` — its leading three numbers **are** the Gatling version. A Gradle project often names nothing else; treat that as the line and say so.
- Any `org.galaxio` artifact — says nothing. Each declares `gatling-core` at `provided` scope, so the project's own pin wins.

## Then Read One File

| Question                                                                                  | Read                                                               |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Gatling, Scala, Java, or a build plugin                                                   | [references/gatling-lines.md](references/gatling-lines.md)         |
| `gatling-picatinny`, `gatling-jdbc-plugin`, `gatling-kafka-plugin`, `gatling-amqp-plugin` | [references/galaxio-artifacts.md](references/galaxio-artifacts.md) |
| What is published right now                                                               | [references/version-lookup.md](references/version-lookup.md)       |

A project with no `org.galaxio` in its build never needs the second one.

A newer release **on the line the project is already on** is a version choice. One that moves the line is an upgrade: put it to the user and follow the migration procedure rather than editing the number.
