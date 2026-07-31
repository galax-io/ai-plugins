# Moving Between Gatling Lines

| Line | Change                                                               | Effect                                                                                     |
| ---- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| 3.11 | `${}` removed                                                        | `#{}` is the only expression language; on 3.9.x and 3.10.x both still compile              |
| 3.11 | `heavisideUsers` removed                                             | Renamed to `stressPeakUsers`                                                               |
| 3.11 | `WhiteList` / `BlackList` removed                                    | Renamed to `AllowList` / `DenyList`                                                        |
| 3.12 | Akka dropped                                                         | Remove the dependency; nothing in the DSL replaces it                                      |
| 3.12 | Graphite writer dropped                                              | Remove the writer from `gatling.conf`; export through another sink                         |
| 3.12 | `stopInjector` / `stopInjectorIf` renamed                            | `stopLoadGenerator` / `stopLoadGeneratorIf`, same semantics                                |
| 3.13 | Report generator needs `--add-opens=java.base/java.lang=ALL-UNNAMED` | Raise the build plugin past its floor and it is set automatically; see your build file     |
| 3.13 | PROXY protocol emulation added                                       | `proxyProtocolSourceIpV4Address` and `proxyProtocolSourceIpV6Address`                      |
| 3.13 | `jmsProperty` check added                                            | Asserts on a property of an inbound JMS message                                            |
| 3.14 | `javax.jms` → `jakarta.jms`                                          | Import rewrite in JMS code, plus a broker client that speaks the Jakarta API               |
| 3.15 | Feeder loading modes `eager` and `batch` removed                     | Delete any explicit loading mode on a file-based feeder; the default is the only behaviour |
| 3.15 | `httpConcurrentRequests` added                                       | Concurrent requests without a parent request                                               |
| 3.15 | `logActualValueInError` added                                        | Suppresses the actual value in a failing check message, to limit error cardinality         |

A change applies from its line upwards: everything at or below a project's line is already in
force, everything above is what an upgrade would face. Nothing stops on 3.12, so 3.11.x → 3.13.x
still applies both of its rows.

## Procedure

1. Raise the Gatling dependencies onto the target line.
2. Raise the build plugin past the floor that sets `--add-opens` automatically — your build
   reference names it.
3. Raise Picatinny and each Galaxio protocol plugin off the old line and onto the target column of
   [versions.md](versions.md). If the Picatinny pin was `0.x` the API changes too,
   [picatinny-0-x.md](picatinny-0-x.md).
4. Apply every row above the old line and at or below the new one.
5. Compile, then run one smoke simulation before touching anything else.

Each library crosses at its own release and the four do not cross together, so step 3 is per
artifact. A Picatinny pin from a lower column does not run on 3.13 at all, so it is not
optional and not silent: crossing a line is proposed and confirmed, never done on the way past.

## What Opens Up

Not the Galaxio protocol plugins — they have releases on the older lines too, so adding one is
never a reason to move. Coming off 3.11.x, what the upgrade buys is continued releases — 3.13.x is
the line the Galaxio libraries are still publishing for and 3.11.x is closed — plus the two 3.13
additions in the table above.

## Where This Ends

At 3.13.x whenever the project keeps a Galaxio dependency — [versions.md](versions.md) says why.
Without such a dependency the higher lines are an ordinary target, not an overshoot.
