/* The deploy must stay gated on the check, and the two must stay connected.
 *
 * workers.yml fires on `workflow_run` for a workflow named "Validate". That is
 * a match on a STRING, not a reference — so renaming ci.yml's `name:` does not
 * break the deploy loudly, it detaches it. The trigger simply stops matching
 * anything, no run is created, no check goes red, and merges quietly stop
 * publishing. Nothing else in this repository can see that: ci.yml is still
 * valid and still green, and workers.yml is still valid and merely never runs.
 *
 * That failure has a history in this family. The shop site spent an hour in
 * exactly this state on 2026-08-22 — a real content change merged, nothing
 * published for eight minutes, no deployment recorded — which is why its own
 * tests pin the same shape. This is the cheaper version of that lesson.
 *
 * Deliberately asserts the two names AGAINST EACH OTHER rather than both
 * against the literal "Validate": the point is that they agree, and pinning the
 * literal would mean a deliberate rename has to be made in three places instead
 * of two, which is how a guard earns a reputation for being in the way. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => readFileSync(join(root, file), "utf8");

const CI = ".github/workflows/ci.yml";
const DEPLOY = ".github/workflows/workers.yml";

/** The `name:` a workflow declares, which is what workflow_run matches on. */
function workflowName(file) {
  const match = /^name: (.+)$/m.exec(read(file));
  assert.ok(match, `${file} declares no name`);
  return match[1].trim();
}

test("the deploy waits for the workflow the check actually declares", () => {
  const deploy = read(DEPLOY);
  const triggered = /workflows: \["([^"]+)"\]/.exec(deploy);
  assert.ok(triggered, "workers.yml does not trigger on a named workflow");
  assert.equal(
    triggered[1],
    workflowName(CI),
    "workers.yml waits for a workflow name ci.yml no longer declares, so merges would stop publishing silently",
  );
});

test("a failed or unchecked commit cannot publish", () => {
  const deploy = read(DEPLOY);
  assert.match(
    deploy,
    /if: github\.event_name == 'workflow_dispatch' \|\| github\.event\.workflow_run\.conclusion == 'success'/,
    "a failed or cancelled check run could publish",
  );
  /* And it must deploy the commit that was checked, not whatever main became
     while the deploy was queued. */
  assert.match(
    deploy,
    /ref: \$\{\{ github\.event\.workflow_run\.head_sha \|\| github\.ref \}\}/,
    "the deploy no longer pins the commit the check validated",
  );
  assert.match(deploy, /branches: \[main\]/, "only main publishes");
  assert.match(deploy, /workflow_dispatch:/, "the manual path must remain for when the check is down");
});

/* `pnpm deploy` is pnpm's own built-in command for deploying a workspace
   package. It is not this repo's deploy script, it exits successfully, and it
   publishes nothing — a deploy that reports success and ships nothing is the
   worst of the shapes this codebase keeps finding. */
test("the deploy step runs the script and not pnpm's built-in", () => {
  assert.match(
    read(DEPLOY),
    /run: pnpm run deploy$/m,
    "must be `pnpm run deploy`; bare `pnpm deploy` is pnpm's own command and would publish nothing",
  );
  const { scripts } = JSON.parse(read("package.json"));
  assert.ok(scripts.deploy, "package.json defines no deploy script for the workflow to run");
});

/* The guard that fails in ten seconds naming the missing variable, instead of
   several minutes later as a wrangler auth error that reads like a bad token. */
test("a missing credential fails early and says which one", () => {
  const deploy = read(DEPLOY);
  for (const name of ["CLOUDFLARE_API_TOKEN", "CLOUDFLARE_ACCOUNT_ID"]) {
    assert.match(
      deploy,
      new RegExp(`: "\\$\\{${name}:\\?[^"]+}"`),
      `${name} is not checked before the deploy that needs it`,
    );
  }
  assert.match(deploy, /environment: cloudflare-workers-production/, "the deploy must name its environment");
});
