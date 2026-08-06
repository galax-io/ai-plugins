# When The Build Carries Galaxio Libraries

Reached only when this finds something:

```bash
grep -rnE --include='*.sbt' --include='*.gradle' --include='*.kts' --include='pom.xml' \
  --include='*.toml' --include='*.properties' 'org\.galaxio' . 2>/dev/null
```

Four artifacts qualify: `gatling-picatinny`, `gatling-jdbc-plugin`, `gatling-kafka-plugin`, `gatling-amqp-plugin`. They version independently and do not cross a line together, so each is checked on its own.

**Whether a release exists for the target line is looked up, not remembered** — [galaxio-artifacts.md](../../gatling-versions/references/galaxio-artifacts.md) has the table and the query. A stored "no" expires the day the release lands.

## Three Outcomes

**1 — Releases exist for the target line.** Name the version for each artifact and propose them together with the Gatling bump. Raise nothing before the user confirms: crossing a line is proposed, never done on the way past. If the Picatinny pin was `0.x` the API changes too, and that is a separate review.

**2 — No releases for the target line.** The project cannot follow. State the consequence, not the omission: raising Gatling alone leaves the Galaxio pin resolving cleanly — every artifact declares `gatling-core` at `provided` scope — and the simulation still **compiles**. It dies at run time, and only on the APIs that bind Gatling internals, so a green build is not evidence. Measured: Picatinny `0.18.2` on Gatling `3.13.5` runs a `RandomUUIDFeeder` fine and throws `NoSuchMethodError` on `CoreComponents.actorSystem()` the moment a transaction is used.

So the sentence is not "Galaxio was left alone" but **"Galaxio was left alone, and in this state the project will fail at run time — possibly not on the first simulation."** Then hand the decision back: stop at the last line the libraries support, or go on knowingly and drop them.

**3 — Gradle 9, and the build carries Galaxio.** There is no working line. 3.13 is where the Galaxio libraries stop, and `gatling-gradle` cannot register `gatlingRun` on Gradle 9 below `3.14.3.1` — [gatling-lines.md](../../gatling-versions/references/gatling-lines.md). Say that both directions are closed before proposing anything, then offer the three real options: drop to Gradle 8 and take 3.13, drop the Galaxio libraries and take 3.14.3.1+, or stay on 3.13 under Gradle 9 and run simulations off `gatlingRuntimeClasspath` with `io.gatling.app.Gatling -s <fqcn>`.

## After The Bump

Each artifact moves at its own release, so step 3 of the procedure is per artifact, not one edit. Outside sbt every one of them carries the explicit `_2.13` suffix; sbt appends it with `%%`.

The smoke run is what proves this branch, because everything it warns about survives compilation.
