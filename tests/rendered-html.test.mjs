import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
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
  assert.match(html, />Standard poster</);
  assert.match(html, /Layers <span>2<\/span>/);
  assert.match(html, />Reveal all</);
  assert.match(html, />Reset link</);
  assert.match(html, /Teaching board/);
  assert.match(html, />Present</);
  assert.match(html, /style="--angle:0deg"/);
  assert.doesNotMatch(html, /Ascending fourths/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|Your site is taking shape/);
});

/* The footer's route home, asserted on the SERVER-RENDERED html.
 *
 * This app shipped with a footer that carried two taglines and no links at all,
 * so a student who found the board had no way back to the guide for it. The
 * site's daily link audit checks exactly this, against the deployed page, and
 * had been failing on this app since 2026-09-02 — the only failing app of the
 * fifteen. Nothing here could have caught it: a link that is simply absent
 * passes every check that only looks at the links that are present.
 *
 * Asserted on the rendered bytes rather than the component, because that is
 * what the audit fetches and what a reader with JavaScript disabled receives.
 * The three URLs are the three the audit requires, spelled the way it matches
 * them — the shop, the catalog, and this app's own guide. */
/* The served page says which build it is.
 *
 * The shop site's daily link audit reads a build identifier out of every app's
 * HTML — that is how a merged-but-not-deployed app gets caught. This app served
 * nothing it could read, so the audit reported "1 app(s) serve no build
 * identifier", and could not tell a stale deploy here from a fresh one. It was
 * the only one of fifteen in that position; Drum Map's README records having
 * held it before and why it was worth leaving.
 *
 * Asserted on the rendered bytes and against package.json, because a stamp that
 * agrees with a constant in this file would prove nothing. The shape is the one
 * that site's reader documents as the one to adopt, and its pattern accepts
 * either attribute order, so this checks the fact rather than the spelling. */
test("the served page declares its build, and it is the package version", async () => {
  const { readFile } = await import("node:fs/promises");
  const pkg = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));

  const response = await render();
  assert.equal(response.status, 200);
  const html = await response.text();

  const meta = /<meta[^>]*\bname="build"[^>]*\bcontent="([^"]+)"|<meta[^>]*\bcontent="([^"]+)"[^>]*\bname="build"/i.exec(html);
  assert.ok(meta, "the page declares no build identifier");
  assert.equal(meta[1] ?? meta[2], pkg.version, "the declared build is not the package version");
});

test("the footer routes a visitor back to the shop, the catalog and the guide", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  const html = await response.text();

  assert.match(html, /href="https:\/\/backwerdrhythmshop\.com"/, "no link to the shop");
  assert.match(html, /href="https:\/\/apps\.backwerdrhythmshop\.com\/"/, "no link to the app catalog");
  assert.match(
    html,
    /href="https:\/\/guides\.backwerdrhythmshop\.com\/circle-of-fourths\/"/,
    "no link to this app's guide",
  );
});

test("server-renders shared lesson state before hydration", async () => {
  const response = await render("/?direction=fifths&mode=focus&layers=minors,keyboards,accidental-order&instrument=piano");
  assert.equal(response.status, 200);
  const html = await response.text();

  assert.match(html, /Circle of fifths/i);
  assert.match(html, /F♯/);
  assert.match(html, /A minor/);
  assert.match(html, /Relationship focus/);
  assert.match(html, /B E A D G C F/);
  assert.match(html, /C major scale on a one-octave piano/);
  assert.equal((html.match(/major scale on a one-octave piano/g) ?? []).length, 12);
  assert.match(html, /Two-octave practice piano with the C major scale highlighted/);
});

