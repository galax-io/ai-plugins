# Picatinny 1.x

The `1.x` line of `gatling-picatinny`. **It spans two Gatling lines** — [versions.md](versions.md)
says which releases sit on which — so the API you get is decided by the Picatinny version, not by
the Gatling version. A 3.11 project on a `1.x` pin belongs here.

For a `0.x` pin the API is materially different — see [picatinny-0-x.md](picatinny-0-x.md). For
a project without the dependency, [picatinny-substitutes.md](picatinny-substitutes.md).

Written in Scala, with a first-party Java and Kotlin facade under `org.galaxio.gatling.javaapi`
in the same artifact, so all three languages use it. Import spellings are in your language file.

Source: [galax-io/gatling-picatinny](https://github.com/galax-io/gatling-picatinny).

## Coordinates

Artifact `org.galaxio:gatling-picatinny`, test-scoped. sbt appends the Scala suffix with `%%`;
Maven and Gradle need `gatling-picatinny_2.13` written out. Which version pairs with which
Gatling line is in [versions.md](versions.md).

## Config

`SimulationConfig` reads `simulation.conf` and lets JVM system properties override it, so one
build runs against any environment.

| Parameter                                       | Type     | Meaning                     |
| ----------------------------------------------- | -------- | --------------------------- |
| `baseUrl`, `baseAuthUrl`, `wsBaseUrl`           | string   | environment endpoints       |
| `intensity`                                     | double   | **arrival rate** in users/s |
| `stagesNumber`                                  | int      | steps in a staged profile   |
| `rampDuration`, `stageDuration`, `testDuration` | duration | profile timings             |

Custom parameters use `getStringParam`, `getIntParam`, `getDoubleParam`, `getDurationParam`,
`getBooleanParam`, `getStringListParam` and `getConfigParam`, each with a `getOpt…` variant.
Scala additionally has two-argument forms carrying a default; the facade does not — there, use
`getOpt….orElse(…)`.

**The last two and every `getOpt…` arrive at `1.2.0`.** `1.0.1` still carries the five-getter
set of the `0.x` line — see [picatinny-0-x.md](picatinny-0-x.md) — so this is a second
boundary inside `1.x`, and it is not where the Faker one sits.

`intensity` being a rate is the trap, twice over: feeding it to a closed profile silently
reinterprets it as a population, and the rate it sets is virtual-user arrivals per second, which
equals requests per second only when an iteration issues one request. `IntensityConverter` takes
the business figure in `rps`/`rpm`/`rph` — dividing by the requests per iteration is still your
job. See [workload-models.md](workload-models.md).

Every credential goes through a getter — see the Config And Secrets invariant in `SKILL.md`.

## Feeders

The current surface is the **Faker API**: `Faker.*` generators composed by `GeneratedFeeder`, in
`org.galaxio.gatling.feeders.faker`. Domain-oriented values — names, phones, finance
identifiers, document numbers — plus the simple ones.

**Faker arrives at `1.5.0`.** On `1.0.1` through `1.2.0` the package does not exist and the
`Random*Feeder` family is still the current API; from `1.5.0` those carry
`@deprecated("Use org.galaxio.gatling.feeders.faker.Faker.uuid with GeneratedFeeder instead")`.
Check the pin before writing either form. Read `Random*Feeder` in an existing project; do not
write new uses above `1.5.0`.

Generated feeders never exhaust, which is why they beat a short CSV for fields the system under
test does not have to know. For identifiers that must already exist there, a CSV of real values
is the only correct source — see the Feeders invariant in `SKILL.md`.

## Other Modules

| Module       | What it gives                                                                                                                                                                                                                                                |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Transactions | Named blocks reporting their own latency statistics; richer than Gatling's `group`. `SimulationWithTransactions` is the base class when the simulation reports them                                                                                          |
| JWT          | HMAC, RSA and EC signing with a claims DSL, so a virtual user mints its own token. Keys come from config getters — a signing key in source is a leaked credential                                                                                            |
| Redis        | Redis commands as scenario actions, for state shared between virtual users                                                                                                                                                                                   |
| Assertions   | `assertionFromYaml` reads NFR thresholds from YAML, so a gate change is not a code change. **Deprecated from `1.18.0`** — expect a warning on the pinned version, and prefer the plain Gatling assertion form for a clean compile. Add gates only when asked |
| Utils        | `IntensityConverter` converts between requests per second, per minute and per hour, so `simulation.conf` carries the number the business stated                                                                                                              |
