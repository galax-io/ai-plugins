# Galaxio Gatling Pro

Gatling JVM performance testing in Galaxio style: Scala, Java and Kotlin on sbt,
Maven or Gradle, Picatinny-first config and feeders, and the
cases/feeders/scenarios/simulations layout.

Previously the standalone repository `galax-io/galaxio-gatling-pro`. That repository
is deprecated and archived; this plugin is the maintained home.

## Install

Claude Code:

```bash
claude plugin marketplace add galax-io/ai-plugins
```

```text
/plugin install galaxio-gatling-pro@galaxio-performance-kit
```

Codex:

```bash
codex plugin marketplace add galax-io/ai-plugins
```

Cursor: copy this directory into `~/.cursor/plugins/local` and restart, until the kit
is published to the Cursor marketplace.

## What it covers

- Gatling `3.11.x` and Scala `2.13.x` as the Galaxio baseline
- Seven supported build-tool and language combinations, each with its conventional
  Gatling source root and run command
- HTTP, JDBC, JMS, Kafka and AMQP cases and protocols
- Open and closed workload models, plus smoke and debug simulations
- Picatinny `SimulationConfig` and feeders where the project has the dependency
- Scalafmt-clean Scala output

## Layout

```text
skills/galaxio-gatling-pro/
  SKILL.md              always-loaded guidance
  references/           looked up by name when needed
    imports.md          Scala, Java and Kotlin import sets
    cases.md            HTTP, Kafka, JDBC, AMQP and JMS cases
    protocols.md        protocol builders per transport
    build-files.md      .scalafmt.conf, build.sbt, pom.xml, Gradle shapes
  agents/openai.yaml    Codex UI sidecar
```

## License

Apache-2.0. See the repository [LICENSE](../../LICENSE).