test("circle layers can be shown independently", async () => {
  const response = await render("/?mode=focus&layers=numbers");
  assert.equal(response.status, 200);
  const html = await response.text();

  assert.match(html, /aria-label="1 flat"/);
  assert.doesNotMatch(html, /class="key-signature/);
  assert.doesNotMatch(html, /major scale on a one-octave (?:xylophone|piano)/);
  assert.doesNotMatch(html, /B E A D G C F/);
});

test("xylophone is the default circle instrument", async () => {
  const response = await render("/?mode=focus&layers=keyboards");
  assert.equal(response.status, 200);
  const html = await response.text();

  assert.equal((html.match(/major scale on a one-octave xylophone/g) ?? []).length, 12);
  assert.match(html, /Two-octave practice xylophone with the C major scale highlighted/);
  assert.doesNotMatch(html, /is-role-marked/);
  assert.match(html, /lit = scale tone/);
});

test("scale-degree roles are optional and shareable", async () => {
  const response = await render("/?mode=focus&layers=keyboards&degrees=1,4,7");
  assert.equal(response.status, 200);
  const html = await response.text();

  assert.match(html, /marimba-legend shows-roles/);
  assert.match(html, /marked roles: 1 Tonic, 4 Subdominant, 7 Leading tone/);
  assert.match(html, /is-role-marked/);
});

test("legacy tonic links map to the tonic role", async () => {
  const response = await render("/?mode=focus&layers=keyboards&tonic=1");
  assert.equal(response.status, 200);
  const html = await response.text();

  assert.match(html, /Tonic/);
  assert.match(html, /is-role-marked/);
});

test("presentation state is server-rendered and shareable", async () => {
  const response = await render("/?mode=build&layers=signatures,numbers&present=1&revealed=c,f");
  assert.equal(response.status, 200);
  const html = await response.text();

  assert.match(html, /class="app-shell is-presenting /);
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

test("poster mode always renders the canonical classroom reference", async () => {
  const response = await render("/?direction=fifths&mode=poster&layers=numbers&instrument=piano&degrees=1,4,7&paper=tabloid");
  assert.equal(response.status, 200);
  const html = await response.text();

  assert.match(html, /Circle of Fourths/);
  assert.match(html, /Standard classroom poster/);
  assert.match(html, /Backwerd Rhythm Shop · Classroom Reference/);
  assert.match(html, /C starts at twelve o’clock/);
  assert.match(html, /No browser print settings required/);
  assert.match(html, /href="\/posters\/circle-of-fourths-11x17\.pdf"/);
  assert.doesNotMatch(html, /Print poster \/ Save PDF/);
  assert.match(html, /Poster paper size/);
  assert.match(html, /US Letter/);
  assert.match(html, /297 × 210 mm/);
  assert.match(html, /Classroom wall/);
  assert.match(html, /poster-size-tabloid/);
  assert.match(html, /size: 17in 11in/);
  assert.match(html, /Major key · accidental count/);
  assert.match(html, /Key signature · relative minor/);
  assert.match(html, /B E A D G C F/);
  assert.match(html, /Sharps reverse: F C G D A E B/);
  assert.equal((html.match(/major scale on a one-octave xylophone/g) ?? []).length, 12);
  assert.doesNotMatch(html, /major scale on a one-octave piano/);
  assert.doesNotMatch(html, /is-role-marked/);
  assert.doesNotMatch(html, /aria-label="Board controls"/);
  assert.doesNotMatch(html, /class="detail-panel/);
});

test("poster paper size defaults to US Letter and is shareable", async () => {
  const response = await render("/?mode=poster&paper=a4");
  assert.equal(response.status, 200);
  const html = await response.text();

  assert.match(html, /poster-size-a4/);
  assert.match(html, /size: 297mm 210mm/);
  assert.match(html, /Fourth-first for band classrooms/);
});

test("clean poster routes server-render each supported paper size", async () => {
  const [letterResponse, a4Response, tabloidResponse] = await Promise.all([
    render("/poster"),
    render("/poster/a4"),
    render("/poster/11x17"),
  ]);

  assert.equal(letterResponse.status, 200);
  assert.equal(a4Response.status, 200);
  assert.equal(tabloidResponse.status, 200);

  const [letterHtml, a4Html, tabloidHtml] = await Promise.all([
    letterResponse.text(),
    a4Response.text(),
    tabloidResponse.text(),
  ]);

  assert.match(letterHtml, /poster-size-letter/);
  assert.match(letterHtml, /size: 11in 8.5in/);
  assert.match(a4Html, /poster-size-a4/);
  assert.match(a4Html, /size: 297mm 210mm/);
  assert.match(tabloidHtml, /poster-size-tabloid/);
  assert.match(tabloidHtml, /size: 17in 11in/);
});

test("finished poster PDFs are packaged for every supported paper size", async () => {
  const filenames = [
    "circle-of-fourths-letter.pdf",
    "circle-of-fourths-a4.pdf",
    "circle-of-fourths-11x17.pdf",
  ];

  for (const filename of filenames) {
    const path = new URL(`../public/posters/${filename}`, import.meta.url);
    const [header, details] = await Promise.all([readFile(path).then((contents) => contents.subarray(0, 5).toString("ascii")), stat(path)]);
    assert.equal(header, "%PDF-");
    assert.ok(details.size > 200_000, `${filename} should contain the complete poster artwork`);
  }
});

test("custom teaching combinations remain editable outside poster mode", async () => {
  const response = await render("/?mode=focus&layers=signatures,numbers,minors,keyboards,accidental-order&degrees=1");
  assert.equal(response.status, 200);
  const html = await response.text();

  assert.doesNotMatch(html, /Classroom reference poster/);
  assert.doesNotMatch(html, /poster-reference-legend/);
  assert.match(html, /class="detail-panel/);
});
