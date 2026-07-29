# Gatling 3.11.x

Legacy line. Use it only when the repository is already on it; for anything new go to
[version-3-13.md](version-3-13.md). Every Galaxio library does have releases for this line, so
being here is not a reason to upgrade on its own.

## Versions

| Artifact               | Top release on this line             |
| ---------------------- | ------------------------------------ |
| Gatling                | `3.11.5`                             |
| Scala                  | `2.13.x`                             |
| Java                   | 17+, because Picatinny requires it   |
| `gatling-picatinny`    | `1.10.4`                             |
| `gatling-jdbc-plugin`  | `0.17.2`                             |
| `gatling-kafka-plugin` | `0.20.5`                             |
| `gatling-amqp-plugin`  | `1.0.4`                              |
| `gatling-maven-plugin` | `4.8.0`, which needs Maven 3.6.3+    |
| `gatling-gradle`       | `3.11.1` — there is no `3.11.0`      |
| `gatling-sbt`          | 4.x, independent of the Gatling line |

Those four Galaxio numbers are ceilings, not floors: a lower pin is old, not invalid, and each
library moves independently **within** the line. Raising `gatling-jdbc-plugin` from `0.14.0` to
`0.17.2` is a normal upgrade that does not touch Gatling. Crossing the ceiling is the thing that
drags the whole project — see [migrate-3-11-to-3-13.md](migrate-3-11-to-3-13.md).

Two traps in the version numbers themselves. Galaxio publishes a parallel `-latest` branch, and
those coordinates target 3.13.x even when the plain twin does not: `gatling-jdbc-plugin 0.17.1`
is a 3.11 release, `0.17.1-latest` is not. And `gatling-jdbc-plugin 0.13.0` is a mis-publish
pinned to 3.13.1, sitting between two 3.11 releases — version order alone does not tell you the
line, so read the artifact's own POM when a pin looks out of sequence.

The `--add-opens` floors that make the build-plugin version load-bearing only start at 3.13, so
on this line follow whatever build-plugin version the repository already declares.

## Coordinates

These numbers go into the build file for your language and build tool — the dispatch table in
`SKILL.md` names it — test-scoped, with the `_2.13` suffix on every Galaxio artifact outside
sbt.

The Scala patch is free: 2.13 is binary-compatible across patches, so any `2.13.x` works with
the `_2.13` artifacts.

## No `--add-opens` Here

The `--add-opens=java.base/java.lang=ALL-UNNAMED` requirement starts at 3.13. On this line the
flag is unnecessary.

## Gradle Detail

The 3.11 line of `gatling-gradle` stopped applying the Scala plugin by default. A Scala project
must declare `id 'scala'` itself — see [build-gradle-scala.md](build-gradle-scala.md).

## Already In Force

3.11 removed a batch of deprecated API, so code on this line already uses the modern spelling:

- `#{}` expression language only; `${}` was dropped.
- `stressPeakUsers`, not `heavisideUsers`.
- `AllowList` and `DenyList`, not `WhiteList` and `BlackList`.

## Still Available, Removed Later

- `stopInjector` and `stopInjectorIf` — renamed at 3.12.
- The Graphite writer and the Akka dependency — dropped at 3.12.

Both are the reason a 3.11 codebase does not compile unchanged on 3.13; see
[migrate-3-11-to-3-13.md](migrate-3-11-to-3-13.md).
