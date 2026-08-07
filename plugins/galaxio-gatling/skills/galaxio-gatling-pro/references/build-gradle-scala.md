# Gradle + Scala

## Roots And Commands

| Concern            | Path or command                            |
| ------------------ | ------------------------------------------ |
| Simulations        | `src/gatling/scala`                        |
| Resources          | `src/gatling/resources`                    |
| Compile            | `./gradlew gatlingClasses`                 |
| Run one simulation | `./gradlew gatlingRun --simulation <fqcn>` |

`io.gatling.gradle` creates a `gatling` source set and simulations go there, not in `src/test/*`. `testClasses` compiles `src/test/*`, which is empty here, and reports BUILD SUCCESSFUL having built nothing.

## What To Add

`plugins`: `id 'scala'` and `id 'io.gatling.gradle'`.

**`id 'scala'` is not optional.** `gatling-gradle` stopped applying the Scala plugin itself at `3.11.1`, so a Scala project that omits it compiles nothing.

`repositories`: `mavenCentral()`.

Give the Scala compiler a larger stack — `tasks.withType(ScalaCompile)` with `scalaCompileOptions.forkOptions.jvmArgs = ['-Xss100m']`. Deeply chained DSL builders overflow the default.

`dependencies`:

| Configuration           | Use for                                                |
| ----------------------- | ------------------------------------------------------ |
| `gatling`               | Picatinny and anything the simulations compile against |
| `gatlingImplementation` | protocol plugins                                       |
| `gatlingRuntimeOnly`    | JDBC drivers and other runtime-only artifacts          |

Those three are what reach the `gatlingRun` classpath. A dependency on plain `implementation` is missing at run time — which is how a JDBC driver goes absent; see [protocol-jdbc.md](protocol-jdbc.md).

Every Galaxio artifact needs the explicit `_2.13` even in a Scala project; Gradle cannot append it.

A Gradle project usually keeps the version literal in `gradle/libs.versions.toml`, `gradle.properties` or `settings.gradle[.kts]`. Bump it there; a second literal in `build.gradle` is the one that goes stale.

## Plugin Floor, The JVM Option, And Gradle 9

Raise `gatling-gradle` past the floor in [gatling-lines.md](../../gatling-versions/references/gatling-lines.md) and it sets the JVM option 3.13 requires, `--add-opens=java.base/java.lang=ALL-UNNAMED`, on its own; only when pinned lower, set `jvmArgs` in the `gatling` block to a list containing that flag.

Check the Gradle version before promising `gatlingRun`. On Gradle 9 `io.gatling.gradle` fails to register the task below `3.14.3.1` — the whole 3.11 and 3.13 lines, latest patches included — with `Could not get unknown property 'reportsDir'`. Everything works on 8.10.2.

`gatlingClasses` still compiles there, because the plugin only breaks when the run task is realized. Running the simulation by hand then means supplying the three things the plugin used to:

```bash
gradle -q gatlingCp        # a task printing configurations.gatlingRuntimeClasspath.asPath
java --add-opens=java.base/java.lang=ALL-UNNAMED \
  -cp "build/classes/scala/gatling:src/gatling/resources:<that classpath>" \
  io.gatling.app.Gatling -s <fqcn> -rf build/reports/gatling
```

Drop `-rf` and the run dies on `Can't use the file DataWriter without setting the results directory`. Drop the flag and it dies on `IllegalAccessException` — nothing passes it for you here. And `gatlingRuntimeClasspath` carries neither the compiled simulation nor the resources, so both source roots go on the front.

On the 3.11 line the flag is unnecessary and the floor is `3.11.1`.
