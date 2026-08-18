/**
 * Fixtures are rendered from the real galaxio-cli template, not committed.
 * A committed fixture drifts from what `galaxio template init` actually
 * produces, and the skill under test is the one an agent meets on a real
 * project — so the eval renders the same thing a user would.
 *
 * Three patches are applied on top, each a defect the render has today:
 *
 *   - `gradlew` arrives without its executable bit (galaxio-cli#46).
 *   - The `if:` guards on the protocol directories are ignored, so
 *     Amqp/Jdbc/Kafka sources render without their dependencies and nothing
 *     compiles (galaxio-cli#45).
 *   - The 3.9 line needs two more: Picatinny `0.x` has no
 *     `org.galaxio.gatling.utils.Utility`, and `GatlingCliOptions` postdates
 *     Gatling 3.9.
 *
 * Drop a patch when its bug is fixed; a fixture that stops compiling is the
 * signal that one landed.
 */
import { execFileSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const PACKAGE = 'org/galaxio/performance/myservice';
const PKG = `src/gatling/scala/${PACKAGE}`;

/** Coordinates per line, from gatling-versions/references. 3.9 takes Picatinny
 *  0.x, whose API differs; the higher lines take the 1.x column. */
export const LINES = {
  '3.9': { gatling: '3.9.5', plugin: '3.9.5.6', picatinny: '0.14.1' },
  '3.11': { gatling: '3.11.5', plugin: '3.11.5.2', picatinny: '1.10.4' },
  '3.13': { gatling: '3.13.5', plugin: '3.13.5.4', picatinny: '1.17.1' },
  '3.15': { gatling: '3.15.1', plugin: '3.15.1.2', picatinny: '1.25.0' },
};

/** The `gatling-maven-plugin` the Maven probe pins, from the `4.x` cell of
 *  gatling-lines.md. The top of that range on purpose: `4.21.10` is above
 *  every Gatling version that exists, so reading it as the line is the error
 *  `gatling-versions` exists to stop. */
const MAVEN_PLUGIN = '4.21.10';

/** galaxio-cli defaults to `local:./galaxio-template-registry`, which is not
 *  where anyone running this has one. Name the registry outright. */
export const REGISTRY = 'github:galax-io/galaxio-template-registry';

export function render(line, dest, registry = REGISTRY) {
  const { gatling, plugin, picatinny } = LINES[line];
  rmSync(dest, { recursive: true, force: true });
  execFileSync(
    'galaxio',
    [
      'template',
      'init',
      'gatling/scala-gradle',
      ...(registry ? ['--registry', registry] : []),
      '--destination',
      dest,
      '--set',
      'Name=perf',
      '--set',
      `GatlingVersion=${gatling}`,
      '--set',
      `GatlingGradlePluginVersion=${plugin}`,
      '--set',
      `GatlingPicatinnyVersion=${picatinny}`,
      '-q',
    ],
    { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' },
  );

  const wrapper = path.join(dest, 'gradlew');
  if (!existsSync(wrapper)) throw new Error(`render produced no gradlew in ${dest}`);
  chmodSync(wrapper, 0o755);

  for (const proto of ['Amqp', 'Jdbc', 'Kafka']) {
    rmSync(path.join(dest, PKG, `cases/${proto}Actions.scala`), { force: true });
    rmSync(path.join(dest, PKG, `scenarios/${proto}Scenario.scala`), { force: true });
  }

  if (line === '3.9') patch39(dest);
  edit(
    path.join(dest, 'src/gatling/resources/simulation.conf'),
    (t) => t.replace(/http:\/\/localhost"/g, 'http://localhost:8080"'),
    { mustChange: true },
  );
  seed(line, dest);
  return dest;
}

function patch39(dest) {
  for (const file of ['MaxPerformance.scala', 'Debug.scala', 'Stability.scala']) {
    edit(path.join(dest, PKG, file), (t) =>
      t
        .split('\n')
        .filter((l) => !l.includes('org.galaxio.gatling.utils.Utility'))
        .join('\n'),
    );
  }
  writeFileSync(
    path.join(dest, PKG, 'GatlingRunner.scala'),
    `package org.galaxio.performance.myservice

import io.gatling.app.Gatling

object GatlingRunner {

  def main(args: Array[String]): Unit = {
    val simulationClass = classOf[Debug].getName
    Gatling.main(args ++ Array("-s", simulationClass, "-rf", "results"))
  }

}
`,
  );
}

/** What the crossing has to fix. Each spelling compiles on its own line and
 *  not above it, so a fixture that fails to compile before the agent runs is
 *  a broken fixture, not a finding. */
function seed(line, dest) {
  if (line === '3.9') {
    edit(
      path.join(dest, PKG, 'cases/HttpActions.scala'),
      (t) => t.replace('http("GET /")', 'http("GET /${accountId}")'),
      { mustChange: true },
    );
    writeFileSync(
      path.join(dest, PKG, 'Legacy.scala'),
      `package org.galaxio.performance.myservice

import io.gatling.core.Predef._
import io.gatling.http.Predef._
import org.galaxio.performance.myservice.scenarios._
import scala.concurrent.duration._

class Legacy extends Simulation {
  private val protocol = http.baseUrl("http://localhost:8080")
    .inferHtmlResources(WhiteList(".*\\\\.json"))
  setUp(HttpScenario().inject(heavisideUsers(5).during(3.seconds)))
    .protocols(protocol)
    .maxDuration(10.seconds)
}
`,
    );
  }

  if (line === '3.11') {
    writeFileSync(path.join(dest, 'src/gatling/resources/accounts.csv'), 'accountId\nACC-1\nACC-2\n');
    writeFileSync(
      path.join(dest, PKG, 'Legacy.scala'),
      `package org.galaxio.performance.myservice

import io.gatling.core.Predef._
import io.gatling.http.Predef._
import scala.concurrent.duration._

class Legacy extends Simulation {
  private val accounts = csv("accounts.csv").eager.random
  private val protocol = http.baseUrl("http://localhost:8080")
  private val scn = scenario("legacy")
    .feed(accounts)
    .exec(http("GET /#{accountId}").get("/").check(status is 200))
    .exec(stopInjector("done"))
  setUp(scn.inject(stressPeakUsers(5).during(3.seconds)))
    .protocols(protocol)
    .maxDuration(10.seconds)
}
`,
    );
    // No graphite seed: the stock gatling.conf already enables the writer and
    // ships the block, on every line. Appending a second copy would give the
    // agent two edit sites for one row and prove nothing extra.
  }
}

/** Throws rather than skipping. A seed that silently fails to land turns the
 *  assertion it exists for into a vacuous pass, which is worse than a crash. */
function edit(file, fn, { mustChange = false } = {}) {
  if (!existsSync(file)) throw new Error(`render produced no ${path.basename(file)}`);
  const before = readFileSync(file, 'utf8');
  const after = fn(before);
  if (mustChange && after === before) {
    throw new Error(`seed did not apply to ${path.basename(file)} — the template moved`);
  }
  writeFileSync(file, after);
}

export function compiles(dir) {
  try {
    execFileSync('./gradlew', ['gatlingClasses', '--console=plain', '-q'], {
      cwd: dir,
      stdio: 'ignore',
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * The other fixture kind, for a case that asks a question instead of editing.
 *
 * `render()` argues against a committed fixture because what the agent edits
 * has to still compile, and only the real template proves that. Neither half
 * applies here: an ask case is run with Edit and Write withheld and is never
 * compiled, so its whole input is the text of a build file. Writing that build
 * file outright is also the only way to get the two trees routing has to be
 * measured on and the template cannot render — one with no `org.galaxio` in it
 * at all (`GatlingPicatinnyVersion` is a required `--set`), and a Maven one
 * (the registry ships `gatling/scala-gradle`).
 *
 * Coordinates still come from `LINES`, so the two kinds cannot drift apart on
 * the numbers.
 */

const SIMULATION = `package org.galaxio.performance.myservice

import io.gatling.core.Predef._
import io.gatling.http.Predef._
import scala.concurrent.duration._

class HomeSimulation extends Simulation {
  private val protocol = http.baseUrl("http://localhost:8080")
  private val scn = scenario("home").exec(http("GET /").get("/").check(status is 200))
  setUp(scn.inject(atOnceUsers(1))).protocols(protocol).maxDuration(10.seconds)
}
`;

export function probe(line, dest, { galaxio = true, tool = 'gradle' } = {}) {
  const { gatling, plugin, picatinny } = LINES[line];
  rmSync(dest, { recursive: true, force: true });

  const sources = tool === 'maven' ? 'src/test/scala' : 'src/gatling/scala';
  const pkg = path.join(dest, sources, PACKAGE);
  mkdirSync(pkg, { recursive: true });
  writeFileSync(path.join(pkg, 'HomeSimulation.scala'), SIMULATION);

  const pinned = galaxio ? picatinny : null;
  const [buildFile, text] =
    tool === 'maven'
      ? ['pom.xml', pom(gatling, pinned)]
      : ['build.gradle', gradle(gatling, plugin, pinned)];
  writeFileSync(path.join(dest, buildFile), text);
  return dest;
}

function gradle(gatling, plugin, picatinny) {
  return `plugins {
    id 'scala'
    id 'io.gatling.gradle' version '${plugin}'
}

repositories {
    mavenCentral()
}

gatling {
    gatlingVersion = '${gatling}'
}
${
  picatinny
    ? `
dependencies {
    gatlingImplementation 'org.galaxio:gatling-picatinny_2.13:${picatinny}'
}
`
    : ''
}`;
}

/** Two numbers come back from this POM and only one of them is the line. */
function pom(gatling, picatinny) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0">
  <modelVersion>4.0.0</modelVersion>
  <groupId>org.galaxio.performance</groupId>
  <artifactId>perf</artifactId>
  <version>1.0-SNAPSHOT</version>

  <properties>
    <gatling.version>${gatling}</gatling.version>
  </properties>

  <dependencies>
    <dependency>
      <groupId>io.gatling.highcharts</groupId>
      <artifactId>gatling-charts-highcharts</artifactId>
      <version>\${gatling.version}</version>
      <scope>test</scope>
    </dependency>${
      picatinny
        ? `
    <dependency>
      <groupId>org.galaxio</groupId>
      <artifactId>gatling-picatinny_2.13</artifactId>
      <version>${picatinny}</version>
      <scope>test</scope>
    </dependency>`
        : ''
    }
  </dependencies>

  <build>
    <plugins>
      <plugin>
        <groupId>io.gatling</groupId>
        <artifactId>gatling-maven-plugin</artifactId>
        <version>${MAVEN_PLUGIN}</version>
      </plugin>
    </plugins>
  </build>
</project>
`;
}
