/* What Circle of Fourths publishes about itself, derived rather than typed.

   THIS ADDS NO PLACE TO EDIT. The version already lives in package.json, and
   nothing else in this repository states it — the app renders no build stamp,
   so package.json is the single source rather than one of several. A committed
   capabilities.json would have made it two, which is the exact shape of the
   problem this file exists to solve: on 2026-09-04 four guide build stamps
   across the shop were found naming builds their apps had moved past, every
   one a hand-kept copy of somebody else's value.

   If this app ever renders its version to the user, that renderer must read
   package.json too. A second literal is how the drift starts.

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
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/** The version this app ships, read from the one place that states it. */
export async function version() {
  const pkg = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
  if (!pkg.version) throw new Error("package.json has no version");
  return pkg.version;
}

/** Identity, version, and where to reach the app and its guide — no more.
 *
 * Some siblings' manifests also carry a `privacy` block. This one does not:
 * those fields are a CLAIM, and publishing one that has not been checked
 * against what the app actually does is worse than leaving it out.
 *
 * The guide records this build as `v0.15.0`, with a leading v. The site's
 * comparison strips a leading v from either side, so `0.15.0` here matches.
 * Do not add a v to make them look alike — package.json is the source, and
 * decorating a copy of it is the habit this file is against. */
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
