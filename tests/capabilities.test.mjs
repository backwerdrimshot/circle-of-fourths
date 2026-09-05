/* The published manifest must agree with the one place that states the version.
 *
 * This file is what the shop site's guide-build audit reads to decide whether
 * the Circle of Fourths guide still names the build the app is serving. If it
 * drifts from package.json, the audit starts reporting agreement between two
 * copies of a stale number instead of catching it — worse than publishing
 * nothing, because it looks checked.
 *
 * `pnpm test` runs `pnpm build` first, which regenerates the file, so this
 * reads the artifact a deploy would actually ship rather than a leftover. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { capabilities, version } from "../scripts/capabilities.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = async (f) => JSON.parse(await readFile(join(root, f), "utf8"));

test("the built manifest carries the version package.json states", async () => {
  const built = await read("public/capabilities.json");
  const pkg = await read("package.json");
  assert.equal(built.version, pkg.version);
  assert.equal(built.version, await version());
});

test("the manifest has the shape the shop's audit reads", async () => {
  const built = await read("public/capabilities.json");
  assert.equal(built.schemaVersion, "praxis-capabilities/v1");
  assert.equal(built.app, "circle-of-fourths");
  assert.equal(built.title, "Circle of Fourths");
  assert.match(built.launchUrl, /^https:\/\/circle-of-fourths\.backwerdrhythmshop\.com\/$/);
  assert.match(built.guideUrl, /^https:\/\/guides\.backwerdrhythmshop\.com\/circle-of-fourths\/$/);
});

/* No `privacy` block, deliberately. Those fields are a claim about behaviour,
   and an unchecked claim at a public URL is worse than an absent field. Adding
   one means checking it against the app first. */
test("it claims nothing it has not been checked against", async () => {
  const built = await read("public/capabilities.json");
  assert.equal(built.privacy, undefined);
  assert.deepEqual(Object.keys(built).sort(), Object.keys(capabilities("x")).sort());
});
