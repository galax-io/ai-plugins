---
name: gatling-migration
description: 'Use when upgrading a Gatling JVM performance project from one Gatling line to another, anywhere between 3.9.x and 3.15.x: establishing the line a project is on, choosing a target, applying the renames and removals each line brought, raising the build plugin, and running one smoke simulation to prove the move.'
---

# Gatling Migration

## 1. Establish The Line

```bash
grep -rnE --include='*.sbt' --include='*.gradle' --include='*.kts' --include='pom.xml' \
  --include='*.toml' --include='*.properties' 'gatling|org\.galaxio' . 2>/dev/null
```

Authored inputs only — a walk of `project/` picks up sbt's stale resolution cache.

| Found                                                                                      | Means                                                                                                                               |
| ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| `gatling-charts-highcharts`, `gatling-test-framework`, `gatling-app`, `${gatling.version}` | the line                                                                                                                            |
| `gatling { gatlingVersion = '…' }`                                                         | the line, and it wins on Gradle                                                                                                     |
| `io.gatling.gradle`                                                                        | the line only if no `gatlingVersion` block                                                                                          |
| `gatling-maven-plugin`, `gatling-sbt`                                                      | nothing — independent numbering                                                                                                     |
| `org.galaxio:*`                                                                            | nothing — `gatling-core` is `provided`. Go to [references/galaxio-upgrade.md](references/galaxio-upgrade.md) before naming a target |

## 2. Choose The Target

**Default 3.13.x**, not a ceiling. Gradle 9 overrides it: `gatlingRun` throws below `gatling-gradle 3.14.3.1`. That floor is on the plugin, so raise the plugin and hold the line with `gatlingVersion`.

## 3. What Each Line Changed

| Line | Change                                    | Effect                                                                          |
| ---- | ----------------------------------------- | ------------------------------------------------------------------------------- |
| 3.11 | `${}` removed                             | `#{}` only; 3.9.x and 3.10.x compile both                                       |
| 3.11 | `heavisideUsers` removed                  | → `stressPeakUsers`                                                             |
| 3.11 | `WhiteList` / `BlackList` removed         | → `AllowList` / `DenyList`                                                      |
| 3.12 | Akka dropped                              | Remove the dependency; nothing replaces it                                      |
| 3.12 | Graphite writer dropped                   | **Silently.** An unknown writer is accepted, the run stays green, no data ships |
| 3.12 | `stopInjector` / `stopInjectorIf` renamed | → `stopLoadGenerator` / `stopLoadGeneratorIf`. **No overlap**                   |
| 3.13 | Report needs `--add-opens`                | `--add-opens=java.base/java.lang=ALL-UNNAMED`, passed by the plugin from step 5 |
| 3.13 | PROXY emulation added                     | `proxyProtocolSourceIpV4Address`, `proxyProtocolSourceIpV6Address`              |
| 3.13 | `jmsProperty` check added                 | Asserts on a property of an inbound JMS message                                 |
| 3.14 | `javax.jms` → `jakarta.jms`               | Import rewrite plus a Jakarta broker client. **No overlap**                     |
| 3.15 | Feeder modes `eager`, `batch` removed     | Delete any explicit loading mode on a file-based feeder                         |
| 3.15 | `httpConcurrentRequests` added            | Concurrent requests with no parent request                                      |
| 3.15 | `logActualValueInError` added             | Drops the actual value from a failing check message                             |

Rows apply from their line upwards and nothing stops: 3.11.x → 3.13.x applies all three 3.12 rows.

**No overlap** — no version compiles both spellings, so that edit ships in the same commit as the version bump.

## 4. Floors For The Target

| Target         | `gatling-maven-plugin`   | `gatling-sbt`            | `gatling-gradle`                              |
| -------------- | ------------------------ | ------------------------ | --------------------------------------------- |
| 3.11.x         | none                     | none                     | `3.11.1`–`3.11.x`, or `3.14.3.1`+ on Gradle 9 |
| 3.13.x         | `4.10.2`+                | `4.10.2`+                | `3.13.1`–`3.13.x`, or `3.14.3.1`+ on Gradle 9 |
| 3.14.x, 3.15.x | `4.10.2`+, top looked up | `4.10.2`+, top looked up | `3.14.3.1`–`3.15.x`                           |

- **Java 17 on every target**, whatever the project ran before. Java 8 serves Scala on 3.9.x and nothing above it, so a 3.9 crossing raises the JDK or dies on `UnsupportedClassVersionError` after every step reads as done.
- **3.10.x and 3.12.x have no row.** Read the POM; do not interpolate from the rows either side.
- Below the 3.13 entry the plugin stops passing `--add-opens=java.base/java.lang=ALL-UNNAMED` and the run dies on `IllegalAccessException: module java.base does not open java.lang`. On 3.11 that flag is unnecessary, which is why the row has no floor — `gatling-maven-plugin 3.9.0` and `gatling-sbt 3.2.2` each run a 3.11.5 project. The bottom is lower and elsewhere: `gatling-maven-plugin 3.1.2` and below try to compile the simulations themselves and die on `ClassNotFoundException: io.gatling.compiler.ZincCompiler`, which Maven reports as `Simulations compilation failed`.
- Below `gatling-gradle 3.14.3.1` on **Gradle 9** the symptom is different — `Could not get unknown property 'reportsDir'` when `gatlingRun` is realized, while `gatlingClasses` still compiles. That floor is on the plugin, not on Gatling.
- `gatling-maven-plugin` sets no Maven-binary floor — `4.21.10`, which asks for `3.9.16` in its descriptor, runs on Maven `3.3.9`. Another plugin can: `maven-compiler-plugin 3.15.0` declares `<prerequisites>` and Maven refuses it below `3.6.3`.
- sbt 1.x only — `gatling-sbt` is published as `gatling-sbt_2.12_1.0` and nothing else.
- `--simulation` arrives with the 3.11 plugin; 3.9.x `gatlingRun` takes no options.

Top of an open range:

```bash
curl -s https://repo1.maven.org/maven2/io/gatling/gatling-maven-plugin/maven-metadata.xml
curl -s https://repo1.maven.org/maven2/io/gatling/gatling-sbt_2.12_1.0/maven-metadata.xml
curl -s https://plugins.gradle.org/m2/io/gatling/gradle/io.gatling.gradle.gradle.plugin/maven-metadata.xml
```

## 5. Procedure

1. Raise Gatling — the project's pin on Maven and sbt, `gatling { gatlingVersion = '…' }` on Gradle. Add the block rather than leaning on the plugin default.
2. Raise the build plugin to the **target** row above, not a higher one. A row reading `none` needs no move.
3. `org.galaxio` libraries, if any — [references/galaxio-upgrade.md](references/galaxio-upgrade.md). Never raised silently.
4. Apply every row above the old line and at or below the new one.
5. Compile, then run one smoke simulation. A dependency left on the wrong line still resolves and still compiles; only the run finds it.

Stop at the agreed line, not the newest published.
