# Resource Files

The four files under the resource root. Identical in every language and build tool — only the
root moves: `src/test/resources` under sbt and Maven, `src/gatling/resources` under Gradle.

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

// The maxDuration fuse. Keep it above the length the profile implies — for the staged
// profile that is stagesNumber * (stageDuration + rampDuration), not the sum of one of
// each — or the run is truncated and the report still looks complete.
testDuration = 15 minutes
```

Only the keys a simulation actually reads are required. A JDBC-only project needs `dbUrl`,
`dbUser` and `dbPassword` and no `baseUrl` at all.

**`${?VAR}` is HOCON's _optional_ substitution, and the line above it decides what it means.**
When `VAR` is unset the whole assignment is discarded:

- With no preceding default, the key stays undefined and the getter throws at
  class-initialization, naming it. The mandatory shape for an endpoint or a credential.
- With a default on the line above, the default survives silently. The optional-override shape,
  never for `baseUrl`.

A key that must come from the environment therefore gets no default line. Say so when handing the
project over: a clone-and-run without the environment exported stops immediately, by design.

Overriding at run time uses system properties. They go through the same parser as the file, so
both duration spellings work — quote the space:

```bash
-DbaseUrl=https://test.example.org -DrampDuration=30s -DstageDuration="2 minutes"
```

## gatling.conf

**Optional.** Gatling ships its own defaults, so this file only exists to override one. If
there is nothing to override, do not create it — an invented key is silently ignored, and the
file then looks like configuration while doing nothing.

When it is needed, the shape is:

```hocon
gatling {
  core {
    encoding = "utf-8"
  }
}
```

## logback.xml

Root at `WARN`. The commented logger leaks: at `DEBUG` it writes every body and every header,
`Authorization` included, into the log.

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

Both resolve against the resource root, and the CSV column names must match the `#{...}`
placeholders exactly — the coupling is across two files in different directories and nothing
checks it.

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

A numeric field stays unquoted. `"quantity": "#{quantity}"` sends a string, and an API that
validates types rejects it.
