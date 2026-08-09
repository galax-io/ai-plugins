# Without Picatinny

For a project that cannot take the dependency, or is on a Gatling line Picatinny does not publish
for. Two reasons to be here:

- **The project could take it and simply has not.** Add it instead of substituting — the column
  for the project's line in [galaxio-artifacts.md](../../gatling-versions/references/galaxio-artifacts.md) gives the version, and the API is
  [picatinny-1-x.md](picatinny-1-x.md) or [picatinny-0-x.md](picatinny-0-x.md) depending on which
  major that column names.
- **The line has no release.** On 3.14.x and 3.15.x the column reads **none**.

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

The config holder has to read `simulation.conf` as well as system properties — otherwise every
key the rest of the skill puts in that file is silently missing —
and a missing key must fail loudly at class-initialization rather than hand `null` to a
protocol builder. Declaration shapes are in [lang-java.md](lang-java.md) and
[lang-kotlin.md](lang-kotlin.md); the keys themselves, and which are required, in
[resource-files.md](resource-files.md).

What must not change: the layer boundaries, the config key names, and the rule that no
environment data or credential appears in source.
