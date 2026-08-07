# Gatling Lines And Coordinates

Read the column for the project's line. A **range** is closed, both ends fixed. **`+`** is open: floor fixed, top looked up, [version-lookup.md](version-lookup.md). A **bare version** is the only release on that line. **none** means no release targets that line — not that the number is unknown. A cell naming no number sets no floor: match what the repository declares, or look it up.

| Artifact               | 3.9.x             | 3.11.x            | 3.13.x            | 3.14.x, 3.15.x                   |
| ---------------------- | ----------------- | ----------------- | ----------------- | -------------------------------- |
| Gatling itself         | any `3.9.x`       | any `3.11.x`      | any `3.13.x`      | any `3.14.x` or `3.15.x`         |
| Scala                  | `2.13.x`          | `2.13.x`          | `2.13.x`          | `2.13.x`                         |
| Java, floor            | 8 Scala / 17 else | 17+               | 17+               | 17+                              |
| `gatling-picatinny`    | `0.14.0`–`0.14.1` | `0.16.0`–`1.10.4` | `1.12.0`+         | **none**                         |
| `gatling-jdbc-plugin`  | `0.10.3`          | `0.12.0`–`0.17.2` | `0.19.0`+         | **none**                         |
| `gatling-kafka-plugin` | `0.12.0`          | `0.14.0`–`0.20.5` | `0.22.0`+         | **none**                         |
| `gatling-amqp-plugin`  | `0.10.3`          | `0.12.0`–`1.0.4`  | `1.2.0`+          | **none**                         |
| `gatling-maven-plugin` | follow the repo   | `4.8.0`+          | `4.11.0`+         | above the 3.13 floor, look it up |
| `gatling-gradle`       | `3.9.x`           | `3.11.1`–`3.11.x` | `3.13.1`–`3.13.x` | `3.14.0.2`–`3.14.x`, or `3.15.x` |
| `gatling-sbt`          | follow the repo   | 4.x               | `4.10.2`+         | above the 3.13 floor, look it up |

- **Gatling itself** is `gatling-charts-highcharts`, `gatling-test-framework` and `gatling-app`, released together — one patch serves all three.
- Test-scoped, `_2.13` suffix on every Galaxio artifact outside sbt, any `2.13.x` patch. Nothing outside this table is a hard pin.
- **3.10.x and 3.12.x have no column.** Say so and read the artifact's POM — [version-lookup.md](version-lookup.md). Do not interpolate from the columns either side: each line holds a single release of some libraries and none of others, and `gatling-picatinny` has no 3.12 release at all.
- **Java 8 on 3.9.x is a Scala-only floor.** `gatling-core` and the Galaxio libraries' Scala classes are class-file major 52 there, but the `org.galaxio.gatling.javaapi` facade every Java and Kotlin project goes through is major 61 in the same jars — measured in Picatinny `0.14.1` and `gatling-jdbc-plugin 0.10.3`. Java 8 runs a Scala 3.9.x project and nothing else; Java and Kotlin need 17 on every line.
- **`gatling-gradle` is bounded on every line, never open.** Its leading major.minor _is_ the Gatling line, so "or later" moves the project off the line. Maven and sbt number independently, so `+` is safe there.
- `gatling-maven-plugin 4.8.0` needs **Maven 3.6.3 or newer** — a floor on the Maven binary, not on the plugin.
- **Version order does not tell you the line.** `gatling-jdbc-plugin 0.17.1` is a 3.11 release and `0.17.1-latest` is not; `0.13.0` is a mis-publish on 3.13.1 sitting between two 3.11 releases; there is no `gatling-gradle` `3.11.0`, and the upstream guide's `3.14.01` does not exist. Read the POM.
- **3.14.x and 3.15.x have no Galaxio release** — confirm with [version-lookup.md](version-lookup.md) before relying on it. A project keeping any of the four **stays on 3.13.x**: raising Gatling alone resolves and then fails at run time on missing classes, green build and all. Without those libraries the lines are an ordinary target, Picatinny replaced by [picatinny-substitutes.md](picatinny-substitutes.md).

Line-to-line changes and the upgrade procedure: [migrate.md](migrate.md). Picatinny's own API: [picatinny-0-x.md](picatinny-0-x.md), [picatinny-1-x.md](picatinny-1-x.md).
