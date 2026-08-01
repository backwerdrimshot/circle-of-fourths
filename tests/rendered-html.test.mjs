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
  assert.match(html, /Accidental numbers/);
  assert.match(html, /Keyboards/);
  assert.match(html, /BEADGCF order/);
  assert.match(html, /Xylophone/);
  assert.match(html, /Piano/);
  assert.match(html, /style="--angle:0deg"/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|Your site is taking shape/);
});

test("server-renders shared lesson state before hydration", async () => {
  const response = await render("/?direction=fifths&mode=poster&layers=minors,keyboards,accidental-order&instrument=piano");
  assert.equal(response.status, 200);
  const html = await response.text();

  assert.match(html, /Circle of fifths/i);
  assert.match(html, /F♯/);
  assert.match(html, /A minor/);
  assert.match(html, /Poster mode/);
  assert.match(html, /B E A D G C F/);
  assert.match(html, /C major scale on a one-octave piano/);
  assert.equal((html.match(/major scale on a one-octave piano/g) ?? []).length, 12);
  assert.match(html, /Two-octave practice piano with the C major scale highlighted/);
});

test("circle layers can be shown independently", async () => {
  const response = await render("/?mode=poster&layers=numbers");
  assert.equal(response.status, 200);
  const html = await response.text();

  assert.match(html, /aria-label="1 flat"/);
  assert.doesNotMatch(html, /class="key-signature/);
  assert.doesNotMatch(html, /major scale on a one-octave (?:xylophone|piano)/);
  assert.doesNotMatch(html, /B E A D G C F/);
});

test("xylophone is the default circle instrument", async () => {
  const response = await render("/?mode=poster&layers=keyboards");
  assert.equal(response.status, 200);
  const html = await response.text();

  assert.equal((html.match(/major scale on a one-octave xylophone/g) ?? []).length, 12);
  assert.match(html, /Two-octave practice xylophone with the C major scale highlighted/);
});
