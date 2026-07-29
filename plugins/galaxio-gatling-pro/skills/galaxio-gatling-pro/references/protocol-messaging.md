# AMQP And JMS

Two transports with different provenance: AMQP comes from the Galaxio plugin, JMS is Gatling
core.

| Transport | Dependency                         | Languages           | Lines                                           |
| --------- | ---------------------------------- | ------------------- | ----------------------------------------------- |
| AMQP      | `gatling-amqp-plugin` from Galaxio | Scala, Java, Kotlin | `1.2.0`+ on 3.13.x, `1.0.4` and below on 3.11.x |
| JMS       | `gatling-jms` from Gatling         | Scala, Java, Kotlin | any                                             |

The snippets below are Scala. Java and Kotlin write the same builders through the facades —
`org.galaxio.gatling.amqp.javaapi.AmqpDsl` for AMQP, `io.gatling.javaapi.jms.JmsDsl` for JMS —
with the declaration shapes from [lang-java.md](lang-java.md) and
[lang-kotlin.md](lang-kotlin.md), and config through
`org.galaxio.gatling.javaapi.SimulationConfig`.

## AMQP

```scala
import org.galaxio.gatling.amqp.Predef._
import org.galaxio.gatling.config.SimulationConfig._
```

The facade entry point for Java and Kotlin is `org.galaxio.gatling.amqp.javaapi.AmqpDsl`, and
for JMS `io.gatling.javaapi.jms.JmsDsl`; the import spelling is in your language file.

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

`consumerThreadsCount` bounds how fast the test can drain replies; too low and reply latency
grows for reasons that have nothing to do with the broker. `usePersistentDeliveryMode` makes
the broker write to disk — leave it on only if production does the same, since it dominates the
measurement.

Publish case:

```scala
object AmqpCases {
  val publishMessage = amqp("publish message").publish
    .queueExchange("#{queue}")
    .textMessage("#{payload}")
    .messageId("#{messageId}")
}
```

Publish, consume and request-reply are all supported; request-reply is what produces an
end-to-end latency.

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

Since Gatling 3.13 the `jmsProperty` check asserts on a property of an inbound message, which
is how a reply is validated without parsing its body.

### Package Boundary

On 3.11.x and 3.13.x the API is `javax.jms`. From 3.14 it is `jakarta.jms`, which means both an
import rewrite and a broker client that speaks the Jakarta API — see
[beyond-3-13.md](beyond-3-13.md). Pick the broker client to match the Gatling line, not the
other way round.
