---
name: gatling-build
description: 'Use when a Gatling performance project needs its build file written or changed while staying on its current Gatling line: adding a dependency, setting source and resource roots, wiring the compile and run commands, or scaffolding build.sbt, pom.xml or build.gradle. Covers sbt with Scala, and Maven or Gradle with Scala, Java or Kotlin. Crossing to another Gatling line is gatling-migration.'
---

# Gatling Build Files

## Detect The Cell

Build tool, language and Gatling line. Run these from the directory holding the build file; a
non-zero exit means nothing, read the output.

```bash
ls -d build.sbt project pom.xml build.gradle build.gradle.kts settings.gradle settings.gradle.kts 2>/dev/null
ls -d src/test/scala src/test/java src/test/kotlin src/gatling/scala src/gatling/java src/gatling/kotlin 2>/dev/null
find src -name '*Simulation.*' -o -name '*Performance.*' -o -name 'Debug.*' -o -name 'Stability.*' 2>/dev/null
grep -rnE --include='*.sbt' --include='*.gradle' --include='*.kts' --include='pom.xml' \
  --include='*.toml' --include='*.properties' 'gatling|picatinny' . 2>/dev/null
```

A simulation file wins any language ambiguity: a repository with sources in two languages is on the
language its simulations are written in, not the one with more files. Two build files means a
multi-module tree — check `buildSrc/` and a Maven parent POM, and edit the module that holds the
simulations, not the root.

The Gatling line comes out of the last command and decides what every cell file below tells you —
read it off the repository, never off this skill. Silence everywhere is greenfield: sbt, Scala
`2.13`, Java 17, Gatling `3.13.x`.

**sbt serves Scala only.** An sbt project wanting Java or Kotlin simulations has no supported cell;
say so and offer Maven or Gradle rather than improvising one.

## Read One

| Language | `build.sbt`                                         | `pom.xml`                                                 | `build.gradle[.kts]`                                        |
| -------- | --------------------------------------------------- | --------------------------------------------------------- | ----------------------------------------------------------- |
| Scala    | [build-sbt-scala.md](references/build-sbt-scala.md) | [build-maven-scala.md](references/build-maven-scala.md)   | [build-gradle-scala.md](references/build-gradle-scala.md)   |
| Java     | not supported — sbt serves Scala only               | [build-maven-java.md](references/build-maven-java.md)     | [build-gradle-java.md](references/build-gradle-java.md)     |
| Kotlin   | not supported                                       | [build-maven-kotlin.md](references/build-maven-kotlin.md) | [build-gradle-kotlin.md](references/build-gradle-kotlin.md) |

**Never read a second one.** They contradict on purpose — the same task has different answers per
cell, and a fact carried over from the wrong file is wrong silently.

**Maven + Scala has no template behind it.** `galax-io/templates-gatling` ships six and
`scala-maven` is not among them, so nothing in that cell has been rendered and run end to end. Its
layout is the unverified part; its `scala-maven-plugin` requirement is not — no `gatling-maven-plugin`
release declares a `compile` goal, so without that plugin the simulations are never built.

## Source And Resource Roots

They come from the build tool, not from preference:

| Build tool | Simulations              | Resources               |
| ---------- | ------------------------ | ----------------------- |
| sbt        | `src/test/scala`         | `src/test/resources`    |
| Maven      | `src/test/<language>`    | `src/test/resources`    |
| Gradle     | `src/gatling/<language>` | `src/gatling/resources` |

Outside Java, the Maven row is configuration rather than a default: `src/test/kotlin` and
`src/test/scala` reach the compiler only because the cell file wires them, so scaffolding a
simulation there without that wiring compiles nothing and `gatling:test` reports no simulation
class. Under Maven, `src/gatling/*` is a root nothing compiles.

Under Gradle the Gatling source set is `src/gatling/*`, and `src/test/*` is a separate one that
Gatling's own dependencies never reach — a simulation placed there fails to compile on
`io.gatling` imports rather than being skipped. The plugin does put compiled `src/test` output on
the Gatling runtime classpath (`includeTestOutput` defaults to true), so an existing `src/test`
tree may be feeding `gatlingRun` on purpose: add beside it, do not move it.

## Versions

Every number is owned by `gatling-versions`:
[gatling-lines.md](../gatling-versions/references/gatling-lines.md) for Gatling, Scala, Java and
the three build plugins, [galaxio-artifacts.md](../gatling-versions/references/galaxio-artifacts.md)
for the Galaxio libraries. Take a literal from the repository or from those files, never from here.
