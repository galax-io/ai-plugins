# Resource Files

The four files under the resource root. Identical in every language and build tool — only the root moves: `src/test/resources` under sbt and Maven, `src/gatling/resources` under Gradle.

## simulation.conf

Keys are **flat**, not nested under a root object, and durations are HOCON duration strings:

```hocon
// No default: the run must be told which environment to hit.
baseUrl = ${?BASE_URL}

// Arrival rate, read as a string: a bare number is rps, or write "120 rpm".
// Not a user count. Has a default here, so INTENSITY is an optional override.
intensity = 10.0
intensity = ${?INTENSITY}

rampDuration  = 1 minute
stageDuration = 10 minutes

// The maxDuration fuse. Keep it above the length the profile implies — for the
// staged profile that is stagesNumber * (stageDuration + rampDuration), not the
// sum of one of each. Omit this key and Picatinny computes exactly that length,
// which truncates the run while the report still looks complete.
testDuration = 15 minutes
```

### Which Keys Are Required

**Required means the getter has no default**, so an undefined key throws, naming it. Every Picatinny accessor is a `lazy val`, so the throw lands at **first access**, not when `SimulationConfig` loads — which is why a project can leave out the keys it never reads.

Picatinny's own parameters, as declared on both the `0.x` and `1.x` lines:

| Key                        | Type     | Required when                                                                                                                  |
| -------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `baseUrl`                  | string   | anything touches the holder the HTTP protocol builder lives in — see below. A JDBC-only project with its own holder needs none |
| `baseAuthUrl`, `wsBaseUrl` | string   | only when a holder reads them — a separate auth host, a WebSocket endpoint                                                     |
| `intensity`                | string   | every profile reading it. A bare number is rps; `"120 rpm"` and `"7200 rph"` are converted                                     |
| `rampDuration`             | duration | any profile with a ramp — **and any simulation that reads `testDuration`**                                                     |
| `stageDuration`            | duration | the stability, staged **and closed** profiles — **and any simulation that reads `testDuration`**                               |
| `stagesNumber`             | int      | never — it defaults to `1`                                                                                                     |
| `testDuration`             | duration | never — it defaults to `(rampDuration + stageDuration) * stagesNumber`                                                         |

**The two defaulted keys are the dangerous ones**, because omitting them produces a run rather than an error:

- Without `stagesNumber`, the staged profile becomes `incrementUsersPerSec(intensity / 1).times(1)` — one stage at full target intensity. The breaking-point test degenerates into the stability test and the report looks complete.
- Without `testDuration`, `maxDuration` becomes exactly the length the profile implies, which is the one value [workload-models.md](workload-models.md) says it must exceed. The top stage is cut off. That default also dereferences `rampDuration`, `stageDuration` and `stagesNumber`, so a simulation reading `testDuration` requires the first two even when its own profile has no ramp or stage.

`intensity` is read as a **string** and parsed by `IntensityConverter`, whose grammar takes at most **one digit after the decimal point**: `10.0` and `0.5` are fine, `16.67` throws `Simulation param for intensity incorrect`. Round to one decimal, or state the figure in `rpm`. `IntensityConverter` itself reads no config — it supplies `.rps`/`.rpm`/`.rph` on a `Double`, so `500.rpm` at an injection site needs no key at all.

`baseUrl` is scoped by the **holder**, not by the request. Picatinny's accessor is lazy, but the shared holder is not: `performance.scala` is a package object whose `httpProtocol` is a plain `val`, and `Performance.java`/`Performance.kt` bind theirs to a `static final`/`object` field. A JDBC-only simulation reaching `jdbcProtocol` in that same holder initializes it, evaluates `httpProtocol`, and forces `baseUrl`. Give a project with both protocols either the key or separate holders.

Everything else is a custom key the project declares, read through `getStringParam` and its typed siblings. Each protocol reference names the keys its own snippets require:

