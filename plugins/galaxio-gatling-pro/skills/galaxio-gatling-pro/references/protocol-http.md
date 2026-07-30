# HTTP

Gatling core, so available on every line and from every language with no extra dependency.

The builder names below are identical in the Scala, Java and Kotlin DSLs — only the syntax
differs. Code shapes for the protocol holder and the case live with their language:
[lang-scala.md](lang-scala.md), [lang-java.md](lang-java.md), [lang-kotlin.md](lang-kotlin.md).

## Where It Lives

The protocol builder belongs in the shared holder — `performance.scala`, `Performance.java` or
`Performance.kt`. Never in a case, never in a simulation. A simulation references it through
`.protocols(...)`.

## Protocol Options

| Option                              | Why                                                                                                                                              |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `baseUrl`                           | The only place the environment appears. Read it from config, never a literal                                                                     |
| `acceptHeader`, `contentTypeHeader` | Set once, so no case has to repeat them                                                                                                          |
| `disableFollowRedirect`             | The Galaxio default. A silently followed redirect hides the response the test was meant to measure, and turns one request into two in the report |
| `shareConnections`                  | Changes what is measured. Leave it at the Gatling default unless the real client pools connections the same way                                  |
| `userAgentHeader`                   | Set it when the server behaves differently per client                                                                                            |

Anything the server needs on every request goes on the protocol. Anything that varies per
request belongs to the case.

## Requests

Name a request by what it is — `GET /orders`, not `request_1`. The name is the row in the
report, and a generated name makes the result unreadable.

One case is one atomic action: a single request with its checks. Chaining two requests into one
case hides which of them was slow.

## Checks

The general rule — technical and business validation together — is in
the Checks invariant in `SKILL.md`. Two HTTP specifics:

- A body carrying `{"error": "..."}` under HTTP 200 is a failure `status` cannot see. Add a
  `jsonPath` check on the business field whenever the API answers that way.
- `saveAs` on a check is how a value reaches the session for the next request. It exists only
  when the check passed, so the following request must be on the success path.

## Bodies

Keep payloads out of the case once they grow: `ElFileBody("bodies/order.json")` reads the
template from the resource root and still interpolates `#{}` expressions. `StringBody` is for
one-liners only.

## Resources And Concurrency

`resources(...)` fetches a request's dependencies as children of that request.
`httpConcurrentRequests` covers concurrent requests without a parent, and it arrives at 3.15 —
[migrate.md](migrate.md).
