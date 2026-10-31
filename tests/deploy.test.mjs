/* The by-hand release path must stay what the README documents.
 *
 * This file used to pin .github/workflows/workers.yml: that its `workflow_run`
 * trigger named the same workflow as ci.yml, that a failed check could not
 * publish, and that its deploy step and credential guard were intact. GitHub
 * Actions minutes ran out on 2026-09-30 and are not coming back, so that
 * workflow never ran, and the owner had it removed on 2026-10-31. Every
 * assertion that inspected it went with it.
 *
 * What remains true, and what a reader would otherwise find out only by
 * running a deploy: `pnpm release` exists, `scripts/release.mjs` still exports
 * the pieces the README describes, and the commands the README tells a person
 * to run are still defined in package.json. tests/release.test.mjs covers the
 * guard, the live match and the step order; this file covers the documentation
 * agreeing with the scripts. These tests never deploy anything. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as release from "../scripts/release.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => readFileSync(join(root, file), "utf8");
const { scripts } = JSON.parse(read("package.json"));
const readme = read("README.md");

test("the release script exists and exports what the README describes", () => {
  assert.ok(existsSync(join(root, "scripts/release.mjs")), "scripts/release.mjs is missing");
  assert.equal(typeof release.refusal, "function", "the main/clean-tree guard is no longer exported");
  assert.equal(typeof release.liveMatches, "function", "the live-origin check is no longer exported");
  assert.equal(typeof release.stampPattern, "function", "the footer-stamp matcher is no longer exported");
  assert.match(release.ORIGIN, /^https:\/\/circle-of-fourths\./, "the origin the release reads back changed");
});

test("every deploy command the README names is defined in package.json", () => {
  for (const name of ["release", "deploy", "deploy:dry-run", "check"]) {
    assert.ok(scripts[name], `package.json defines no ${name} script, but the README's Deploying section relies on it`);
    assert.ok(
      readme.includes(`pnpm ${name === "deploy" ? "run deploy" : name}`),
      `the README no longer mentions \`pnpm ${name}\``,
    );
  }
  assert.ok(readme.includes("DEPLOY_ANYWAY=1"), "the README no longer documents the DEPLOY_ANYWAY escape hatch");
  assert.match(read("scripts/release.mjs"), /DEPLOY_ANYWAY/, "the release script no longer honors DEPLOY_ANYWAY");
});

/* `pnpm deploy` is pnpm's own built-in command for deploying a workspace
   package. It is not this repo's deploy script, it exits successfully, and it
   publishes nothing. The README tells people to use `pnpm run deploy`. */
test("the README warns off pnpm's built-in deploy", () => {
  assert.match(readme, /`pnpm run deploy` \(not `pnpm deploy`/, "the README no longer says `pnpm run deploy`, not `pnpm deploy`");
});
