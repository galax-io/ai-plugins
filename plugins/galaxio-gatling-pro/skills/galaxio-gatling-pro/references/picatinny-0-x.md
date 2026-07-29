# Picatinny 0.x

The archived `0.16.0`–`0.18.2` line of `gatling-picatinny`, `0.18.2` being the top of it. Read
this file when the repository pins a `0.x` version — **not** when it is on Gatling 3.11. Those
are different questions: the `1.x` line has releases for both Gatling lines, so a 3.11 project
on Picatinny `1.5.0` uses [picatinny-1-x.md](picatinny-1-x.md), not this file.

**This is not the 1.x API with fewer features — parts of it are different.** Reading
[picatinny-1-x.md](picatinny-1-x.md) for a `0.x` project produces imports that do not resolve.
For a project without the dependency, [picatinny-substitutes.md](picatinny-substitutes.md).

The Java and Kotlin facade under `org.galaxio.gatling.javaapi` exists on this line too, so the
language rule is the same: all three languages use the library.

## Coordinates

Artifact `org.galaxio:gatling-picatinny`, test-scoped, version `0.18.2`. sbt appends the Scala
suffix with `%%`; Maven and Gradle need `gatling-picatinny_2.13`. See
[version-3-11.md](version-3-11.md).

## What Differs From The 1.x Line

Three differences decide whether the code compiles:

- **There is no Faker API.** The package `org.galaxio.gatling.feeders.faker` does not exist at
  this version, so `Faker` and `GeneratedFeeder` are unavailable.
- **The `Random*Feeder` family is the current API**, not a deprecated one. `RandomUUIDFeeder`,
  `RandomPhoneFeeder`, `RandomStringFeeder`, `RandomDigitFeeder` and the document-number
  generators all live in `org.galaxio.gatling.feeders`, carry no deprecation, and return a
  `Feeder[String]`. One import covers them: `org.galaxio.gatling.feeders._`.
- **`assertionFromYaml` is current here.** Its deprecation arrives at Picatinny `1.18.0`, which
  is past this line, so there is no warning to work around.

This line also carries modules the 1.x documentation does not lead with: `profile`, `templates`
and an `influxdb` integration that was already deprecated at `0.18.2`.

## Config

`SimulationConfig` reads `simulation.conf` with system properties overriding it, and the default
parameter names are the same as on the later line. **The getter set is not.** Only these exist:

`getStringParam`, `getIntParam`, `getDoubleParam`, `getDurationParam` and `getBooleanParam`,
each with a two-argument form carrying a default.

`getStringListParam`, `getConfigParam` and every `getOpt…` variant arrive at `1.2.0` — not at
`1.0.1`, which still carries this same five-getter set. Code written against
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

Moving `0.x` to `1.x` is a real API change — the three differences above run in reverse — but it
is **not** a Gatling upgrade. Picatinny `1.0.1` through `1.10.4` all target Gatling 3.11.5, so a
3.11 project can take the whole `1.x` API without touching its Gatling version. Crossing to
`1.12.0` is the step that moves the Gatling line, and that is
[migrate-3-11-to-3-13.md](migrate-3-11-to-3-13.md) — a decision to confirm with the user rather
than a step to take quietly.
