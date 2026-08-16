# Starter Tree

The sources are Scala on sbt with Picatinny; Java and Kotlin use the same package tree under their own root. The resource files — `simulation.conf`, `logback.xml`, the feeder CSV and the body template — are in [resource-files.md](resource-files.md).

**The two roots below are the sbt and Maven ones.** A Gradle project puts sources in `src/gatling/<language>` and resources in `src/gatling/resources`; written under `src/test/*` they fail to compile on their `io.gatling` imports. The roots table is in the Layout section of this skill's `SKILL.md`.

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

Each directory under `performance/` is a real Scala package, so cross-directory references need an explicit import.

## performance.scala

The file declares the _parent_ package, and `io.gatling.core.Predef._` is load-bearing here even though nothing names it — both traps are in [lang-scala.md](lang-scala.md).

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

Take the status and the JSON path from the API, not from this example: a creating `POST` usually answers `201`, and `$.orderId` is a guess. Ask, or leave a marked TODO — a wrong path fails the check against a healthy service. `bodies/order.json` must exist before the run, or Gatling sends nothing and dies in the report generator.

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

`httpProtocol` resolves without an import because the simulation is in the same package as the package object.