| Keys                                                | Required for                                               | Named in                                       |
| --------------------------------------------------- | ---------------------------------------------------------- | ---------------------------------------------- |
| `dbUrl`, `dbUser`, `dbPassword`                     | JDBC                                                       | [protocol-jdbc.md](protocol-jdbc.md)           |
| `kafkaUrl`                                          | Kafka                                                      | [protocol-kafka.md](protocol-kafka.md)         |
| `amqpHost`, `amqpPort`, `amqpLogin`, `amqpPassword` | AMQP                                                       | [protocol-messaging.md](protocol-messaging.md) |
| `jmsUrl`, `jmsUser`, `jmsPassword`                  | JMS                                                        | [protocol-messaging.md](protocol-messaging.md) |
| `users`                                             | the closed model — `intensity` is a rate, not a population | [workload-models.md](workload-models.md)       |
| `pacing`                                            | a closed scenario using `pace`                             | [workload-models.md](workload-models.md)       |

A getter with **no default** is what makes a key required; `getStringParam(path, default)` and the `getOpt…` family do not. A reference introducing a no-default getter names its key here too.

### `${?VAR}` And Run-Time Overrides

**`${?VAR}` is HOCON's _optional_ substitution, and the line above it decides what it means.** When `VAR` is unset the whole assignment is discarded:

- With no preceding default, the key stays undefined and the getter throws when the run first reads it, naming it. This is what makes an environment variable **mandatory**, and it is the shape for an endpoint or a credential.
- With a default on the line above, the default survives silently. The optional-override shape, never for `baseUrl`.

A key that must come from the environment therefore gets no default line. Say so when handing the project over: a clone-and-run without the environment exported stops immediately, by design.

Overriding at run time uses system properties, and they do **not** go through the HOCON parser: `ConfigFactory.systemProperties()` makes every `-D` value a plain string. Both duration spellings still work, because the duration getter parses a string either way — the compact one simply needs no shell quoting:

```bash
-DbaseUrl=https://test.example.org -DrampDuration=30s -DstageDuration="2 minutes"
```

Because the value stays a string, a `-D` override cannot supply a list or an object: overriding a key read by `getStringListParam` with `-DallowedCodes="[200,201]"` fails at startup with `has type STRING rather than LIST`. Such a key is overridden by editing the file or by pointing `-Dconfig.file` at another one.

## gatling.conf

**Optional.** Gatling ships its own defaults, so this file only exists to override one. If there is nothing to override, do not create it — an invented key is silently ignored, and the file then looks like configuration while doing nothing.

When it is needed, the shape is:

```hocon
gatling {
  core {
    encoding = "utf-8"
  }
}
```

## logback.xml

Root at `WARN`. The commented logger leaks: at `DEBUG` it writes every body and every header, `Authorization` included, into the log.

```xml
<configuration>
  <appender name="CONSOLE" class="ch.qos.logback.core.ConsoleAppender">
    <encoder>
      <pattern>%d{HH:mm:ss.SSS} [%-5level] %logger{15} - %msg%n</pattern>
    </encoder>
  </appender>

  <!-- Smoke runs only, never committed enabled:
  <logger name="io.gatling.http.engine.response" level="DEBUG"/>
  -->

  <root level="WARN">
    <appender-ref ref="CONSOLE"/>
  </root>
</configuration>
```

## Feeder data and body templates

Both resolve against the resource root, and the CSV column names must match the `#{...}` placeholders exactly — the coupling is across two files in different directories and nothing checks it.

`accounts.csv`:

```text
accountId
ACC-0000000001
ACC-0000000002
```

`bodies/order.json`, read by `ElFileBody("bodies/order.json")`:

```json
{
  "accountId": "#{accountId}",
  "items": [{ "sku": "SKU-0001", "quantity": 1 }]
}
```

A numeric field stays unquoted. `"quantity": "#{quantity}"` sends a string, and an API that validates types rejects it.
