#!/usr/bin/env node
/* Publish main by hand, with the gates the deploy workflow had.
 *
 *     pnpm release
 *     DEPLOY_ANYWAY=1 pnpm release   # skip the main/clean-tree guard, loudly
 *
 * WHY THIS EXISTS. On 2026-09-30 the account's GitHub Actions minutes ran out,
 * and they are not coming back. No workflow in this repository starts any more,
 * so a merge publishes nothing and a pull request shows no checks. Apps deploy
 * by hand (owner decision, 2026-10-31). A copy-only change that was merged and
 * deployed on that day shipped without a new build id because nothing in the
 * repository made a deploy carry one.
 *
 * So the guarantees of the retired workflow (.github/workflows/workers.yml)
 * move here, in the order it applied them:
 *
 *   1. The tree is exactly origin/main, fetched just now, with nothing
 *      uncommitted. The workflow deployed the commit its check validated; a
 *      hand deploy otherwise publishes whatever the checkout happens to hold.
 *   2. `pnpm check` passes on that tree: lint, typecheck, and test (which
 *      builds first). It is the same command the workflow ran.
 *   3. `pnpm run deploy`, with CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID
 *      from the environment (or a `wrangler login`); credentials are never
 *      kept in the repository. It is `pnpm run deploy` and not `pnpm deploy`,
 *      because the latter is pnpm's own built-in command for deploying a
 *      workspace package: it would not run this repo's script and would
 *      publish nothing. The script runs `vinext deploy`, from the lockfile
 *      rather than an unpinned `npx wrangler`.
 *   4. The live origin answers with this build: /capabilities.json names the
 *      build in lib/build.mjs, and the page served at / shows it in the footer
 *      stamp. Not "the upload succeeded": what a visitor gets.
 *
 * Step 4 is the one the workflow never had. */
import { execFileSync, spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { BUILD } from "../lib/build.mjs";

export const ORIGIN = "https://circle-of-fourths.backwerdrhythmshop.com/";

/** Why this tree must not be published, or null when it may be. */
export function refusal({ dirty, head, target, ahead, behind }) {
  if (dirty) return "the working tree has changes that are in no commit.";
  if (head === target) return null;
  if (ahead > 0 && behind > 0) return `this branch has diverged from main (${ahead} ahead, ${behind} behind).`;
  if (behind > 0) return `this branch is ${behind} commit(s) behind main; publishing it would take live work offline.`;
  return `this branch is ${ahead} commit(s) ahead of main: work main does not have.`;
}

/** The footer stamp as server-rendered: React puts a comment between "Build " and the value. */
export function stampPattern(stamp) {
  const escaped = stamp.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`class="build-stamp">Build (?:<!-- -->)?${escaped}</p>`);
}

/** Whether the live origin is serving this build: the manifest names it and the page shows it. */
export function liveMatches({ version, page }, { stamp }) {
  return version === stamp && stampPattern(stamp).test(page);
}

const root = new URL("../", import.meta.url);
const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();

function run(command, args) {
  console.log(`\n$ ${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, { cwd: root, stdio: "inherit" });
  if (result.status !== 0) {
    console.error(`\nRelease stopped: ${command} ${args.join(" ")} failed. Nothing further was published.`);
    process.exit(result.status ?? 1);
  }
}

function guard() {
  if (process.env.DEPLOY_ANYWAY === "1") {
    console.warn("\n  ****  DEPLOY_ANYWAY=1: publishing this tree whether or not it is main  ****\n");
    return;
  }
  const dirty = git("status", "--porcelain") !== "";
  git("fetch", "--quiet", "origin", "main");
  const head = git("rev-parse", "HEAD");
  const target = git("rev-parse", "origin/main");
  const ahead = Number(git("rev-list", "--count", `${target}..${head}`));
  const behind = Number(git("rev-list", "--count", `${head}..${target}`));
  const reason = refusal({ dirty, head, target, ahead, behind });
  if (reason) {
    console.error(`\nRefusing to release: ${reason}`);
    console.error("Release what main says:  git checkout --detach origin/main && pnpm release\n");
    process.exit(1);
  }
  console.log(`release guard  ok: origin/main at ${head.slice(0, 12)}, tree clean`);
}

async function live() {
  const bust = `?release=${Date.now()}`;
  const [capabilities, page] = await Promise.all([
    fetch(new URL(`capabilities.json${bust}`, ORIGIN), { cache: "no-store" }).then((r) => r.json()),
    fetch(new URL(bust, ORIGIN), { cache: "no-store" }).then((r) => r.text()),
  ]);
  return { version: capabilities.version, page };
}

async function verify() {
  // The edge takes a few seconds to agree with itself after a deploy.
  for (let attempt = 1; attempt <= 12; attempt++) {
    const served = await live().catch(() => ({ version: "unreachable", page: "" }));
    if (liveMatches(served, { stamp: BUILD })) {
      console.log(`\nLive: ${ORIGIN} serves build ${BUILD} (manifest and footer).`);
      return;
    }
    const shown = served.page.match(/class="build-stamp">Build (?:<!-- -->)?([^<]+)</)?.[1] ?? "none";
    console.log(`  waiting for the edge (${attempt}/12): manifest ${served.version}, footer ${shown}, want ${BUILD}`);
    await new Promise((resolve) => setTimeout(resolve, 10_000));
  }
  console.error(`\nThe deploy finished but ${ORIGIN} is not serving build ${BUILD} after two minutes. Check the live footer.`);
  process.exit(1);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  guard();
  run("pnpm", ["check"]);
  run("pnpm", ["run", "deploy"]);
  await verify();
}
