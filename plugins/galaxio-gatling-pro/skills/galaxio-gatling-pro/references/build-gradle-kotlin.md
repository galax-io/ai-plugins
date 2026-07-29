# Gradle + Kotlin

What to add to an existing `build.gradle.kts`. For a whole project see
[starter-tree.md](starter-tree.md); the numbers are in [version-3-13.md](version-3-13.md) or
[version-3-11.md](version-3-11.md).

## Roots And Commands

| Concern            | Path or command                            |
| ------------------ | ------------------------------------------ |
| Simulations        | `src/gatling/kotlin`                       |
| Resources          | `src/gatling/resources`                    |
| Compile            | `./gradlew gatlingClasses`                 |
| Run one simulation | `./gradlew gatlingRun --simulation <fqcn>` |

`io.gatling.gradle` creates a `gatling` source set and simulations go there, not in
`src/test/*`. Compile with `gatlingClasses`, that source set's lifecycle task — `testClasses`
compiles `src/test/*`, which is empty here, and reports BUILD SUCCESSFUL having built nothing.

## What To Add

`plugins`:

| Plugin                    | Version              | Notes                 |
| ------------------------- | -------------------- | --------------------- |
| `kotlin("jvm")`           | the repository's own | not pinned by Galaxio |
| `id("io.gatling.gradle")` | see the version file | pulls Gatling itself  |

No `kotlin("plugin.allopen")`. Gatling instantiates a simulation reflectively through its
no-argument constructor rather than extending it, so a final Kotlin class works; the Galaxio
`kotlin-gradle` template declares only these two.

Add `kotlin { jvmToolchain(17) }`. Without it Kotlin compiles against whatever JDK the Gradle
daemon happens to run, and a class file newer than the JDK that runs the simulation fails with
`UnsupportedClassVersionError` — a mismatch that never appears at compile time.

`repositories`: `mavenCentral()`.

`dependencies` — the configuration matters more than the coordinate:

| Configuration           | Use for                                                |
| ----------------------- | ------------------------------------------------------ |
| `gatling`               | Picatinny and anything the simulations compile against |
| `gatlingImplementation` | protocol plugins                                       |
| `gatlingRuntimeOnly`    | JDBC drivers and other runtime-only artifacts          |

Those three are what reach the `gatlingRun` classpath. A dependency on plain `implementation`
is missing at run time — which is how a JDBC driver goes absent; see
[protocol-jdbc.md](protocol-jdbc.md).

Every Galaxio artifact needs the explicit `_2.13`; Gradle cannot append it. In `.kts` the
dependency block takes parentheses — `gatling("coords")` — because a Groovy-style string call
is a syntax error there.

## Plugin Floor, The JVM Option, And Gradle 9

From Gatling 3.13 the run needs `--add-opens=java.base/java.lang=ALL-UNNAMED`. `gatling-gradle`
**3.13.1** and later set it themselves; only when pinned lower, set `jvmArgs` in the `gatling`
block to a list containing that flag.

Check the Gradle version before promising `gatlingRun`. `io.gatling.gradle` `3.13.1` fails to
register the task on Gradle 9 (`Could not get unknown property 'reportsDir'`) and works on
8.10.2 — the failure lands during configuration, so it reads as a plugin bug rather than a
version mismatch. Repositories without a wrapper have no `./gradlew`; use the `gradle` on PATH
and say which version you used.

When the task will not register, `gatlingClasses` still compiles and the simulation can be run
off the `gatlingRuntimeClasspath` with `io.gatling.app.Gatling -s <fqcn>`, rather than shipping
a test that was never executed.

On the 3.11 line the flag is unnecessary and the floor is `3.11.1`.
