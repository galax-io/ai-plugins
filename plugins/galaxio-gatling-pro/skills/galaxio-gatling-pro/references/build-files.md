# Build Files

## `.scalafmt.conf`

```hocon
runner.dialect = "scala213"
version = 3.10.6
binPack.parentConstructors = true
maxColumn = 128
includeCurlyBraceInSelectChains = false
align.preset = most
trailingCommas = always
```

## sbt

Typical `build.sbt` shape:

```scala
enablePlugins(GatlingPlugin)

ThisBuild / scalaVersion := "2.13.18"

libraryDependencies ++= Seq(
  "io.gatling.highcharts" % "gatling-charts-highcharts" % "3.11.5" % Test,
  "io.gatling"            % "gatling-test-framework"    % "3.11.5" % Test,
  "org.galaxio"          %% "gatling-picatinny"         % "<version>",
)
```

Add protocol plugins only when used:

```scala
libraryDependencies += "io.gatling"    % "gatling-jms"           % "3.11.5" % Test
libraryDependencies += "org.galaxio" %% "gatling-jdbc-plugin"  % "<version>" % Test
libraryDependencies += "org.galaxio" %% "gatling-kafka-plugin" % "<version>" % Test
libraryDependencies += "org.galaxio" %% "gatling-amqp-plugin"  % "<version>" % Test
```

sbt plugin:

```scala
// project/plugins.sbt
addSbtPlugin("io.gatling" % "gatling-sbt" % "<gatling-sbt-plugin-version>")
```

## Maven

Java shape:

```xml
<dependencies>
  <dependency>
    <groupId>io.gatling.highcharts</groupId>
    <artifactId>gatling-charts-highcharts</artifactId>
    <version>${gatling.version}</version>
    <scope>test</scope>
  </dependency>
</dependencies>

<build>
  <plugins>
    <plugin>
      <groupId>io.gatling</groupId>
      <artifactId>gatling-maven-plugin</artifactId>
      <version>${gatling-maven-plugin.version}</version>
    </plugin>
  </plugins>
</build>
```

Scala additions:

```xml
<testSourceDirectory>src/test/scala</testSourceDirectory>
<plugin>
  <groupId>net.alchim31.maven</groupId>
  <artifactId>scala-maven-plugin</artifactId>
  <version>${scala-maven-plugin.version}</version>
  <executions>
    <execution>
      <goals>
        <goal>testCompile</goal>
      </goals>
    </execution>
  </executions>
</plugin>
```

Kotlin additions:

```xml
<testSourceDirectory>${project.basedir}/src/test/kotlin</testSourceDirectory>
<dependency>
  <groupId>org.jetbrains.kotlin</groupId>
  <artifactId>kotlin-stdlib</artifactId>
  <version>${kotlin.version}</version>
</dependency>
<plugin>
  <groupId>org.jetbrains.kotlin</groupId>
  <artifactId>kotlin-maven-plugin</artifactId>
  <version>${kotlin.version}</version>
</plugin>
```

## Gradle

Scala shape:

```groovy
plugins {
  id 'scala'
  id 'io.gatling.gradle' version '<gatling-gradle-plugin-version>'
}

repositories {
  mavenCentral()
}

tasks.withType(ScalaCompile) {
  scalaCompileOptions.forkOptions.jvmArgs = ['-Xss100m']
}
```

Java shape:

```groovy
plugins {
  id 'java'
  id 'io.gatling.gradle' version '<gatling-gradle-plugin-version>'
}

repositories {
  mavenCentral()
}
```

Kotlin shape:

```kotlin
plugins {
    kotlin("jvm") version "<kotlin-version>"
    kotlin("plugin.allopen") version "<kotlin-version>"
    id("io.gatling.gradle") version "<gatling-gradle-plugin-version>"
}

repositories {
    mavenCentral()
}
```

For Gradle-only dependencies used by simulations, add them to `gatling`,
`gatlingImplementation`, or `gatlingRuntimeOnly`, not only to `implementation`.
