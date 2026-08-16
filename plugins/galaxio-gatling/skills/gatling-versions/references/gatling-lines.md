# Gatling Lines And Build Plugins

**range** — closed. **`+`** — floor fixed, top looked up, [version-lookup.md](version-lookup.md). No number — match the repository.

| Artifact               | 3.9.x             | 3.11.x                                           | 3.13.x                                           | 3.14.x, 3.15.x                                               |
| ---------------------- | ----------------- | ------------------------------------------------ | ------------------------------------------------ | ------------------------------------------------------------ |
| Gatling itself         | any `3.9.x`       | any `3.11.x`                                     | any `3.13.x`                                     | any `3.14.x` or `3.15.x`                                     |
| Scala                  | `2.13.x`          | `2.13.x`                                         | `2.13.x`                                         | `2.13.x`                                                     |
| Java, floor            | 8 Scala / 17 else | 17+                                              | 17+                                              | 17+                                                          |
| `gatling-maven-plugin` | follow the repo   | `4.8.0`+                                         | `4.10.2`+                                        | above the 3.13 floor, look it up                             |
| `gatling-gradle`       | `3.9.x`           | `3.11.1`–`3.11.x`, or `3.14.3.1`+ under Gradle 9 | `3.13.1`–`3.13.x`, or `3.14.3.1`+ under Gradle 9 | `3.14.3.1`–`3.15.x` under Gradle 9, else `3.14.0.2`–`3.15.x` |
| `gatling-sbt`          | follow the repo   | 4.x                                              | `4.10.2`+                                        | above the 3.13 floor, look it up                             |

- **Gatling itself** = `gatling-charts-highcharts` + `gatling-test-framework` + `gatling-app`, one patch for all three. `gatling-jms` ships with them.
- Any `2.13.x` works — 2.13 is binary-compatible across patches.
- **3.10.x and 3.12.x have no column.** Read the POM; do not interpolate from either side.
- No `gatling-gradle` `3.11.0` exists, nor the upstream guide's `3.14.01`.
- **The Java 8 cell is Scala-only.** A Java or Kotlin project needs 17 on every line, 3.9.x included.
- **sbt 1.x is a ceiling, not a floor.** `gatling-sbt` is published only as `gatling-sbt_2.12_1.0`; on sbt 2 it resolves `gatling-sbt_2.13_2.0`, which does not exist. Pin sbt 1.x in `project/build.properties`.

## Where The Gatling Version Comes From

| Tool       | Gatling version                                                             |
| ---------- | --------------------------------------------------------------------------- |
| Maven, sbt | the project's own pin; the plugin number says nothing                       |
| Gradle     | `gatling { gatlingVersion = '…' }`, else the plugin's leading three numbers |

It wins even across lines — plugin `3.13.1` + `gatlingVersion = '3.15.1'` resolves `3.15.1`. `gatling { scalaVersion }` pins the Scala patch. A trailing fourth number on the plugin is plugin-only and leaves Gatling where it was.

## Floors

| Floor                                          | On               | Below it                                                                                                                                                           |
| ---------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| the 3.13 plugin entry above                    | all three        | `IllegalAccessException: module java.base does not open java.lang` — 3.13 needs `--add-opens=java.base/java.lang=ALL-UNNAMED`, and the plugin passes it from there |
| Maven `3.6.3` for `gatling-maven-plugin 4.8.0` | the Maven binary | resolution fails                                                                                                                                                   |
| `gatling-gradle 3.14.3.1` under Gradle 9       | the plugin       | `Could not get unknown property 'reportsDir'` when `gatlingRun` is realized — all of 3.11, all of 3.13, 3.14 to `3.14.3`. `gatlingClasses` still compiles          |
| `gatling-gradle 3.11.1` for `--simulation`     | the plugin       | 3.9.x `gatlingRun` takes no options; plain `gatlingRun` runs every simulation                                                                                      |

Raise the plugin and pin `gatlingVersion` to stay on the line. Only when the plugin cannot move, run Gatling by hand — `gatling-build` has the command for the project's build tool.
