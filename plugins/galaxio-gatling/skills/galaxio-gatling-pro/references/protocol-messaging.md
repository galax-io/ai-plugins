# AMQP And JMS

| Transport | Dependency                         | Languages           |
| --------- | ---------------------------------- | ------------------- |
| AMQP      | `gatling-amqp-plugin` from Galaxio | Scala, Java, Kotlin |
| JMS       | `gatling-jms` from Gatling         | Scala, Java, Kotlin |

The AMQP version comes from the project's Gatling line — [versions.md](versions.md).

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

Protocol:

```scala
val jmsProtocol = jms
  .connectionFactoryName("ConnectionFactory")
  .url(getStringParam("jmsUrl"))
  .credentials(getStringParam("jmsUser"), getStringParam("jmsPassword"))
```

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

### Package Boundary

The package moves from `javax.jms` to `jakarta.jms` at 3.14 — [migrate.md](migrate.md). Pick the broker client to match the Gatling line, not the other way round.
