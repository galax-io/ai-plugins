# Imports

## Scala DSL

Base:

```scala
import io.gatling.core.Predef._
import io.gatling.http.Predef._
import org.galaxio.gatling.config.SimulationConfig._
```

Picatinny helpers:

```scala
import org.galaxio.gatling.feeders._
import org.galaxio.gatling.utils.IntensityConverter._
```

Protocol imports, only when needed:

```scala
import io.gatling.jms.Predef._
import org.apache.kafka.clients.consumer.ConsumerConfig
import org.apache.kafka.clients.producer.ProducerConfig
import org.galaxio.gatling.amqp.Predef._
import org.galaxio.gatling.jdbc.Predef._
import org.galaxio.gatling.kafka.Predef._

import scala.concurrent.duration.DurationInt
```

Only add assertion imports when user explicitly asks for NFR/assertions.

## Java DSL

```java
import static io.gatling.javaapi.core.CoreDsl.*;
import static io.gatling.javaapi.http.HttpDsl.*;

import io.gatling.javaapi.core.*;
import io.gatling.javaapi.http.*;
```

## Kotlin DSL

```kotlin
import io.gatling.javaapi.core.CoreDsl.*
import io.gatling.javaapi.http.HttpDsl.*
import io.gatling.javaapi.core.*
import io.gatling.javaapi.http.*
```
