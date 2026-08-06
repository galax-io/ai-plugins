# Gatling Lines And Build Plugins

Read the column for the project's line. A **range** is closed, both ends fixed. **`+`** is open: floor fixed, top looked up, [version-lookup.md](version-lookup.md). A cell naming no number sets no floor: match what the repository declares, or look it up.

| Artifact               | 3.9.x             | 3.11.x            | 3.13.x            | 3.14.x, 3.15.x                   |
| ---------------------- | ----------------- | ----------------- | ----------------- | -------------------------------- |
| Gatling itself         | any `3.9.x`       | any `3.11.x`      | any `3.13.x`      | any `3.14.x` or `3.15.x`         |
| Scala                  | `2.13.x`          | `2.13.x`          | `2.13.x`          | `2.13.x`                         |
| Java, floor            | 8 Scala / 17 else | 17+               | 17+               | 17+                              |
| `gatling-maven-plugin` | follow the repo   | `4.8.0`+          | `4.10.2`+         | above the 3.13 floor, look it up |
| `gatling-gradle`       | `3.9.x`           | `3.11.1`–`3.11.x` | `3.13.1`–`3.13.x` | `3.14.0.2`–`3.14.x`, or `3.15.x` |
| `gatling-sbt`          | follow the repo   | 4.x               | `4.10.2`+         | above the 3.13 floor, look it up |

- **Gatling itself** is `gatling-charts-highcharts`, `gatling-test-framework` and `gatling-app`, released together — one patch serves all three. `gatling-jms` comes with them; JMS needs no extra dependency.
- The Scala patch is free: 2.13 is binary-compatible across patches, so any `2.13.x` works.
- **3.10.x and 3.12.x have no column.** Say so and read the artifact's POM — [version-lookup.md](version-lookup.md). Do not interpolate from the columns either side.

## The Build Plugin Is Not The Same Kind Of Number On Every Tool

- **Maven and sbt number independently.** The plugin version says nothing about the Gatling line, and the project pins Gatling itself. So the table entry is a **floor**: raise past it and pin whatever `3.13.x` you want. Measured — `gatling-maven-plugin 4.10.2` with Gatling `3.13.5` runs.
- **`gatling-gradle`'s leading three numbers _are_ the Gatling version.** `3.13.1` brings Gatling `3.13.1`, `3.13.5` brings `3.13.5`; a trailing fourth number is a plugin-only patch and leaves Gatling where it was. So on Gradle the entry is a **target, not a floor** — stopping at the floor pins the project to `3.13.1` with no way forward, and "or later" moves it off the line entirely.

## The `--add-opens` Floor

3.13 needs `--add-opens=java.base/java.lang=ALL-UNNAMED` to generate its report. Raise the build plugin to the 3.13 figure above and it passes the flag itself — measured on all three tools, and it is necessary as well as sufficient: one patch below, the run dies on `java.lang.IllegalAccessException: module java.base does not open java.lang to unnamed module`.

`gatling-maven-plugin 4.8.0` needs **Maven 3.6.3 or newer** — a floor on the Maven binary, not on the plugin.

## sbt 1.x Only

`gatling-sbt` is published as `gatling-sbt_2.12_1.0`, cross-built for sbt 1.0 and nothing else. No sbt 2.x artifact exists, so a project on sbt 2 cannot resolve the plugin at all. Pin sbt 1.x in `project/build.properties`.

## Gradle 9 Starts At `gatling-gradle 3.14.3.1`

Below it the plugin fails to register `gatlingRun` on Gradle 9 — `Could not get unknown property 'reportsDir' for root project`. That covers the whole 3.11 line, the whole 3.13 line including its latest patch, and 3.14 up to `3.14.3`. Measured by bisection.

So a Gradle 9 project cannot run on 3.13 through the plugin. Either take `3.14.3.1`+, or stay below and run the simulation off `gatlingRuntimeClasspath` with `io.gatling.app.Gatling -s <fqcn>` — `gatlingClasses` still compiles.

## Version Order Does Not Tell You The Line

There is no `gatling-gradle` `3.11.0`, and the upstream guide's `3.14.01` does not exist. Read the POM before trusting a number that merely looks next in sequence — [version-lookup.md](version-lookup.md).
