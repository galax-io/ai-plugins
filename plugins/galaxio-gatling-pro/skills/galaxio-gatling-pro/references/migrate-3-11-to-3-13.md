# Migrating 3.11.x To 3.13.x

The supported upgrade. It crosses two intermediate lines, so both 3.12 and 3.13 changes apply
even though nothing stops on 3.12.

## Checklist

1. Raise the Gatling dependencies to `3.13.5`.
2. Raise the build plugin past the floor that sets the new JVM option automatically:
   `gatling-maven-plugin` `4.11.0`, `gatling-gradle` `3.13.1`, `gatling-sbt` `4.10.2`.
3. Raise Picatinny to `1.12.0` or later — `1.25.0` is current. If the pin was `0.x`, the API
   changes too; [picatinny-0-x.md](picatinny-0-x.md) lists what differs.
4. Raise each Galaxio protocol plugin past its 3.11 ceiling: `gatling-jdbc-plugin` to `0.19.0`+,
   `gatling-kafka-plugin` to `0.22.0`+, `gatling-amqp-plugin` to `1.2.0`+.
5. Rename `stopInjector` to `stopLoadGenerator` and `stopInjectorIf` to `stopLoadGeneratorIf`.
6. Remove the Graphite writer from `gatling.conf` and drop any Akka dependency the project
   declared for Gatling's sake.
7. Compile, then run one smoke simulation before touching anything else.

## What Breaks

| Change                                                                | Line | Action                                                                   |
| --------------------------------------------------------------------- | ---- | ------------------------------------------------------------------------ |
| Akka dropped                                                          | 3.12 | Remove the dependency; nothing in the DSL replaces it                    |
| Graphite integration dropped                                          | 3.12 | Remove the writer from `gatling.conf`; export through another sink       |
| `stopInjector` → `stopLoadGenerator`                                  | 3.12 | Rename; same semantics                                                   |
| `stopInjectorIf` → `stopLoadGeneratorIf`                              | 3.12 | Rename; same semantics                                                   |
| Report generation needs `--add-opens=java.base/java.lang=ALL-UNNAMED` | 3.13 | Raise the build plugin, or add the flag by hand                          |
| Picatinny `1.10.4` is the 3.11 ceiling                                | —    | Raise to `1.12.0+`; a `0.x` or `1.0.1`–`1.10.4` pin does not run on 3.13 |

## What Opens Up

Not the Galaxio protocol plugins — all three have 3.11 releases, so adding one is never a
reason to make this move. What the upgrade actually buys is the current release of each
library, plus PROXY protocol emulation and the `jmsProperty` check. Do it when the project
needs one of those, not to unlock JDBC, Kafka or AMQP.

## Renames Already Done At 3.11

If the codebase predates 3.11 these still apply, and none of them is optional:
`${}` → `#{}`, `heavisideUsers` → `stressPeakUsers`, `WhiteList`/`BlackList` →
`AllowList`/`DenyList`.

## Do Not Overshoot

3.14 and 3.15 exist upstream, and no Galaxio plugin runs on them. Stop at 3.13.x —
[beyond-3-13.md](beyond-3-13.md) explains the ceiling.
