/* What Circle of Fourths publishes about itself, derived rather than typed.

   THIS ADDS NO PLACE TO EDIT. The build already lives in lib/build.mjs, and
   nothing else in this repository states it — the app renders no build stamp,
   so lib/build.mjs is the single source rather than one of several. A committed
   capabilities.json would have made it two, which is the exact shape of the
   problem this file exists to solve: on 2026-09-04 four guide build stamps
   across the shop were found naming builds their apps had moved past, every
   one a hand-kept copy of somebody else's value.

   If this app ever renders its build to the user, that renderer must read
   lib/build.mjs too. A second literal is how the drift starts.

   WHY IT IS WRITTEN INTO public/ RATHER THAN dist/client. This app is deployed
   by the Cloudflare Workers Git integration, configured in the dashboard
   rather than in this repository — so which directory is served is not a fact
   this repo states, and a file written into a guessed output path could answer
   404 in production while every check here stayed green. Vite copies public/
   into the client output wherever that output goes. The generated file is
   gitignored: derived, not committed.

   WHY PUBLISH IT AT ALL. The shop site audits whether each guide still names
   the build its app is serving, and it can only ask an app that answers.
   Circle of Fourths was the last app in the uncovered list — its guide says
   `v0.15.0` and nothing outside this repository could check that. An
   unverifiable stamp can be wrong for as long as nobody looks by hand, which
   is how Drum Map's was eventually found. */
import { writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { BUILD } from "../lib/build.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/** The build this app ships, read from the one place that states it. */
export async function version() {
  if (!/^\d{4}-\d{2}-\d{2}(\.\d+)?$/.test(BUILD)) throw new Error(`lib/build.mjs BUILD is not a date build: ${BUILD}`);
  return BUILD;
}

/** Identity, build, and where to reach the app and its guide — no more.
 *
 * Some siblings' manifests also carry a `privacy` block. This one does not:
 * those fields are a CLAIM, and publishing one that has not been checked
 * against what the app actually does is worse than leaving it out.
 *
 * The guide records this build as a date, exactly as published here. Do not
 * decorate a copy of it to make two places look alike — lib/build.mjs is the
 * source, and decorating a copy is the habit this file is against. */
export const capabilities = (v) => ({
  schemaVersion: "praxis-capabilities/v1",
  app: "circle-of-fourths",
  title: "Circle of Fourths",
  version: v,
  launchUrl: "https://circle-of-fourths.backwerdrhythmshop.com/",
  guideUrl: "https://guides.backwerdrhythmshop.com/circle-of-fourths/",
});

export async function publish() {
  const v = await version();
  await writeFile(
    join(root, "public", "capabilities.json"),
    JSON.stringify(capabilities(v), null, 2) + "\n",
  );
  return v;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log(`Published capabilities.json for version ${await publish()}`);
}
