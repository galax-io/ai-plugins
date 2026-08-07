---
name: gatling-migration
description: 'Use when upgrading a Gatling JVM performance project from one Gatling line to another, anywhere between 3.9.x and 3.15.x: establishing the line a project is on, choosing a target, applying the renames and removals each line brought, raising the build plugin, and running one smoke simulation to prove the move.'
---

# Gatling Migration

## Establish The Line

Authored build inputs only — a recursive walk of `project/` picks up sbt's stale resolution-cache report:

```bash
grep -rnE --include='*.sbt' --include='*.gradle' --include='*.kts' --include='pom.xml' \
  --include='*.toml' --include='*.properties' 'gatling' . 2>/dev/null
```

`gatling-charts-highcharts`, `gatling-test-framework`, `gatling-app` and `${gatling.version}` name the line. `gatling-maven-plugin` and `gatling-sbt` do not — they number independently. `io.gatling.gradle`'s leading three numbers **are** the line, and a Gradle project often names nothing else.

## Choose The Target

**Default to 3.13.x**, and say it is a default, not a ceiling. Two overrides:

- **Gradle 9** — `gatlingRun` will not register below `gatling-gradle 3.14.3.1`. Propose `3.14.3.1`+, or say the project stays below and drives Gatling by hand: the build reference has the command, and `-rf`, the `--add-opens` flag and both source roots become the caller's.
- **An `org.galaxio` dependency** — read [references/galaxio-upgrade.md](references/galaxio-upgrade.md) before naming any target.

## What Each Line Changed

| Line | Change                                           | Effect                                                                                                                                              |
| ---- | ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| 3.11 | `${}` removed                                    | `#{}` is the only expression language; on 3.9.x and 3.10.x both still compile                                                                       |
| 3.11 | `heavisideUsers` removed                         | Renamed to `stressPeakUsers`                                                                                                                        |
| 3.11 | `WhiteList` / `BlackList` removed                | Renamed to `AllowList` / `DenyList`                                                                                                                 |
| 3.12 | Akka dropped                                     | Remove the dependency; nothing in the DSL replaces it                                                                                               |
| 3.12 | Graphite writer dropped                          | **Silently** — an unknown writer in `gatling.conf` is accepted, the run stays green, no data is exported. Remove it and route the metrics elsewhere |
| 3.12 | `stopInjector` / `stopInjectorIf` renamed        | `stopLoadGenerator` / `stopLoadGeneratorIf`, same semantics. **No overlap**                                                                         |
| 3.13 | Report generator needs `--add-opens`             | `--add-opens=java.base/java.lang=ALL-UNNAMED`; raise the build plugin and it is passed for you                                                      |
| 3.13 | PROXY protocol emulation added                   | `proxyProtocolSourceIpV4Address` and `proxyProtocolSourceIpV6Address`                                                                               |
| 3.13 | `jmsProperty` check added                        | Asserts on a property of an inbound JMS message                                                                                                     |
| 3.14 | `javax.jms` → `jakarta.jms`                      | Import rewrite in JMS code, plus a broker client speaking the Jakarta API. **No overlap**                                                           |
| 3.15 | Feeder loading modes `eager` and `batch` removed | Delete any explicit loading mode on a file-based feeder; the default is the only behaviour                                                          |
| 3.15 | `httpConcurrentRequests` added                   | Concurrent requests without a parent request                                                                                                        |
| 3.15 | `logActualValueInError` added                    | Suppresses the actual value in a failing check message, to limit error cardinality                                                                  |

A change applies from its line upwards and nothing stops: 3.11.x → 3.13.x applies all three 3.12 rows.

**No overlap** means no version compiles both spellings, so that edit lands in the same commit as the version bump.

## Procedure

1. **Raise Gatling onto the target line** — the project's own pin on Maven and sbt, the plugin version on Gradle.
2. **Raise the build plugin** past the 3.13 floor in [gatling-lines.md](../gatling-versions/references/gatling-lines.md), which is where `--add-opens` starts being passed for you. On Gradle step 1 already did it, and that entry is a target: stopping at its low end pins the project to `3.13.1`.
3. **Galaxio libraries**, if the build has any — [references/galaxio-upgrade.md](references/galaxio-upgrade.md). Never raised silently.
4. **Apply every row above the old line and at or below the new one.**
5. **Compile, then run one smoke simulation.** A dependency left on the wrong line still resolves and still compiles; only the run finds it.

Stop at the line that was agreed, not the newest published — every line above it brings renames the project did not ask for.
