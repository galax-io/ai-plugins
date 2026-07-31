# JDBC

`gatling-jdbc-plugin` from Galaxio, versioned by the project's Gatling line —
[versions.md](versions.md).

`gatling-jdbc-plugin`'s own `1.x` releases compile their `javaapi` facade for Java 17, whatever
the upstream README says, so taking one means a Java 17 toolchain.

The entry points are `org.galaxio.gatling.jdbc`
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

- **`params` takes a map** outside Scala, where it takes tuple pairs.
- **`simpleCheck` takes an enum** outside Scala — `simpleCheckType.NonEmpty` — because a Scala
  function literal does not cross the facade. `allResults` becomes `allResults()`.
- **A case is a `ChainBuilder`** in the facade, so it is wrapped in `exec(...)` like any other
  action. In Scala the DSL does that for you.

## Parameter Binding

Session values go through `queryP` plus `params`, so that session data is never concatenated into
SQL. This holds on every pin. From plugin `1.5.0` it is also enforced: a `where(...)` clause
**rejects Gatling expression language**, so code that interpolated `#{}` into a `where` clause
fails and must be rewritten as a parameterized query.

## Behavior Changes In 1.5.0

- The literal text `"NULL"` is preserved as a string instead of being coerced to SQL `NULL`. A
  test that relied on the coercion silently changes meaning after the upgrade.
- `where(...)` no longer accepts expression language — see Parameter Binding above.
- Error messages in reports were restructured so they do not expose row data. Any check that
  matched on the old error text needs updating.
