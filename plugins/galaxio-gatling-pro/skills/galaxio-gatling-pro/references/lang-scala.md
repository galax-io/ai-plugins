# Scala DSL

The native Gatling DSL. Picatinny and the Galaxio protocol plugins are written in Scala, so
Scala consumes their DSL without a facade — Java and Kotlin go through
`org.galaxio.gatling.javaapi` instead.

Do not use Scala 3. Every Galaxio artifact is published for `_2.13` and will not resolve
against a Scala 3 project.

## Imports

Base:

```scala
import io.gatling.core.Predef._
import io.gatling.core.structure.ScenarioBuilder
import io.gatling.http.Predef._
import org.galaxio.gatling.config.SimulationConfig._
```

`ScenarioBuilder` needs its own import — `io.gatling.core.Predef` aliases only `Session`,
`Status`, `Simulation`, `Assertion` and `Node`.

Picatinny helpers, when the project has the dependency:

```scala
import org.galaxio.gatling.feeders.faker.Predef._
import org.galaxio.gatling.feeders.faker._
import org.galaxio.gatling.utils.IntensityConverter._
```

Both faker imports are needed: `Predef` carries only the implicit conversions, while `Faker`
and `GeneratedFeeder` are siblings in the same package. The older `RandomUUIDFeeder`-style
objects live in `org.galaxio.gatling.feeders` and are deprecated from Picatinny `1.5.0`. Below
that — the whole `0.x` line and `1.0.1`–`1.2.0` — the faker package does not exist and those
objects are the current API. The boundary is the Picatinny pin, not the Gatling version; see
[picatinny-1-x.md](picatinny-1-x.md) and [picatinny-0-x.md](picatinny-0-x.md).

Protocol imports belong with their protocol — see the `protocol-*` references. Assertion
imports are added only when the user asks for NFR gates.

`cases/`, `feeders/` and `scenarios/` are real Scala packages, so every reference across those
directories needs an explicit import. The snippets below omit them for brevity;
[starter-tree.md](starter-tree.md) spells them out.

Duration literals need:

```scala
import scala.concurrent.duration.DurationInt
```

## Shared Protocols

```scala
package org.galaxio

package object performance {
  val httpProtocol = http
    .baseUrl(baseUrl)
    .acceptHeader("application/json")
    .contentTypeHeader("application/json")
    .disableFollowRedirect
}
```

The package clause names the **parent**: the object itself is `org.galaxio.performance`, so
declaring `package org.galaxio.performance` here yields `…performance.performance` and the
protocol goes silently invisible to the simulation. `io.gatling.core.Predef._` must be in scope
even though nothing in the block names it — `http` takes an implicit `GatlingConfiguration`
that lives there. The whole file, with every import and every sibling, is in
[starter-tree.md](starter-tree.md).

## Case

```scala
object HttpCases {
  val getMainPage = http("GET /")
    .get("/")
    .check(status.is(200))
}
```

## Feeder

```scala
object Feeders {
  val accounts = csv("accounts.csv").circular
}
```

## Scenario

A companion object exposing `apply()` keeps simulations free of construction detail:

```scala
object MainScenario {
  def apply(): ScenarioBuilder = new MainScenario().scn
}

class MainScenario {
  val scn: ScenarioBuilder = scenario("Main Scenario")
    .feed(Feeders.accounts)
    .exec(HttpCases.getMainPage)
}
```

Closed model with pacing:

```scala
object ClosedPacingScenario {
  def apply(): ScenarioBuilder = new ClosedPacingScenario().scn
}

class ClosedPacingScenario {
  private val pacing = getDurationParam("pacing")

  val scn: ScenarioBuilder = scenario("Closed Pacing Scenario")
    .forever(
      pace(pacing)
        .feed(Feeders.accounts)
        .exec(HttpCases.getMainPage),
    )
}
```

`pacing` is not one of Picatinny's default parameters — add it to `simulation.conf` alongside
the `users` count the closed profile needs.

## Simulation

```scala
class DebugSimulation extends Simulation {
  setUp(
    MainScenario().inject(atOnceUsers(1)),
  ).protocols(httpProtocol)
    .maxDuration(1.minute)
}
```

Scala uses `inject` for both open and closed models; the profile itself decides which one it
is. Injection profiles are in [workload-models.md](workload-models.md).

## Session Access

Inside the DSL, expression-language strings resolve on their own. Plain Scala functions need an
explicit read:

```scala
exec { session =>
  myFunction(session("id").as[String])
  session
}
```

## Formatting

If the project has a formatter, run it before handing code back — under sbt that is
`sbt scalafmtAll scalafmtSbt`. Formatting configuration belongs to the project, not to this
skill: do not add a `.scalafmt.conf` to a repository that has none, and do not change one that
exists.
