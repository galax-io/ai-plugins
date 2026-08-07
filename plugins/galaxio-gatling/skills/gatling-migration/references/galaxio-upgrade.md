# When The Build Carries Galaxio Libraries

Reached only when this finds something:

```bash
grep -rnE --include='*.sbt' --include='*.gradle' --include='*.kts' --include='pom.xml' \
  --include='*.toml' --include='*.properties' 'org\.galaxio' . 2>/dev/null
```

`gatling-picatinny`, `gatling-jdbc-plugin`, `gatling-kafka-plugin` and `gatling-amqp-plugin` version independently and do not cross a line together, so each is checked on its own.

**Whether a release exists for the target line is looked up, not remembered** — [galaxio-artifacts.md](../../gatling-versions/references/galaxio-artifacts.md) has the table and the query. A stored "no" expires the day the release lands.

## Three Outcomes

**1 — Releases exist for the target line.** Name the version for each artifact and propose them with the Gatling bump. Raise nothing before the user confirms. A `0.x` Picatinny pin also changes API, which is a separate review.

**2 — No releases for the target line.** Raising Gatling alone leaves the Galaxio pin resolving cleanly — every artifact declares `gatling-core` at `provided` scope — and the simulation still **compiles**. It dies at run time, and only on the APIs binding Gatling internals: Picatinny `0.18.2` on Gatling `3.13.5` feeds fine and throws `NoSuchMethodError` on `CoreComponents.actorSystem()` at the first transaction.

Say **"Galaxio was left alone, and the project will fail at run time — possibly not on the first simulation"**, not "Galaxio was left alone". Then hand the decision back: stop at the last supported line, or go on knowingly and drop the libraries.

**3 — Gradle 9 and Galaxio together.** No line works: 3.13 is where the libraries stop, and `gatlingRun` will not register below `gatling-gradle 3.14.3.1` — [gatling-lines.md](../../gatling-versions/references/gatling-lines.md). Say both directions are closed, then offer the three options — Gradle 8 with 3.13, drop the libraries and take 3.14.3.1+, or stay on 3.13 and drive Gatling by hand as the build reference spells out.

## After The Bump

Each artifact moves at its own release, so step 3 is per artifact. Outside sbt each carries the explicit `_2.13`; sbt appends it with `%%`.

The smoke run is what proves this branch — everything above survives compilation.
