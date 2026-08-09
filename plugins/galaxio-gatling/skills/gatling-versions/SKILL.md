---
name: gatling-versions
description: 'Use when choosing or checking a version coordinate for a Gatling JVM performance project: which Gatling line a project is on, which release of gatling-maven-plugin, gatling-gradle or gatling-sbt goes with it, which gatling-picatinny, gatling-jdbc-plugin, gatling-kafka-plugin or gatling-amqp-plugin release targets that line, the Java and Scala floors, and what is published right now.'
---

# Gatling Versions

## Establish The Line First

```bash
grep -rnE --include='*.sbt' --include='*.gradle' --include='*.kts' --include='pom.xml' \
  --include='*.toml' --include='*.properties' 'gatling|picatinny' . 2>/dev/null
```

Authored build inputs only — a recursive walk of `project/` picks up sbt's stale resolution-cache report. Empty? Try `buildSrc/` and a Maven parent POM.

**Read the artifact, not the number.**

| Found                                                                                      | Means                                      |
| ------------------------------------------------------------------------------------------ | ------------------------------------------ |
| `gatling-charts-highcharts`, `gatling-test-framework`, `gatling-app`, `${gatling.version}` | the line                                   |
| `gatling { gatlingVersion = '…' }`                                                         | the line, and it wins on Gradle            |
| `io.gatling.gradle`                                                                        | the line only if no `gatlingVersion` block |
| `gatling-maven-plugin`, `gatling-sbt`, both 4.x                                            | nothing — independent numbering            |
| any `org.galaxio` artifact                                                                 | nothing — `gatling-core` is `provided`     |

## Then Read One File

| Question                                                                                  | Read                                                               |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Gatling, Scala, Java, or a build plugin                                                   | [references/gatling-lines.md](references/gatling-lines.md)         |
| `gatling-picatinny`, `gatling-jdbc-plugin`, `gatling-kafka-plugin`, `gatling-amqp-plugin` | [references/galaxio-artifacts.md](references/galaxio-artifacts.md) |
| What is published right now                                                               | [references/version-lookup.md](references/version-lookup.md)       |

A project with no `org.galaxio` never needs the second.

A newer release **on the project's own line** is a version choice. One that moves the line is an upgrade: put it to the user and follow the migration procedure.
