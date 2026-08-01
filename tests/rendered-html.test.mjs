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
  assert.match(html, />Focus</);
  assert.match(html, />Quiz</);
  assert.match(html, /Layers <span>2<\/span>/);
  assert.match(html, />Reveal all</);
  assert.match(html, />Reset link</);
  assert.match(html, /Teaching board/);
  assert.match(html, />Present</);
  assert.match(html, /style="--angle:0deg"/);
  assert.doesNotMatch(html, /Ascending fourths/);
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
  assert.doesNotMatch(html, /is-role-marked/);
  assert.match(html, /lit = scale tone/);
});

test("scale-degree roles are optional and shareable", async () => {
  const response = await render("/?mode=poster&layers=keyboards&degrees=1,4,7");
  assert.equal(response.status, 200);
  const html = await response.text();

  assert.match(html, /marimba-legend shows-roles/);
  assert.match(html, /marked roles: 1 Tonic, 4 Subdominant, 7 Leading tone/);
  assert.match(html, /is-role-marked/);
});

test("legacy tonic links map to the tonic role", async () => {
  const response = await render("/?mode=poster&layers=keyboards&tonic=1");
  assert.equal(response.status, 200);
  const html = await response.text();

  assert.match(html, /Tonic/);
  assert.match(html, /is-role-marked/);
});

test("presentation state is server-rendered and shareable", async () => {
  const response = await render("/?mode=build&layers=signatures,numbers&present=1&revealed=c,f");
  assert.equal(response.status, 200);
  const html = await response.text();

  assert.match(html, /class="app-shell is-presenting"/);
  assert.match(html, /Exit presentation/);
  assert.match(html, /Progressive build/);
});

test("focus mode emphasizes the selected key and its two neighbors", async () => {
  const response = await render("/?mode=focus&layers=signatures,numbers");
  assert.equal(response.status, 200);
  const html = await response.text();

  assert.match(html, /Relationship focus/);
  assert.match(html, /Focus mode/);
  assert.match(html, /immediate fourths and fifths relationships/);
  assert.equal((html.match(/key-orbit-group is-dimmed/g) ?? []).length, 9);
  assert.match(html, /style="--angle:0deg"/);
});

test("quiz mode renders the accidental-count worksheet preset", async () => {
  const response = await render("/?mode=quiz");
  assert.equal(response.status, 200);
  const html = await response.text();

  assert.match(html, /Quiz Builder v0\.1/);
  assert.match(html, /How many accidentals\?/);
  assert.match(html, /Student worksheet/);
  assert.match(html, /Write the number and type of accidentals/);
  assert.equal((html.match(/quiz-count-blank/g) ?? []).length, 12);
  assert.match(html, /Name <i><\/i>/);
});

test("quiz answer preview reveals answers from the same configuration", async () => {
  const response = await render("/?mode=quiz&quiz=key-names&preview=answer");
  assert.equal(response.status, 200);
  const html = await response.text();

  assert.match(html, /Name that key/);
  assert.match(html, /Teacher answer key/);
  assert.match(html, /answer-key-stamp/);
  assert.match(html, /quiz-answer/);
  assert.match(html, /class="key-signature is-compact"/);
});

test("quiz scope and custom field roles are restored from the URL", async () => {
  const response = await render("/?mode=quiz&quiz=custom&scope=flats&roles=keyName:answer,numbers:given,signatures:omitted");
  assert.equal(response.status, 200);
  const html = await response.text();

  assert.match(html, /Custom circle activity/);
  assert.match(html, /Flat side/);
  assert.equal((html.match(/is-out-of-scope/g) ?? []).length, 5);
  assert.match(html, /quiz-key-name-blank/);
  assert.match(html, /class="accidental-count"/);
  assert.doesNotMatch(html, /class="key-signature/);
});
