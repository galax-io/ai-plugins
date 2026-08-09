# When The Build Carries Galaxio Libraries

`gatling-picatinny`, `gatling-jdbc-plugin`, `gatling-kafka-plugin`, `gatling-amqp-plugin`. They version independently and do not cross together — check each.

## Does A Release Exist For The Target Line

Look it up; a stored answer expires the day the release lands. The POM names the line:

```bash
curl -s https://repo1.maven.org/maven2/org/galaxio/gatling-picatinny_2.13/maven-metadata.xml
curl -s https://repo1.maven.org/maven2/org/galaxio/gatling-picatinny_2.13/<v>/gatling-picatinny_2.13-<v>.pom | grep -A2 gatling-core
```

Swap in `gatling-jdbc-plugin_2.13`, `gatling-kafka-plugin_2.13`, `gatling-amqp-plugin_2.13`. Take the newest release whose POM names the target line — never the newest outright. Version order lies: `0.17.1` is 3.11 and `0.17.1-latest` is not.

## Three Outcomes

| Situation                          | Do                                                                                                                                           |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Releases exist for the target line | Name the version per artifact, propose with the Gatling bump, raise nothing before the user confirms. A `0.x` Picatinny pin also changes API |
| No releases for the target line    | Say the project will fail at run time, then hand the decision back — stop at the last supported line, or drop the libraries                  |
| Gradle 9 and Galaxio               | Raise `gatling-gradle` to `3.14.3.1`+ so the task registers, pin `gatling { gatlingVersion }` to hold the line. Both hold at once            |

Row two, verbatim: **"Galaxio was left alone, and the project will fail at run time — possibly not on the first simulation."** The pin resolves, the simulation compiles, and it dies only on APIs binding Gatling internals — Picatinny `0.18.2` on Gatling `3.13.5` feeds fine and throws `NoSuchMethodError` on `CoreComponents.actorSystem()` at the first transaction.

## Crossing Picatinny `0.x` To `1.x`

Three source-level differences, all compile errors rather than runtime ones:

| `0.x`                                                                         | `1.x`                                                                                             |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `SimulationConfig` has five getters, each with a defaulting two-argument form | fourteen, including `getStringListParam`, `getConfigParam` and the `getOpt…` family, from `1.2.0` |
| No `org.galaxio.gatling.feeders.faker`                                        | `Faker` and `GeneratedFeeder` from `1.5.0`                                                        |
| `Random*Feeder` is the current API                                            | same package, deprecated                                                                          |

`assertionFromYaml` is current on `0.x` and deprecated on `1.x`. Code reaching for `getOptStringParam` or `.orElse(…)` does not compile against `0.x` — use the two-argument default form.

A project that cannot take Picatinny at all needs a substitution table, which lives with the writing skill, not here.

Outside sbt each artifact carries the explicit `_2.13`; sbt appends it with `%%`.
