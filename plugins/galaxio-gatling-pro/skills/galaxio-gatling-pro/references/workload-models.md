# Workload Models

Scala uses `inject` for every model. Java and Kotlin split it into `injectOpen` for the open profiles and `injectClosed` for `rampConcurrentUsers` and `constantConcurrentUsers`; passing an open profile to `injectClosed` does not compile.

The keys these profiles read — `intensity`, `stagesNumber`, `rampDuration`, `stageDuration`, `testDuration`, plus `users` and `pacing` for the closed model — are in [resource-files.md](resource-files.md), which says which of them Picatinny defaults rather than demands. `stagesNumber` and `testDuration` are the two that default, and both defaults are traps.

## Open Model, Stable Load

Users arrive at a rate; the system decides how many are in flight. This is the default for public-facing services.

```scala
class StabilitySimulation extends Simulation {
  setUp(
    MainScenario().inject(
      rampUsersPerSec(0).to(intensity).during(rampDuration),
      constantUsersPerSec(intensity).during(stageDuration),
    ),
  ).protocols(httpProtocol)
    .maxDuration(testDuration)
}
```

**`intensity` is arrivals per second, not requests per second.** Every `*UsersPerSec` builder meters virtual users entering the scenario: `constantUsersPerSec(100).during(60.seconds)` schedules 6000 scenario starts, each running the whole scenario. The two numbers coincide only when an iteration issues exactly one request; an iteration with `k` requests produces about `k * intensity` req/s. Picatinny authors the key in `rps`/`rpm`/`rph` and normalizes to per-second, so a business figure stated in requests has to be divided by the requests per iteration before it becomes an arrival rate. Say which one you used.

## Open Model, Staged

Finds the level where the system breaks, by stepping the arrival rate.

```scala
class MaxPerformanceSimulation extends Simulation {
  setUp(
    MainScenario().inject(
      incrementUsersPerSec(intensity / stagesNumber)
        .times(stagesNumber)
        .eachLevelLasting(stageDuration)
        .separatedByRampsLasting(rampDuration)
        .startingFrom(0.0),
    ),
  ).protocols(httpProtocol)
    .maxDuration(testDuration)
}
```

## Closed Model With Pacing

A fixed population of users, each looping at its own rhythm. Model a system with a bounded number of clients — a call centre, a fleet of workers, a connection-limited integration.

This profile takes a **user count**, and `intensity` is a rate, so it needs its own key. Add `users` to `simulation.conf` rather than reusing `intensity`:

```scala
class ClosedPacingSimulation extends Simulation {
  private val users = getIntParam("users")

  setUp(
    ClosedPacingScenario().inject(
      rampConcurrentUsers(0).to(users).during(rampDuration),
      constantConcurrentUsers(users).during(stageDuration),
    ),
  ).protocols(httpProtocol)
    .maxDuration(testDuration)
}
```

Do not write `intensity.toInt` here. `intensity` is a `Double` **arrival rate**: feeding it to a closed profile silently reinterprets a rate as a population — 50 arrivals/s becomes 50 concurrent users, which is anywhere from 5 to 5000 req/s depending on latency — and any rate below 1 truncates to zero, so `constantConcurrentUsers(0)` injects nobody and the run finishes green with no requests.

The `pace` that makes this work sits inside the scenario, not here, and reads its own `pacing` key — neither `users` nor `pacing` is a Picatinny default, so both are declared by the project.

## Smoke And Debug

One user, one pass. Run this before every load run — it is how a broken case is found in seconds instead of after a ramp.

```scala
class DebugSimulation extends Simulation {
  setUp(
    MainScenario().inject(atOnceUsers(1)),
  ).protocols(httpProtocol)
    .maxDuration(1.minute)
}
```

## Rules

- Set `maxDuration` **above** the length the profile implies, or it silently truncates the run. The staged profile above lasts `stagesNumber * (stageDuration + rampDuration)`, because a starting rate of zero puts a ramp before **every** level, including the first. Only a non-zero `startingFrom` gives the `(stagesNumber - 1)` ramp count. If `testDuration` is shorter, the top stages never execute and the report still looks complete.
- Choose the model from how the real system is driven, not from which one is easier to write.
- Throttling is not a workload model. Shape load with injection; use `throttle` only to cap a downstream dependency deliberately.
- The intensity, ramp and stage durations come from config, never from literals in the simulation.
