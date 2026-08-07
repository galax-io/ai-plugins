# Kotlin DSL

## Imports

```kotlin
import io.gatling.javaapi.core.CoreDsl.*
import io.gatling.javaapi.http.HttpDsl.*
import io.gatling.javaapi.core.*
import io.gatling.javaapi.http.*

import java.time.Duration
```

`java.time.Duration` is needed by `maxDuration(...)` and is not in Kotlin's default imports.

## Shared Protocols

```kotlin
import org.galaxio.gatling.javaapi.SimulationConfig.*

object Performance {
    val httpProtocol: HttpProtocolBuilder = http
        .baseUrl(baseUrl())
        .acceptHeader("application/json")
        .contentTypeHeader("application/json")
        .disableFollowRedirect()
}
```

`baseUrl()` is Picatinny's config accessor — see Config below for the no-dependency case.

## Case

```kotlin
object HttpCases {
    val getMainPage: ChainBuilder = exec(
        http("GET /").get("/").check(status().shouldBe(200))
    )
}
```

Kotlin cannot call the Java DSL's `is`, a Kotlin keyword — the alias is **`shouldBe`**.

## Feeder

```kotlin
object Feeders {
    val accounts: FeederBuilder<String> = csv("accounts.csv").circular()
}
```

Picatinny's generated feeders come from the same two imports as Java, without `static` —
`org.galaxio.gatling.javaapi.FakerApi` for the generators and
`org.galaxio.gatling.javaapi.Feeders.GeneratedFeeder` to compose them into fields. They return
`Iterator<Map<String, Any>>`, a different `feed(...)` overload from `FeederBuilder<*>`, so
declare the type accordingly.

## Scenario

```kotlin
object MainScenario {
    fun create(): ScenarioBuilder = scenario("Main Scenario")
        .feed(Feeders.accounts)
        .exec(HttpCases.getMainPage)
}
```

## Simulation

```kotlin
class DebugSimulation : Simulation() {
    init {
        setUp(
            MainScenario.create().injectOpen(atOnceUsers(1))
        ).protocols(Performance.httpProtocol)
            .maxDuration(Duration.ofMinutes(1))
    }
}
```

Kotlin uses **`injectOpen`** or **`injectClosed`** rather than a single `inject`. Profiles are in
[workload-models.md](workload-models.md).

## Config

With Picatinny on the classpath, use its facade, as the holder above does — it reads
`simulation.conf` and lets system properties override it. Accessors are `baseUrl()`,
`baseAuthUrl()`, `wsBaseUrl()`, `intensity()`, `stagesNumber()`, `rampDuration()`,
`stageDuration()`, `testDuration()`, plus `getStringParam(...)` and its typed siblings — see
the Picatinny file for your line, and [resource-files.md](resource-files.md) for which keys a run
requires.

Only when the project cannot take the dependency, hand-roll a holder over the same key names.
It must read `simulation.conf` too, not just system properties. Do not assign
`System.getProperty` straight to a non-null `String`: it is a platform type, so a missing key
becomes a null-pointer failure at object initialization rather than a named error.

```kotlin
import com.typesafe.config.ConfigFactory

object Params {
    private val conf =
        ConfigFactory.systemProperties().withFallback(ConfigFactory.load("simulation"))

    val baseUrl: String = conf.getString("baseUrl")
}
```

`ConfigFactory.load` takes a resource **basename** and appends the extension itself, so the
argument is `"simulation"`. Passing `"simulation.conf"` makes it look for `simulation.conf.conf`,
find nothing, and fall through to system properties alone.

This branch needs the `com.typesafe.config` dependency, which Picatinny would otherwise have
brought in. The full substitution table is in
[picatinny-substitutes.md](picatinny-substitutes.md).
