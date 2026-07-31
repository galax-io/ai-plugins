# Resource Files

The four files under the resource root. Identical in every language and build tool — only the root moves: `src/test/resources` under sbt and Maven, `src/gatling/resources` under Gradle.

## simulation.conf

Keys are **flat**, not nested under a root object, and durations are HOCON duration strings:

```hocon
// No default: the run must be told which environment to hit.
baseUrl = ${?BASE_URL}

// Arrival rate in virtual users per second. A Double, not a user count.
// Has a default, so INTENSITY is an optional override.
intensity = 10.0
intensity = ${?INTENSITY}

rampDuration  = 1 minute
stageDuration = 10 minutes

// The maxDuration fuse. Keep it above the length the profile implies —
// [workload-models.md](workload-models.md) gives the arithmetic.
testDuration = 15 minutes
```

### Which Keys Are Required

**Required means the simulation that reads the key does not start without it**: a Picatinny getter over an undefined key throws at class-initialization, before the first request. Nothing else is required — a key no simulation reads may be absent.

Picatinny's own parameters:

| Key                        | Type     | Required when                                                                                                         |
| -------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------- |
| `baseUrl`                  | string   | the HTTP protocol builder is used. A JDBC-only project needs no `baseUrl` at all, and Picatinny loads fine without it |
| `baseAuthUrl`, `wsBaseUrl` | string   | only when a holder reads them — a separate auth host, a WebSocket endpoint                                            |
| `intensity`                | double   | every open profile, and `IntensityConverter`                                                                          |
| `stagesNumber`             | int      | the staged open profile only                                                                                          |
| `rampDuration`             | duration | any profile with a ramp, including every stage of the staged one                                                      |
| `stageDuration`            | duration | the stability and staged profiles                                                                                     |
| `testDuration`             | duration | every simulation — it is the `maxDuration` fuse                                                                       |

Everything else is a custom key the project declares, read through `getStringParam` and its typed siblings. Each protocol reference names the keys its own snippets require:

| Keys                                                | Required for                                               | Named in                                       |
| --------------------------------------------------- | ---------------------------------------------------------- | ---------------------------------------------- |
| `dbUrl`, `dbUser`, `dbPassword`                     | JDBC                                                       | [protocol-jdbc.md](protocol-jdbc.md)           |
| `kafkaUrl`                                          | Kafka                                                      | [protocol-kafka.md](protocol-kafka.md)         |
| `amqpHost`, `amqpPort`, `amqpLogin`, `amqpPassword` | AMQP                                                       | [protocol-messaging.md](protocol-messaging.md) |
| `jmsUrl`, `jmsUser`, `jmsPassword`                  | JMS                                                        | [protocol-messaging.md](protocol-messaging.md) |
| `users`                                             | the closed model — `intensity` is a rate, not a population | [workload-models.md](workload-models.md)       |
| `pacing`                                            | a closed scenario using `pace`                             | [lang-scala.md](lang-scala.md)                 |

Adding a getter is what makes a key required, so a reference introducing one names it here too.

### `${?VAR}` And Run-Time Overrides

**`${?VAR}` is HOCON's _optional_ substitution, and the line above it decides what it means.** When `VAR` is unset the whole assignment is discarded:

- With no preceding default, the key stays undefined and the getter throws at class-initialization, naming it. This is what makes an environment variable **mandatory**, and it is the shape for an endpoint or a credential.
- With a default on the line above, the default survives silently. The optional-override shape, never for `baseUrl`.

A key that must come from the environment therefore gets no default line. Say so when handing the project over: a clone-and-run without the environment exported stops immediately, by design.

Overriding at run time uses system properties. They go through the same parser as the file, so both duration spellings work — but the compact form is the one that needs no quoting, and the spaced form used in the file must be quoted:

```bash
-DbaseUrl=https://test.example.org -DrampDuration=30s -DstageDuration="2 minutes"
```

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
