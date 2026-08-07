# HTTP

Gatling core, so available on every line and from every language with no extra dependency. The builder names below are identical in the Scala, Java and Kotlin DSLs — only the syntax differs.

Config keys: `baseUrl` is required wherever this protocol builder is used, `baseAuthUrl` and `wsBaseUrl` only when a holder reads them — [resource-files.md](resource-files.md).

## Where It Lives

The protocol builder belongs in the shared holder — `performance.scala`, `Performance.java` or `Performance.kt`. Never in a case, never in a simulation. A simulation references it through `.protocols(...)`.

## Protocol Options

| Option                                                             | Why                                                                                                                                              |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `baseUrl`                                                          | The only place the environment appears. Read it from config, never a literal                                                                     |
| `acceptHeader`, `contentTypeHeader`                                | Set once, so no case has to repeat them                                                                                                          |
| `disableFollowRedirect`                                            | The Galaxio default. A silently followed redirect hides the response the test was meant to measure, and turns one request into two in the report |
| `shareConnections`                                                 | Changes what is measured. Leave it at the Gatling default unless the real client pools connections the same way                                  |
| `userAgentHeader`                                                  | Set it when the server behaves differently per client                                                                                            |
| `proxyProtocolSourceIpV4Address`, `proxyProtocolSourceIpV6Address` | Present the generator's traffic as proxied, so the server reads the source address you name instead of the generator's. From 3.13                |

Anything the server needs on every request goes on the protocol. Anything that varies per request belongs to the case.

## Requests

Name a request by what it is — `GET /orders`, not `request_1`. The name is the row in the report, and a generated name makes the result unreadable.

One case is one atomic action: a single request with its checks. Chaining two requests into one case hides which of them was slow.

## Checks

An API that answers `{"error": "..."}` under HTTP 200 carries a failure `status` cannot see: add a `jsonPath` check on the business field.

A check on a value that differs per user writes a distinct error message per failure, and the report degenerates into thousands of one-off rows. `logActualValueInError(false)`, from 3.15, keeps the message and drops the value.

## Bodies

Keep payloads out of the case once they grow: `ElFileBody("bodies/order.json")` reads the template from the resource root and still interpolates `#{}` expressions. `StringBody` is for one-liners only.

## Resources And Concurrency

`resources(...)` fetches a request's dependencies as children of that request. `httpConcurrentRequests`, from 3.15, covers concurrent requests that have no parent.
