/* What CI runs must stay the repo's own definition of good.
 *
 * The workflow's step is `pnpm check` rather than a spelled-out list, so that
 * there is one definition and not two. This pins that arrangement: `check` has
 * to keep invoking all three, and the workflow has to keep invoking `check`.
 *
 * The failure it is aimed at is narrowing, which is what actually happens. A
 * step goes slow or flaky, someone drops `typecheck` from `check` or replaces
 * the workflow's `pnpm check` with `pnpm test`, and every pull request after
 * that shows the same green tick for less work. Nothing else here would notice
 * — the check run keeps its name, branch protection keeps passing, and the
 * suite that would catch it is the suite being skipped.
 *
 * WHAT THIS CANNOT DO, stated because a guard that overclaims is the thing this
 * codebase keeps tripping over: delete .github/workflows/ci.yml outright and
 * this test does not fail, it stops running. Nothing inside a repository can
 * catch its own CI being removed — that needs a required check configured on
 * the branch, which lives in GitHub's settings. The file-missing assertion
 * below is honest about its own scope: it fires when the file is renamed or
 * moved while the workflow still exists under another name, not when CI is
 * turned off. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => readFileSync(join(root, file), "utf8");

test("check runs every check this repo defines", () => {
  const { scripts } = JSON.parse(read("package.json"));
  assert.ok(scripts.check, "package.json defines no check script");
  for (const step of ["lint", "typecheck", "test"]) {
    assert.ok(scripts[step], `package.json defines no ${step} script`);
    assert.match(
      scripts.check,
      new RegExp(`\\b${step}\\b`),
      `check no longer runs ${step}; CI would go green without it`,
    );
  }
});

test("CI runs check rather than a second copy of the list", () => {
  let workflow;
  try {
    workflow = read(".github/workflows/ci.yml");
  } catch {
    assert.fail(".github/workflows/ci.yml is gone; nothing runs these tests on a pull request");
  }
  assert.match(workflow, /run: pnpm check$/m, "the workflow must invoke the repo's own check");
  /* A pull request is the only moment this is worth anything — a check that
     runs on main alone reports a break after it is merged. */
  assert.match(workflow, /^on:\n(?:.*\n)*?\s*pull_request:/m, "CI must run on pull requests");
  assert.match(workflow, /branches: \[main\]/, "CI must also run on main");
});
