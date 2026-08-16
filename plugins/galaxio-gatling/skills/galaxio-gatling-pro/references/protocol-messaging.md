# AMQP And JMS

| Transport | Dependency                                     | Languages           |
| --------- | ---------------------------------------------- | ------------------- |
| AMQP      | `gatling-amqp-plugin` from Galaxio             | Scala, Java, Kotlin |
| JMS       | the broker's own client — see **Client** below | Scala, Java, Kotlin |

The AMQP version comes from the project's Gatling line — [galaxio-artifacts.md](../../gatling-versions/references/galaxio-artifacts.md).

`gatling-jms` is not a dependency to declare. `gatling-charts-highcharts` pulls it through `gatling-app` on every line, Java facade included, and the Gradle plugin adds that bundle itself.

Config keys, both required for the transport that reads them — [resource-files.md](resource-files.md): AMQP takes `amqpHost`, `amqpPort`, `amqpLogin` and `amqpPassword`; JMS takes `jmsUrl`, `jmsUser` and `jmsPassword`.

The snippets below are Scala. Java and Kotlin write the same builders through the facades — `org.galaxio.gatling.amqp.javaapi.AmqpDsl` for AMQP, `io.gatling.javaapi.jms.JmsDsl` for JMS — with config through `org.galaxio.gatling.javaapi.SimulationConfig`.

## AMQP

```scala
import org.galaxio.gatling.amqp.Predef._
import org.galaxio.gatling.config.SimulationConfig._
```

Protocol, with a RabbitMQ connection factory:

```scala
val amqpProtocol = amqp
  .connectionFactory(
    rabbitmq
      .host(getStringParam("amqpHost"))
      .port(getIntParam("amqpPort"))
      .username(getStringParam("amqpLogin"))
      .password(getStringParam("amqpPassword"))
      .vhost("/"),
  )
  .replyTimeout(60000)
  .consumerThreadsCount(8)
  .usePersistentDeliveryMode
```

`consumerThreadsCount` bounds how fast the test can drain replies; too low and reply latency grows for reasons that have nothing to do with the broker. `usePersistentDeliveryMode` makes the broker write to disk — leave it on only if production does the same, since it dominates the measurement.

Publish case:

```scala
object AmqpCases {
  val publishMessage = amqp("publish message").publish
    .queueExchange("#{queue}")
    .textMessage("#{payload}")
    .messageId("#{messageId}")
}
```

Publish, consume and request-reply are all supported; request-reply is what produces an end-to-end latency.

## JMS

```scala
import io.gatling.jms.Predef._
import org.galaxio.gatling.config.SimulationConfig._
```

Protocol. `jms` takes a connection factory and nothing else — `connectionFactoryName`, `url` and `credentials` live on `jmsJndiConnectionFactory`, and calling them straight on `jms` does not compile:

```scala
val jmsProtocol = jms
  .connectionFactory(
    jmsJndiConnectionFactory
      .connectionFactoryName("ConnectionFactory")
      .url(getStringParam("jmsUrl"))
      .credentials(getStringParam("jmsUser"), getStringParam("jmsPassword"))
      .contextFactory("org.apache.activemq.jndi.ActiveMQInitialContextFactory"),
  )
```

**`contextFactory` ends the chain and is not optional** — it is the only call that returns the type `connectionFactory` accepts, and its argument is the broker's `InitialContextFactory` class, the one reference that loads the client jar. Omit it and the code does not compile; name a class the client does not carry and the run dies on `NoInitialContextException`.

Case:

```scala
object JmsCases {
  val sendMessage = jms("send message")
    .send
    .queue("#{queue}")
    .textMessage("#{payload}")
}
```

Since Gatling 3.13 the `jmsProperty` check asserts on a property of an inbound message, which is how a reply is validated without parsing its body.

### Client

Gatling speaks JMS; it ships no broker. `gatling-jms` brings the API interfaces and nothing that implements them, so a JMS project adds its broker's own client — on every line, not only from 3.14. Without one the simulation compiles and the run dies resolving the connection factory, with nothing in the report to explain it. Under Gradle the JNDI form above needs only `gatlingRuntimeOnly`; a simulation that constructs the factory directly — `jms.connectionFactory(new ActiveMQConnectionFactory(url))` — references a broker class at compile time and needs `gatlingImplementation` instead.

**Which client is decided by the API package, and the artifact name does not tell you.** Every current client depends on `jakarta.jms:jakarta.jms-api`, but version `2.0.3` of it ships the `javax.jms` classes and `3.1.0` ships `jakarta.jms`. Match that version to the line, then take the `InitialContextFactory` from the same jar:

| Client                                    | Pulls `jakarta.jms-api` | Use on         | `contextFactory` argument                                        |
| ----------------------------------------- | ----------------------- | -------------- | ---------------------------------------------------------------- |
| `org.apache.activemq:activemq-client` 5.x | `2.0.3` → `javax.jms`   | 3.9.x–3.13.x   | `org.apache.activemq.jndi.ActiveMQInitialContextFactory`         |
| `org.apache.activemq:activemq-client` 6.x | `3.1.0` → `jakarta.jms` | 3.14.x, 3.15.x | `org.apache.activemq.jndi.ActiveMQInitialContextFactory`         |
| `org.apache.activemq:artemis-jms-client`  | `2.0.3` → `javax.jms`   | 3.9.x–3.13.x   | `org.apache.activemq.artemis.jndi.ActiveMQInitialContextFactory` |
| `org.apache.qpid:qpid-jms-client`         | `3.1.0` → `jakarta.jms` | 3.14.x, 3.15.x | `org.apache.qpid.jms.jndi.JmsInitialContextFactory`              |

Resolve before trusting a row — clients move their API version between releases. `mvn dependency:tree` or `./gradlew dependencies` shows which `jakarta.jms-api` actually lands.

**On 3.14 and later, Maven silently breaks on a mismatch.** A `2.0.3` client and Gatling's `3.1.0` are the same coordinate, so nearest-wins evicts `3.1.0` and `test-compile` fails with `cannot access jakarta.jms.ConnectionFactory` even though nothing in the sources names a broker. Take the matching client, or pin the API in `dependencyManagement`. Gradle takes the highest instead, so the same mismatch compiles and fails at run time on `NoClassDefFoundError` — a different symptom for one cause.

### Package Boundary

The package moves from `javax.jms` to `jakarta.jms` at 3.14: Gatling brings `javax.jms:javax.jms-api` up to 3.13 and `jakarta.jms:jakarta.jms-api` `3.1.0` from 3.14. Neither spelling compiles on the other side, so the import rewrite happens at the crossing and cannot be staged ahead of it. Adding a broker client can put a second API jar beside Gatling's — see **Client** above, where matching the client is what keeps one package on the classpath.
