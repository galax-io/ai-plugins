# Kafka

`gatling-kafka-plugin` from Galaxio, versioned by the project's Gatling line — [galaxio-artifacts.md](../../gatling-versions/references/galaxio-artifacts.md). Scala takes the Scala DSL, Java and Kotlin the `KafkaDsl` facade.

It supports produce, consume and request-reply, with Avro, Protobuf and Schema Registry.

Config keys: `kafkaUrl` is required for this protocol — [resource-files.md](resource-files.md).

## Imports

Scala:

```scala
import org.apache.kafka.clients.consumer.ConsumerConfig
import org.apache.kafka.clients.producer.ProducerConfig
import org.galaxio.gatling.kafka.Predef._
import org.galaxio.gatling.config.SimulationConfig._

import scala.concurrent.duration.DurationInt
```

The facade entry point for Java and Kotlin is `org.galaxio.gatling.kafka.javaapi.KafkaDsl`.

## Protocol

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

`ACKS_CONFIG` decides what the test actually measures: `"1"` measures the leader write, `"all"` measures replication as well. State which one the profile means.

`consumeSettings` and `timeout` only do work in a request-reply scenario. On a produce-only test they are inert, and the reported latency is the producer ack — with `acks=1` that is leader-write time, single-digit milliseconds. Do not present it as end-to-end.

## Cases

Produce:

```scala
object KafkaCases {
  val sendMessage = kafka("send message")
    .topic("#{topic}")
    .send[String, String]("#{key}", "#{payload}")
}
```

Request-reply pairs a produced message with the response consumed from the reply topic, so the report carries an end-to-end latency. Use it whenever the system under test answers on a second topic.

## Sizing

`timeout` is the reply deadline, not a connection timeout. Set it above the worst acceptable end-to-end latency, or the run reports timeouts that are really assertion failures.

Consumer settings shape how much load the test itself can absorb. A consumer that cannot keep up turns into growing reply latency that looks like a broker problem.
