import assert from "node:assert/strict";
import test from "node:test";

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the classroom board", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  const html = await response.text();

  assert.match(html, /<title>Circle of Fourths — Classroom Board<\/title>/i);
  assert.match(html, /Start with one key\. Build the relationship\./);
  assert.match(html, /Fourth-first for band classrooms\./);
  assert.match(html, /aria-label="Board controls"/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|Your site is taking shape/);
});

test("server-renders shared lesson state before hydration", async () => {
  const response = await render("/?direction=fifths&mode=poster&layers=minors");
  assert.equal(response.status, 200);
  const html = await response.text();

  assert.match(html, /Circle of fifths/i);
  assert.match(html, /F♯/);
  assert.match(html, /A minor/);
  assert.match(html, /Poster mode/);
});
