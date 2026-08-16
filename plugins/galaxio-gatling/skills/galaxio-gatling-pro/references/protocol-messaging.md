# AMQP And JMS

| Transport | Dependency                                     | Languages           |
| --------- | ---------------------------------------------- | ------------------- |
| AMQP      | `gatling-amqp-plugin` from Galaxio             | Scala, Java, Kotlin |
| JMS       | the broker's own client — see **Client** below | Scala, Java, Kotlin |

The AMQP version comes from the project's Gatling line — [galaxio-artifacts.md](../../gatling-versions/references/galaxio-artifacts.md).

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

Protocol. `connectionFactoryName`, `url` and `credentials` are on `jmsJndiConnectionFactory`, not on `jms`, which takes only a connection factory:

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

**`contextFactory` is mandatory** — the only call returning the type `connectionFactory` accepts, and its argument is the class that loads the client jar. Wrong class, and the run dies on `NoInitialContextException`.

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

Gatling ships the JMS API and no broker; `gatling-jms` itself needs no entry, since `gatling-charts-highcharts` pulls it and its facade on every line. Add the broker's client, on every line and not only from 3.14, or the run dies resolving the connection factory. Gradle: `gatlingRuntimeOnly` for the JNDI form above, `gatlingImplementation` when the simulation names a broker class — `jms.connectionFactory(new ActiveMQConnectionFactory(url))`.

The artifact name does not decide the namespace. Every client depends on `jakarta.jms:jakarta.jms-api`, and `2.0.3` of it ships `javax.jms` while `3.1.0` ships `jakarta.jms`:

| Client                                    | `jakarta.jms-api`       | Lines          | `contextFactory`                                                 |
| ----------------------------------------- | ----------------------- | -------------- | ---------------------------------------------------------------- |
| `org.apache.activemq:activemq-client` 5.x | `2.0.3` → `javax.jms`   | 3.9.x–3.13.x   | `org.apache.activemq.jndi.ActiveMQInitialContextFactory`         |
| `org.apache.activemq:activemq-client` 6.x | `3.1.0` → `jakarta.jms` | 3.14.x, 3.15.x | `org.apache.activemq.jndi.ActiveMQInitialContextFactory`         |
| `org.apache.activemq:artemis-jms-client`  | `2.0.3` → `javax.jms`   | 3.9.x–3.13.x   | `org.apache.activemq.artemis.jndi.ActiveMQInitialContextFactory` |
| `org.apache.qpid:qpid-jms-client`         | `3.1.0` → `jakarta.jms` | 3.14.x, 3.15.x | `org.apache.qpid.jms.jndi.JmsInitialContextFactory`              |

Clients move their API version between releases; `mvn dependency:tree` or `./gradlew dependencies` shows which one lands.

A mismatch on 3.14+ fails per build tool. Maven evicts Gatling's `3.1.0` by nearest-wins and `test-compile` fails on `cannot access jakarta.jms.ConnectionFactory`, with nothing in the sources naming a broker; Gradle takes the highest and dies at run time on `NoClassDefFoundError`. Match the client, or pin the API in `dependencyManagement`.

### Package Boundary

Gatling brings `javax.jms:javax.jms-api` up to 3.13 and `jakarta.jms:jakarta.jms-api` `3.1.0` from 3.14. Neither spelling compiles on the other side, so the import rewrite happens at the crossing and cannot be staged ahead of it. A mismatched broker client puts a second API jar beside Gatling's — see **Client**.
