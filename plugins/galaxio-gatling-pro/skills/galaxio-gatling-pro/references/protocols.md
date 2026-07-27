# Protocols

Keep in `performance.scala`, `Performance.java`, or `Performance.kt`. Shared
protocols only — no request definitions, no injection.

## Scala HTTP

```scala
package object performance {
  val httpProtocol = http
    .baseUrl(baseUrl)
    .acceptHeader("application/json")
    .contentTypeHeader("application/json")
    .disableFollowRedirect
}
```

## Java HTTP

```java
public final class Performance {
  public static final HttpProtocolBuilder httpProtocol = http
      .baseUrl(System.getProperty("baseUrl"))
      .acceptHeader("application/json")
      .contentTypeHeader("application/json")
      .disableFollowRedirect();

  private Performance() {}
}
```

## Kotlin HTTP

```kotlin
object Performance {
    val httpProtocol: HttpProtocolBuilder = http
        .baseUrl(System.getProperty("baseUrl"))
        .acceptHeader("application/json")
        .contentTypeHeader("application/json")
        .disableFollowRedirect()
}
```

## JDBC

```scala
val jdbcProtocol = DB
  .url(getStringParam("dbUrl"))
  .username(getStringParam("dbUser"))
  .password(getStringParam("dbPassword"))
  .connectionTimeout(2.minutes)
```

## Kafka

```scala
val kafkaProtocol = kafka
  .producerSettings(
    ProducerConfig.ACKS_CONFIG              -> "1",
    ProducerConfig.BOOTSTRAP_SERVERS_CONFIG -> getStringParam("kafkaUrl"),
  )
  .consumeSettings(
    ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG -> getStringParam("kafkaUrl"),
  )
  .timeout(10.seconds)
```

## AMQP

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

## JMS

```scala
val jmsProtocol = jms
  .connectionFactoryName("ConnectionFactory")
  .url(getStringParam("jmsUrl"))
  .credentials(getStringParam("jmsUser"), getStringParam("jmsPassword"))
```
