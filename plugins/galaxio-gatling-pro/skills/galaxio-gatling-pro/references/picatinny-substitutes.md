# Without Picatinny

For a project that cannot take the dependency. Version-independent, and language-independent:
Java and Kotlin reach Picatinny through its facade on both Gatling lines, so this is about the
dependency being absent, not about the language.

A project that simply does not have it yet should add it —
[picatinny-1-x.md](picatinny-1-x.md), which is the line to add on either Gatling version.

Keep the architecture identical and substitute the mechanism:

| Picatinny            | Substitute                                                                        |
| -------------------- | --------------------------------------------------------------------------------- |
| `SimulationConfig`   | One holder over system properties plus a parsed `simulation.conf`, same key names |
| Generated feeders    | Generated values from the standard library, or a large CSV with `circular`        |
| `assertionFromYaml`  | The plain Gatling assertion form                                                  |
| Transactions         | Gatling `group(...)`, accepting coarser statistics                                |
| JWT helpers          | Pre-generated tokens in a feeder, or a small local signer                         |
| `IntensityConverter` | Arithmetic on the config values at the injection site                             |
| Redis                | Write the shared data to CSV before the run                                       |

The config holder is the one that bites. It has to read `simulation.conf` as well as system
properties — otherwise every key the rest of the skill puts in that file is silently missing —
and a missing key must fail loudly at class-initialization rather than hand `null` to a
protocol builder. Declaration shapes are in [lang-java.md](lang-java.md) and
[lang-kotlin.md](lang-kotlin.md).

What must not change: the layer boundaries, the config key names, and the rule that no
environment data or credential appears in source.
