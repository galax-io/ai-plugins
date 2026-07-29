# Starter Tree

The minimal project that compiles and runs, for creating a Gatling project from nothing. The
sources are Scala on sbt with Picatinny; Java and Kotlin use the same tree with the declaration
shapes from [lang-java.md](lang-java.md) and [lang-kotlin.md](lang-kotlin.md).

The resource files — `simulation.conf`, `logback.xml`, the feeder CSV and the body template —
are in [resource-files.md](resource-files.md). They are language- and build-tool-neutral, so
they live apart; read that file alone when only one of them has to be written.

Every import here is load-bearing.

## Tree

```text
src/test/scala/org/galaxio/performance/
  performance.scala
  cases/HttpCases.scala
  feeders/Feeders.scala
  scenarios/MainScenario.scala
  StabilitySimulation.scala
src/test/resources/
  simulation.conf
  logback.xml
  accounts.csv
  bodies/order.json
```

Each directory under `performance/` is a real Scala package, so cross-directory references need
an explicit import. The snippets in the other references omit those imports for brevity; here
they are spelled out.

## performance.scala

The package object **is** `org.galaxio.performance`, so its file declares the _parent_ package.
Writing `package org.galaxio.performance` here produces `org.galaxio.performance.performance`,
which compiles and then leaves `httpProtocol` invisible from the simulation — a silent scoping
error found much later.

```scala
package org.galaxio

import io.gatling.core.Predef._
import io.gatling.http.Predef._
import org.galaxio.gatling.config.SimulationConfig._

package object performance {

  val httpProtocol = http
    .baseUrl(baseUrl)
    .acceptHeader("application/json")
    .contentTypeHeader("application/json")
    .disableFollowRedirect

}
```

`io.gatling.core.Predef._` is not decoration: `http` takes an implicit `GatlingConfiguration`
and that implicit lives in the **core** Predef, not the http one. An import tidier, or a build
that fails on unused imports, will delete it and break the compile.

## cases/HttpCases.scala

```scala
package org.galaxio.performance.cases

import io.gatling.core.Predef._
import io.gatling.http.Predef._

object HttpCases {

  val postOrder = http("POST /orders")
    .post("/orders")
    .body(ElFileBody("bodies/order.json"))
    .check(
      status.is(201),
      jsonPath("$.orderId").saveAs("orderId"),
    )

}
```

Take the status and the JSON path from the API, not from this example: a creating `POST`
usually answers `201`, and `$.orderId` is a guess. Ask, or leave a marked TODO — a wrong path
fails the check against a healthy service. `bodies/order.json` must exist before the run, or
Gatling sends nothing and dies in the report generator; its contents are in
[resource-files.md](resource-files.md).

## feeders/Feeders.scala

```scala
package org.galaxio.performance.feeders

import io.gatling.core.Predef._

object Feeders {

  val accounts = csv("accounts.csv").circular

}
```

## scenarios/MainScenario.scala

```scala
package org.galaxio.performance.scenarios

import io.gatling.core.Predef._
import io.gatling.core.structure.ScenarioBuilder
import org.galaxio.performance.cases.HttpCases
import org.galaxio.performance.feeders.Feeders

object MainScenario {
  def apply(): ScenarioBuilder = new MainScenario().scn
}

class MainScenario {
  val scn: ScenarioBuilder = scenario("Main Scenario")
    .feed(Feeders.accounts)
    .exec(HttpCases.postOrder)
}
```

## StabilitySimulation.scala

```scala
package org.galaxio.performance

import io.gatling.core.Predef._
import org.galaxio.gatling.config.SimulationConfig._
import org.galaxio.performance.scenarios.MainScenario

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

`httpProtocol` resolves without an import because the simulation is in the same package as the
package object.
