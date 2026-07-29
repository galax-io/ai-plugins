# JDBC

`gatling-jdbc-plugin` from Galaxio, usable from all three languages. It has releases for both
Gatling lines; pick by the line the project is already on.

| Plugin            | Gatling | Scala | Java                         |
| ----------------- | ------- | ----- | ---------------------------- |
| `0.19.0`–`1.5.0`  | 3.13.x  | 2.13  | 17+ (the facade is major 61) |
| `0.12.0`–`0.17.2` | 3.11.x  | 2.13  | follow the project           |

`0.18.1` sits on 3.12 between them, and `0.13.0` is a mis-publish pinned to 3.13.1 out of
sequence. Nothing targets anything above 3.13 — see [beyond-3-13.md](beyond-3-13.md).

Import spellings are in your language file; the entry points are `org.galaxio.gatling.jdbc`
for Scala and `org.galaxio.gatling.javaapi.JdbcDsl` for the facade. Two types sit in their own
packages and need imports of their own, which a static import of `JdbcDsl` does not reach:
`org.galaxio.gatling.javaapi.check.simpleCheckType` and
`org.galaxio.gatling.javaapi.protocol.JdbcProtocolBuilder`.

## Driver

The plugin speaks JDBC; it does not ship a database driver. Put one on the runtime classpath or
the run dies at connection time with `No suitable driver` — before a single query executes, and
with nothing in the report to explain it. Under Gradle that means `gatlingRuntimeOnly`, not
`implementation`.

## Protocol

Built from `DB`, and it belongs in the shared protocol holder, never in a case. The builder
chain is `url` → `username` → `password` → pool settings; outside Scala it is `DB()` and ends
with `.protocolBuilder()`.

| Setting                  | Default             | Meaning                                 |
| ------------------------ | ------------------- | --------------------------------------- |
| `maximumPoolSize`        | 10                  | Connections in the HikariCP pool        |
| `minimumIdleConnections` | 10                  | Idle connections kept open              |
| `blockingPoolSize`       | = `maximumPoolSize` | Threads running the blocking JDBC calls |
| `connectionTimeout`      | 1 minute            | Waiting for a connection from the pool  |
| `queryTimeout`           | none                | Per-statement timeout                   |

**`maximumPoolSize` is the concurrency ceiling of the test.** Leave it below the number of
virtual users that reach the database and the run measures the pool, not the database:
response times climb because connections are queued while the database stays idle. Size it
against the injection profile — and against the server, because the ceiling on the other side
is real too. PostgreSQL defaults to `max_connections = 100`; a pool of 300 exhausts the
server's slots and takes down every other client of a shared environment rather than measuring
it. `blockingPoolSize` follows `maximumPoolSize` on its own; set explicitly and lower, the
thread pool silently becomes the narrower limit and the paragraph above stops describing the
run.

Every connection value comes from config, never a literal.

## Operations

A case is `jdbc(<name>)` followed by one operation and its checks:

| Operation                       | Shape                                                         | For                              |
| ------------------------------- | ------------------------------------------------------------- | -------------------------------- |
| `query`                         | `query(<sql>)`                                                | a statement with no session data |
| `queryP` + `params`             | `queryP("… WHERE id = {id}")`, `params(id → "#{accountId}")`  | anything session-driven          |
| `insertInto` + `values`         | `insertInto(<table>, Columns(<cols>))`, `values(col → value)` | a single insert                  |
| `batch`                         | `batch(<insert>, <insert>, …)`                                | many inserts in one round trip   |
| `call` + `params` + `outParams` | `outParams(name → java.sql.Types.INTEGER)`                    | a stored procedure               |

Take the table and column names from the schema, not from an example — a query against a column
that does not exist fails at run time with a driver error rather than anything Gatling explains.

## Checks

`simpleCheck` tests a predicate over the result set; `allResults` captures the whole set into
the session under a name. A query returning zero rows is usually a business failure the
transport layer cannot see, so check for it.

## Where The Languages Differ

Three differences, and they are the whole list:

- **`params` takes a map** outside Scala, where it takes tuple pairs.
- **`simpleCheck` takes an enum** outside Scala — `simpleCheckType.NonEmpty` — because a Scala
  function literal does not cross the facade. `allResults` becomes `allResults()`.
- **A case is a `ChainBuilder`** in the facade, so it is wrapped in `exec(...)` like any other
  action. In Scala the DSL does that for you.

Declaration shapes for each language are in [lang-scala.md](lang-scala.md),
[lang-java.md](lang-java.md) and [lang-kotlin.md](lang-kotlin.md).

## Parameter Binding

Session values go through `queryP` plus `params`. This is not a style preference: from plugin
`1.5.0` a `where(...)` clause **rejects Gatling expression language**, precisely so that session
data cannot be concatenated into SQL. Code that interpolated `#{}` into a `where` clause fails
and must be rewritten as a parameterized query.

## Behavior Changes In 1.5.0

- The literal text `"NULL"` is preserved as a string instead of being coerced to SQL `NULL`. A
  test that relied on the coercion silently changes meaning after the upgrade.
- `where(...)` no longer accepts expression language, as above.
- Error messages in reports were restructured so they do not expose row data. Any check that
  matched on the old error text needs updating.
