# Picatinny 1.x

The `1.x` line of `gatling-picatinny`. **It spans two Gatling lines**, so the API is decided by the Picatinny version, not the Gatling version — [galaxio-artifacts.md](../../gatling-versions/references/galaxio-artifacts.md). A `0.x` pin is a materially different API, [picatinny-0-x.md](picatinny-0-x.md); a project without the dependency, [picatinny-substitutes.md](picatinny-substitutes.md).

Written in Scala, with a Java and Kotlin facade under `org.galaxio.gatling.javaapi` in the same artifact. Source: [galax-io/gatling-picatinny](https://github.com/galax-io/gatling-picatinny).

## Coordinates

Artifact `org.galaxio:gatling-picatinny`, test-scoped. sbt appends the Scala suffix with `%%`; Maven and Gradle need `gatling-picatinny_2.13` written out. Which version pairs with which Gatling line is in [galaxio-artifacts.md](../../gatling-versions/references/galaxio-artifacts.md).

## Config

`SimulationConfig` reads `simulation.conf` and lets JVM system properties override it. Which keys are required, and the file's own syntax, are in [resource-files.md](resource-files.md).

| Parameter                                       | Type     | Meaning                                |
| ----------------------------------------------- | -------- | -------------------------------------- |
| `baseUrl`, `baseAuthUrl`, `wsBaseUrl`           | string   | environment endpoints                  |
| `intensity`                                     | string   | **arrival rate**, converted to users/s |
| `stagesNumber`                                  | int      | steps in a staged profile              |
| `rampDuration`, `stageDuration`, `testDuration` | duration | profile timings                        |

Custom parameters use `getStringParam`, `getIntParam`, `getDoubleParam`, `getDurationParam`, `getBooleanParam`, `getStringListParam` and `getConfigParam`, each with a `getOpt…` variant. Scala additionally has two-argument forms carrying a default; the facade does not — there, use `getOpt….orElse(…)`.

**The last two and every `getOpt…` arrive at `1.2.0`.** `1.0.1` still carries the five-getter set of the `0.x` line — [picatinny-0-x.md](picatinny-0-x.md). This boundary is not where the Faker one sits.

`intensity` traps twice over: feeding it to a closed profile silently reinterprets it as a population, and arrivals per second equal requests per second only when an iteration issues one request. The key itself takes the business figure in `rps`/`rpm`/`rph` — dividing by the requests per iteration is still your job. See [workload-models.md](workload-models.md) and, for the value's grammar, [resource-files.md](resource-files.md).

Every credential goes through a getter — see the Config And Secrets invariant in `SKILL.md`.

## Feeders

The current surface is the **Faker API**: `Faker.*` generators composed by `GeneratedFeeder`, in `org.galaxio.gatling.feeders.faker`. Domain-oriented values — names, phones, finance identifiers, document numbers — plus the simple ones.

**Faker arrives at `1.5.0`.** On `1.0.1` through `1.2.0` the package does not exist and the `Random*Feeder` family is still the current API; from `1.5.0` those carry `@deprecated("Use org.galaxio.gatling.feeders.faker.Faker.uuid with GeneratedFeeder instead")`. Check the pin before writing either form. Read `Random*Feeder` in an existing project; do not write new uses above `1.5.0`.

## Other Modules

| Module       | What it gives                                                                                                                                                                                                                                  |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Transactions | Named blocks reporting their own latency statistics; richer than Gatling's `group`. `SimulationWithTransactions` is the base class when the simulation reports them                                                                            |
| JWT          | HMAC, RSA and EC signing with a claims DSL, so a virtual user mints its own token. Keys come from config getters — a signing key in source is a leaked credential                                                                              |
| Redis        | Redis commands as scenario actions, for state shared between virtual users                                                                                                                                                                     |
| Assertions   | `assertionFromYaml` reads NFR thresholds from YAML, so a gate change is not a code change. **Deprecated from `1.18.0`** — expect a warning on the pinned version, and prefer the plain Gatling form for a clean compile. Gates only when asked |
| Utils        | `IntensityConverter` converts between requests per second, per minute and per hour, so `simulation.conf` carries the number the business stated                                                                                                |
