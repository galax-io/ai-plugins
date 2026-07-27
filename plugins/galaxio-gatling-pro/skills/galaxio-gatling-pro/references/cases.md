# Cases

Case = one atomic action. No workload, no scenario.

## Scala HTTP

```scala
object HttpCases {
  val getMainPage = http("GET /")
    .get("/")
    .check(status.is(200))
}
```

## Java HTTP

```java
public final class HttpCases {
  public static final ChainBuilder getMainPage =
      exec(http("GET /").get("/").check(status().is(200)));

  private HttpCases() {}
}
```

## Kotlin HTTP

```kotlin
object HttpCases {
    val getMainPage: ChainBuilder = exec(
        http("GET /").get("/").check(status().shouldBe(200))
    )
}
```

## Kafka

```scala
object KafkaCases {
  val sendMessage = kafka("send message")
    .topic("#{topic}")
    .send[String, String]("#{key}", "#{payload}")
}
```

## JDBC

```scala
object JdbcCases {
  val selectAccount = jdbc("SELECT account")
    .queryP("SELECT * FROM accounts WHERE id = {id}")
    .params("id" -> "#{accountId}")
    .check(simpleCheck(_.nonEmpty))
}
```

## AMQP

```scala
object AmqpCases {
  val publishMessage = amqp("publish message").publish
    .queueExchange("#{queue}")
    .textMessage("#{payload}")
    .messageId("#{messageId}")
}
```

## JMS

```scala
object JmsCases {
  val sendMessage = jms("send message")
    .send
    .queue("#{queue}")
    .textMessage("#{payload}")
}
```
