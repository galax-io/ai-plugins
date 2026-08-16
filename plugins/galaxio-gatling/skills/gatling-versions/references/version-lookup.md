# Looking A Version Up

Quote the output with the date you ran it.

## What Is Published

Every artifact answers at the same shape — `repo1.maven.org/maven2/<group path>/<artifact>/maven-metadata.xml`, the group's dots written as slashes:

```bash
curl -s https://repo1.maven.org/maven2/io/gatling/highcharts/gatling-charts-highcharts/maven-metadata.xml
curl -s https://repo1.maven.org/maven2/io/gatling/gatling-maven-plugin/maven-metadata.xml
curl -s https://repo1.maven.org/maven2/io/gatling/gatling-sbt_2.12_1.0/maven-metadata.xml
```

`gatling-core`, `gatling-test-framework` and `gatling-app` sit under `io/gatling` too. `io.gatling.gradle` is a plugin marker, not a library, so it sits on the Gradle plugin portal:

```bash
curl -s https://plugins.gradle.org/m2/io/gatling/gradle/io.gatling.gradle.gradle.plugin/maven-metadata.xml
```

Galaxio artifacts sit under `org/galaxio` with the `_2.13` suffix — [galaxio-artifacts.md](galaxio-artifacts.md), which also has the query for which Gatling line one of them targets.

## Writing The Coordinate

- The number goes into the build file for your language and build tool — `gatling-build` names it there, and says where a version catalog keeps it instead.
- Test-scoped, and outside sbt every Galaxio artifact needs the explicit `_2.13` suffix.
- The Scala patch is free: 2.13 is binary-compatible across patches, so any `2.13.x` works.
