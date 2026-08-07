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
import { chmodSync, existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const PKG = 'src/gatling/scala/org/galaxio/performance/myservice';

/** Coordinates per line, from gatling-versions/references. 3.9 takes Picatinny
 *  0.x, whose API differs; the higher lines take the 1.x column. */
export const LINES = {
  '3.9': { gatling: '3.9.5', plugin: '3.9.5.6', picatinny: '0.14.1' },
  '3.11': { gatling: '3.11.5', plugin: '3.11.5.2', picatinny: '1.10.4' },
  '3.13': { gatling: '3.13.5', plugin: '3.13.5.4', picatinny: '1.17.1' },
  '3.15': { gatling: '3.15.1', plugin: '3.15.1.2', picatinny: '1.25.0' },
};

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
  edit(path.join(dest, 'src/gatling/resources/simulation.conf'), (t) =>
    t.replace(/http:\/\/localhost"/g, 'http://localhost:8080"'),
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
    edit(path.join(dest, PKG, 'cases/HttpActions.scala'), (t) =>
      t.replace('http("GET /")', 'http("GET /${accountId}")'),
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

function edit(file, fn) {
  if (!existsSync(file)) return;
  writeFileSync(file, fn(readFileSync(file, 'utf8')));
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
