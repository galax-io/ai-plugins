# Picatinny 0.x

The archived `0.14.0`–`0.18.2` line of `gatling-picatinny`, `0.18.2` being the top of it. One API
across the whole range: the class set is identical from `0.14.0` to `0.16.1`, and `0.17.0` only
adds `RandomProvider` and `RandomDataGeneratorsWrapper`. Read this file when the repository pins a `0.x` version — **not** when
it is on Gatling 3.11. Those are different questions: the `1.x` line has releases for both Gatling
lines, so a 3.11 project on a `1.x` pin uses [picatinny-1-x.md](picatinny-1-x.md), not this
file.

**This is not the 1.x API with fewer features — parts of it are different.** Reading
[picatinny-1-x.md](picatinny-1-x.md) for a `0.x` project produces imports that do not resolve.
For a project without the dependency, [picatinny-substitutes.md](picatinny-substitutes.md).

The Java and Kotlin facade under `org.galaxio.gatling.javaapi` exists on this line too, so the
language rule is the same: all three languages use the library.

## Coordinates

Artifact `org.galaxio:gatling-picatinny`, test-scoped. sbt appends the Scala suffix with `%%`;
Maven and Gradle need `gatling-picatinny_2.13`. **The `0.x` line spans three Gatling lines**, so
the version comes from the project's line, not from this file: `0.14.x` on 3.9.x, `0.15.0` on
3.10.x, `0.16.0` and up on 3.11.x. See [versions.md](versions.md).

That is a trap running the opposite way to the usual one: **raising a `0.x` pin can move the
Gatling line without changing a single import**, where elsewhere the API moves and the line does
not.

## What Differs From The 1.x Line

Three differences decide whether the code compiles:

- **There is no Faker API.** The package `org.galaxio.gatling.feeders.faker` does not exist at
  this version, so `Faker` and `GeneratedFeeder` are unavailable.
- **The `Random*Feeder` family is the current API**, not a deprecated one. `RandomUUIDFeeder`,
  `RandomPhoneFeeder`, `RandomStringFeeder`, `RandomDigitFeeder` and the document-number
  generators all live in `org.galaxio.gatling.feeders`, carry no deprecation, and return a
  `Feeder[String]`. One import covers them: `org.galaxio.gatling.feeders._`.
- **`assertionFromYaml` is current here.** Its deprecation arrives on the `1.x` line — see
  [picatinny-1-x.md](picatinny-1-x.md) — so there is no warning to work around.

This line also carries modules the 1.x documentation does not lead with: `profile`, `templates`
and an `influxdb` integration that was already deprecated at `0.18.2`.

## Config

`SimulationConfig` reads `simulation.conf` with system properties overriding it, and the default
parameter names are the same as on the later line. **The getter set is not.** Only these exist:

`getStringParam`, `getIntParam`, `getDoubleParam`, `getDurationParam` and `getBooleanParam`,
each with a two-argument form carrying a default.

`getStringListParam`, `getConfigParam` and every `getOpt…` variant arrive partway into `1.x`, not
at its first release, which still carries this same five-getter set —
[picatinny-1-x.md](picatinny-1-x.md) names where. Code written against
[picatinny-1-x.md](picatinny-1-x.md) that reaches for `getOptStringParam` or `.orElse(…)` does
not compile here — use the two-argument default form instead.

`intensity` is an arrival rate in virtual users per second, not a user count; see
[workload-models.md](workload-models.md).

Every credential goes through a getter — see the Config And Secrets invariant in `SKILL.md`.

## Other Modules

| Module       | What it gives                                                                      |
| ------------ | ---------------------------------------------------------------------------------- |
| Transactions | Named blocks with their own latency statistics, `org.galaxio.gatling.transactions` |
| JWT          | Token generation under `org.galaxio.gatling.utils.jwt`                             |
| Redis        | Redis commands as scenario actions                                                 |
| Assertions   | `assertionFromYaml` from `org.galaxio.gatling.assertions.AssertionsBuilder`        |
| Utils        | `IntensityConverter`, present on this line as well                                 |

## Raising The Pin

Moving `0.x` to `1.x` is a real API change — the three differences above run in reverse. From a
3.11 project it is **not** also a Gatling upgrade — most of `1.x` sits on 3.11.x too, so the whole
`1.x` API is available without touching the Gatling version. From a 3.9 or 3.10 project it **is**
one, because the `0.x` line itself crosses. Check the column in [versions.md](versions.md) before
calling it an API upgrade. Crossing onto 3.13.x moves the line from 3.11.x too, and that is
[migrate.md](migrate.md) — a decision to confirm with the user rather
than a step to take quietly.
