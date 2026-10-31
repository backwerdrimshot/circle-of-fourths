/* The by-hand release must refuse what it should, deploy in order, and read the origin back.
 *
 * GitHub Actions does not run for this account (since 2026-09-30), so
 * scripts/release.mjs is the only thing standing between "merged" and "live"
 * and the only place the check, the deploy command and the live match are tied
 * together. These tests never deploy anything. */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { BUILD } from "../lib/build.mjs";
import { liveMatches, refusal, stampPattern } from "../scripts/release.mjs";

const pkg = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const release = await readFile(new URL("../scripts/release.mjs", import.meta.url), "utf8");

test("a hand release publishes only a clean origin/main", () => {
  const main = { head: "a1", target: "a1", ahead: 0, behind: 0 };
  assert.equal(refusal({ ...main, dirty: false }), null);
  assert.match(refusal({ ...main, dirty: true }), /no commit/);
  assert.match(refusal({ dirty: false, head: "b2", target: "a1", ahead: 1, behind: 0 }), /ahead of main/);
  assert.match(refusal({ dirty: false, head: "c3", target: "a1", ahead: 0, behind: 2 }), /behind main/);
  assert.match(refusal({ dirty: false, head: "d4", target: "a1", ahead: 1, behind: 1 }), /diverged/);
});

test("a hand release counts as live only when the manifest and the footer both show the build", () => {
  const want = { stamp: "2026-10-31" };
  const footer = (value) => `<p class="build-stamp">Build <!-- -->${value}</p>`;
  assert.equal(liveMatches({ version: "2026-10-31", page: footer("2026-10-31") }, want), true);
  // Without React's comment marker, in case the renderer stops emitting it.
  assert.equal(liveMatches({ version: "2026-10-31", page: '<p class="build-stamp">Build 2026-10-31</p>' }, want), true);
  assert.equal(liveMatches({ version: "2026-10-18.3", page: footer("2026-10-31") }, want), false, "old manifest");
  assert.equal(liveMatches({ version: "2026-10-31", page: footer("2026-10-18.3") }, want), false, "old footer");
  assert.equal(liveMatches({ version: "2026-10-31", page: "" }, want), false, "no page");
  assert.equal(liveMatches({ version: "unreachable", page: "" }, want), false);
});

test("a same-day suffix is not mistaken for the bare date", () => {
  assert.equal(stampPattern("2026-10-31").test('class="build-stamp">Build <!-- -->2026-10-31.2</p>'), false);
  assert.equal(stampPattern("2026-10-31").test('class="build-stamp">Build <!-- -->2026-10-310</p>'), false);
});

test("pnpm release runs the check, then pnpm run deploy, then reads the origin back", () => {
  assert.equal(pkg.scripts.release, "node scripts/release.mjs");
  const order = ["guard();", 'run("pnpm", ["check"]);', 'run("pnpm", ["run", "deploy"]);', "await verify();"]
    .map((step) => release.indexOf(step));
  assert.ok(order.every((at) => at > 0), "every release step must be present");
  assert.deepEqual([...order].sort((a, b) => a - b), order, "the steps must run in this order");
  assert.doesNotMatch(release, /run\("pnpm", \["deploy"\]\)/, "bare `pnpm deploy` is pnpm's own command and publishes nothing");
  assert.ok(pkg.scripts.deploy, "package.json defines no deploy script for the release to run");
});

test("the release checks the build lib/build.mjs states", () => {
  assert.match(BUILD, /^\d{4}-\d{2}-\d{2}(\.\d+)?$/);
  assert.match(release, /import \{ BUILD \} from "\.\.\/lib\/build\.mjs"/);
});
