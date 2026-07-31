# Looking A Version Up

Quote the output with the date you ran it.

## What Is Published

Every artifact answers at the same shape — `repo1.maven.org/maven2/<group path>/<artifact>/maven-metadata.xml`,
the group's dots written as slashes:

```bash
curl -s https://repo1.maven.org/maven2/org/galaxio/gatling-picatinny_2.13/maven-metadata.xml
curl -s https://repo1.maven.org/maven2/io/gatling/highcharts/gatling-charts-highcharts/maven-metadata.xml
curl -s https://repo1.maven.org/maven2/io/gatling/gatling-sbt_2.12_1.0/maven-metadata.xml
```

Swap in `gatling-jdbc-plugin_2.13`, `gatling-kafka-plugin_2.13` or `gatling-amqp-plugin_2.13`.
Gatling's own artifacts sit under `io/gatling` — `gatling-core`, `gatling-test-framework`,
`gatling-app`, and `io/gatling/highcharts/gatling-charts-highcharts`. `io/gatling/gatling-maven-plugin`
is plain, but the sbt plugin is cross-built and lives at `io/gatling/gatling-sbt_2.12_1.0`.
`io.gatling.gradle` is a plugin marker rather than a library, so it sits on the Gradle plugin
portal at
`https://plugins.gradle.org/m2/io/gatling/gradle/io.gatling.gradle.gradle.plugin/maven-metadata.xml`.

## Which Line A Version Targets

Every Galaxio artifact declares `gatling-core` at `provided` scope, so its own POM is the answer:

```bash
curl -s https://repo1.maven.org/maven2/org/galaxio/gatling-picatinny_2.13/1.12.0/gatling-picatinny_2.13-1.12.0.pom \
  | grep -A2 gatling-core
```

Run it whenever a pin looks out of sequence: version order alone does not tell you the line.

Take the newest release **whose POM names the line the project is on**, never the newest release
outright. Crossing a line is a decision to put to the user, not a side effect of picking a version.

## Writing The Coordinate

Shape rules:

- The number goes into the build file for your language and build tool — the build reference
  dispatch sent you to names it, and says where a version catalog keeps it instead.
- Test-scoped, and outside sbt every Galaxio artifact needs the explicit `_2.13` suffix.
- The Scala patch is free: 2.13 is binary-compatible across patches, so any `2.13.x` works.
