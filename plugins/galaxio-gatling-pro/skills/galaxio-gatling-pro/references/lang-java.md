# Java DSL

## Imports

```java
import static io.gatling.javaapi.core.CoreDsl.*;
import static io.gatling.javaapi.http.HttpDsl.*;

import io.gatling.javaapi.core.*;
import io.gatling.javaapi.http.*;

import java.time.Duration;
```

`java.time.Duration` is needed by `maxDuration(...)`; `io.gatling.javaapi.core` does not
export a `Duration`.

## Shared Protocols

`Performance.java` holds protocols and nothing else:

```java
import static org.galaxio.gatling.javaapi.SimulationConfig.*;

public final class Performance {
  public static final HttpProtocolBuilder httpProtocol = http
      .baseUrl(baseUrl())
      .acceptHeader("application/json")
      .contentTypeHeader("application/json")
      .disableFollowRedirect();

  private Performance() {}
}
```

`baseUrl()` is Picatinny's config accessor — see Config below for the no-dependency case.

## Case

```java
public final class HttpCases {
  public static final ChainBuilder getMainPage =
      exec(http("GET /").get("/").check(status().is(200)));

  private HttpCases() {}
}
```

## Feeder

```java
public final class Feeders {
  public static final FeederBuilder<String> accounts = csv("accounts.csv").circular();

  private Feeders() {}
}
```

Picatinny's generated feeders come from two static imports —
`org.galaxio.gatling.javaapi.FakerApi` for the generators and
`org.galaxio.gatling.javaapi.Feeders.GeneratedFeeder` to compose them into fields. They return
`Iterator<Map<String, Object>>`, which is a different `feed(...)` overload from
`FeederBuilder<?>`, so declare the type accordingly.

## Scenario

```java
public final class MainScenario {
  public static ScenarioBuilder create() {
    return scenario("Main Scenario")
        .feed(Feeders.accounts)
        .exec(HttpCases.getMainPage);
  }

  private MainScenario() {}
}
```

## Simulation

The profile goes in an instance initializer block, because `Simulation` does its work at
construction time:

```java
public class DebugSimulation extends Simulation {
  {
    setUp(
        MainScenario.create().injectOpen(atOnceUsers(1))
    ).protocols(Performance.httpProtocol)
     .maxDuration(Duration.ofMinutes(1));
  }
}
```

The Java DSL splits what Scala calls `inject` into **`injectOpen`** and **`injectClosed`**.
Pick the one matching the model — an open profile passed to `injectClosed` does not compile.
Profiles are in [workload-models.md](workload-models.md).

## Config

With Picatinny on the classpath, use its Java facade, as the holder above does. It reads
`simulation.conf` and lets system properties override it. The accessors are `baseUrl()`,
`baseAuthUrl()`, `wsBaseUrl()`,
`intensity()`, `stagesNumber()`, `rampDuration()`, `stageDuration()`, `testDuration()`, plus
`getStringParam(...)` and its typed siblings. Details in the Picatinny file for your line.

Only when the project cannot take the dependency, hand-roll a holder over the same key names.
It has to read `simulation.conf` too, not just system properties, or every key the rest of the
skill puts in that file is silently missing — and a missing key must fail loudly rather than
hand `null` to a protocol builder:

```java
import com.typesafe.config.ConfigFactory;

public final class Params {
  private static final com.typesafe.config.Config CONF =
      ConfigFactory.systemProperties().withFallback(ConfigFactory.load("simulation"));

  public static final String BASE_URL = CONF.getString("baseUrl");

  private Params() {}
}
```

`ConfigFactory.load` takes a resource **basename** and appends the extension itself, so the
argument is `"simulation"`. Passing `"simulation.conf"` makes it look for `simulation.conf.conf`,
find nothing, and fall through to system properties alone.

Do not call the holder `Config`: inside a class of that name the simple name `Config` binds to
the class being declared and the Typesafe type becomes unreachable — and importing it is itself
an error in a file that declares a top-level `Config`. This branch also needs the
`com.typesafe.config` dependency, which Picatinny would otherwise have brought in.

`getString` throws on a missing key, which is what you want at class-init: the run stops with
the key name instead of failing later on a null base URL. The full substitution table is in
[picatinny-substitutes.md](picatinny-substitutes.md).
