---
name: gatling-migration
description: 'Use when upgrading a Gatling JVM performance project from one Gatling line to another, anywhere between 3.9.x and 3.15.x: establishing the line a project is on, choosing a target, applying the renames and removals each line brought, raising the build plugin, and running one smoke simulation to prove the move.'
---

# Gatling Migration

## Establish The Line

```bash
grep -rnE --include='*.sbt' --include='*.gradle' --include='*.kts' --include='pom.xml' \
  --include='*.toml' --include='*.properties' 'gatling' . 2>/dev/null
```

Authored build inputs only — a recursive walk of `project/` picks up sbt's stale resolution-cache report.

| Found                                                                                      | Means                                      |
| ------------------------------------------------------------------------------------------ | ------------------------------------------ |
| `gatling-charts-highcharts`, `gatling-test-framework`, `gatling-app`, `${gatling.version}` | the line                                   |
| `gatling { gatlingVersion = '…' }`                                                         | the line, and it wins on Gradle            |
| `io.gatling.gradle`                                                                        | the line only if no `gatlingVersion` block |
| `gatling-maven-plugin`, `gatling-sbt`                                                      | nothing — they number independently        |

## Choose The Target

**Default 3.13.x**, stated as a default and not a ceiling. Two overrides:

- **Gradle 9** — `gatlingRun` will not register below `gatling-gradle 3.14.3.1`. Raise the plugin and keep the line with `gatlingVersion`; the floor is on the plugin, not on Gatling.
- **`org.galaxio` in the build** — [references/galaxio-upgrade.md](references/galaxio-upgrade.md) before naming any target.

## What Each Line Changed

| Line | Change                                    | Effect                                                                                                                                              |
| ---- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| 3.11 | `${}` removed                             | `#{}` only; on 3.9.x and 3.10.x both compile                                                                                                        |
| 3.11 | `heavisideUsers` removed                  | → `stressPeakUsers`                                                                                                                                 |
| 3.11 | `WhiteList` / `BlackList` removed         | → `AllowList` / `DenyList`                                                                                                                          |
| 3.12 | Akka dropped                              | Remove the dependency; nothing replaces it                                                                                                          |
| 3.12 | Graphite writer dropped                   | **Silently** — an unknown writer in `gatling.conf` is accepted, the run stays green, no data is exported. Remove it and route the metrics elsewhere |
| 3.12 | `stopInjector` / `stopInjectorIf` renamed | → `stopLoadGenerator` / `stopLoadGeneratorIf`. **No overlap**                                                                                       |
| 3.13 | Report generator needs `--add-opens`      | `--add-opens=java.base/java.lang=ALL-UNNAMED`; the build plugin passes it from its 3.13 floor                                                       |
| 3.13 | PROXY emulation added                     | `proxyProtocolSourceIpV4Address`, `proxyProtocolSourceIpV6Address`                                                                                  |
| 3.13 | `jmsProperty` check added                 | Asserts on a property of an inbound JMS message                                                                                                     |
| 3.14 | `javax.jms` → `jakarta.jms`               | Import rewrite, plus a broker client on the Jakarta API. **No overlap**                                                                             |
| 3.15 | Feeder modes `eager` and `batch` removed  | Delete any explicit loading mode on a file-based feeder                                                                                             |
| 3.15 | `httpConcurrentRequests` added            | Concurrent requests with no parent request                                                                                                          |
| 3.15 | `logActualValueInError` added             | Drops the actual value from a failing check message                                                                                                 |

Changes apply from their line upwards and nothing stops: 3.11.x → 3.13.x applies all three 3.12 rows.

**No overlap** — no version compiles both spellings, so that edit lands in the same commit as the version bump.

## Procedure

1. Raise Gatling — the project's pin on Maven and sbt, `gatling { gatlingVersion = '…' }` on Gradle. Add the block rather than leaning on the plugin default.
2. Raise the build plugin past the 3.13 floor in [gatling-lines.md](../gatling-versions/references/gatling-lines.md). It moves independently of step 1 on all three tools.
3. `org.galaxio` libraries, if any — [references/galaxio-upgrade.md](references/galaxio-upgrade.md). Never raised silently.
4. Apply every row above the old line and at or below the new one.
5. Compile, then run one smoke simulation. A dependency left on the wrong line still resolves and still compiles; only the run finds it.

Stop at the agreed line, not the newest published.
