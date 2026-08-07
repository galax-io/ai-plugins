# When The Build Carries Galaxio Libraries

```bash
grep -rnE --include='*.sbt' --include='*.gradle' --include='*.kts' --include='pom.xml' \
  --include='*.toml' --include='*.properties' 'org\.galaxio' . 2>/dev/null
```

`gatling-picatinny`, `gatling-jdbc-plugin`, `gatling-kafka-plugin`, `gatling-amqp-plugin` version independently and do not cross together — check each. Whether a release exists for the target line is **looked up**, not remembered: [galaxio-artifacts.md](../../gatling-versions/references/galaxio-artifacts.md).

| Situation                          | Do                                                                                                                                              |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Releases exist for the target line | Name the version per artifact, propose with the Gatling bump, raise nothing before the user confirms. A `0.x` Picatinny pin also changes API    |
| No releases for the target line    | Say the project will fail at run time, then hand the decision back — stop at the last supported line, or drop the libraries                     |
| Gradle 9 and Galaxio               | Raise `gatling-gradle` to `3.14.3.1`+ for the task to register, pin `gatling { gatlingVersion = '3.13.x' }` to keep the line. Both hold at once |

**The wording for the second row matters.** Not "Galaxio was left alone" but **"Galaxio was left alone, and the project will fail at run time — possibly not on the first simulation."** Raising Gatling alone leaves the pin resolving cleanly and the simulation compiling; it dies only on APIs binding Gatling internals — Picatinny `0.18.2` on Gatling `3.13.5` feeds fine and throws `NoSuchMethodError` on `CoreComponents.actorSystem()` at the first transaction.

Step 3 of the procedure is per artifact. Outside sbt each carries the explicit `_2.13`; sbt appends it with `%%`. The smoke run is what proves this branch — everything above survives compilation.
