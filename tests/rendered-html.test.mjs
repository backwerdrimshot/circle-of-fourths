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

function markup(html) {
  // Quiz answers belong in the client model; they must not leak into visible or
  // accessible worksheet markup. Ignore hydration payloads when checking that.
  return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, "");
}

function keyboardSvgs(html) {
  return markup(html).match(/<svg\b(?=[^>]*data-keyboard-instrument=)[\s\S]*?<\/svg>/g) ?? [];
}

function highlightedMidis(svg) {
  return (svg.match(/<rect\b[^>]*data-scale-tone="true"[^>]*>/g) ?? [])
    .map((bar) => Number(bar.match(/data-midi="(\d+)"/)[1]))
    .sort((a, b) => a - b);
}

function visibleMidis(svg) {
  return [...svg.matchAll(/data-midi="(\d+)"/g)]
    .map((match) => Number(match[1]))
    .sort((a, b) => a - b);
}

function assertCompactKeyboard(svg) {
  const midis = visibleMidis(svg);
  assert.ok(midis.length >= 18 && midis.length <= 20, "about one and a half octaves remain visible");
  assert.deepEqual(midis, Array.from({ length: midis.length }, (_, index) => midis[0] + index), "every intervening physical semitone remains visible exactly once");
  assert.ok(midis[0] >= 72 && midis.at(-1) <= 96, "the window stays within the canonical C5–C7 instrument");
  const naturalPitchClasses = [0, 2, 4, 5, 7, 9, 11];
  assert.ok(naturalPitchClasses.includes(midis[0] % 12) && naturalPitchClasses.includes(midis.at(-1) % 12), "both ends retain complete natural bars");
  const highlighted = highlightedMidis(svg);
  assert.equal(highlighted.length, 8);
  assert.equal(highlighted.at(-1) - highlighted[0], 12);
  const tonics = (svg.match(/<rect\b[^>]*data-tonic="true"[^>]*>/g) ?? [])
    .map((bar) => Number(bar.match(/data-midi="(\d+)"/)[1]))
    .sort((a, b) => a - b);
  assert.deepEqual(tonics, [highlighted[0], highlighted.at(-1)], "the starting and ending tonic remain outlined");
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
  assert.match(html, /Layers <span>3<\/span>/);
  assert.equal(keyboardSvgs(html).length, 2, "the revealed C and selected-key practice diagram are visible by default");
  assert.match(html, />Reveal all</);
  assert.match(html, />Reset link</);
  assert.match(html, /Teaching board/);
  assert.match(html, />Present</);
  assert.match(html, /style="--angle:0deg"/);
  assert.doesNotMatch(html, /Ascending fourths/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|Your site is taking shape/);
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
  assert.match(html, /C major scale on a compact piano spanning about one and a half octaves/);
  assert.equal(keyboardSvgs(html).length, 13);
  assert.ok(keyboardSvgs(html).every((svg) => svg.includes('data-keyboard-instrument="piano"')));
  keyboardSvgs(html).forEach(assertCompactKeyboard);
});

test("circle layers can be shown independently", async () => {
  const response = await render("/?mode=focus&layers=numbers");
  assert.equal(response.status, 200);
  const html = await response.text();

  assert.match(html, /aria-label="1 flat"/);
  assert.doesNotMatch(markup(html), /data-glyph=/);
  assert.equal(keyboardSvgs(html).length, 0);
  assert.doesNotMatch(html, /B E A D G C F/);
});

test("xylophone is the default circle instrument", async () => {
  const response = await render("/?mode=focus&layers=keyboards");
  assert.equal(response.status, 200);
  const html = await response.text();

  const keyboards = keyboardSvgs(html);
  assert.equal(keyboards.length, 13);
  for (const svg of keyboards) {
    assert.match(svg, /data-keyboard-instrument="xylophone"/);
    assertCompactKeyboard(svg);
    assert.doesNotMatch(svg, /data-role-marked="true"/);
  }
  assert.match(markup(html).replace(/<!--[\s\S]*?-->/g, ""), /About 1½ octaves of bars/);
  const cKeyboard = keyboards.find((svg) => svg.includes('aria-label="C major scale'));
  const bKeyboard = keyboards.find((svg) => svg.includes('aria-label="B major scale'));
  assert.ok(cKeyboard && bKeyboard);
  assert.notDeepEqual(visibleMidis(cKeyboard), visibleMidis(bKeyboard), "C and B adapt their displayed bounds to their different scale ranges");
  assert.deepEqual(highlightedMidis(keyboards.at(-1)), [72, 74, 76, 77, 79, 81, 83, 84]);
});

test("scale-degree roles are optional and shareable", async () => {
  const response = await render("/?mode=focus&layers=keyboards&degrees=1,4,7");
  assert.equal(response.status, 200);
  const html = await response.text();

  assert.match(html, /class="role-summary"/);
  assert.match(html, /numbered gold badges mark scale degrees 1, 4, 7/);
  for (const svg of keyboardSvgs(html)) {
    assert.equal((svg.match(/data-role-marked="true"/g) ?? []).length, 4, "both tonics and degrees four and seven are marked");
  }
});

test("legacy tonic links map to the tonic role", async () => {
  const response = await render("/?mode=focus&layers=keyboards&tonic=1");
  assert.equal(response.status, 200);
  const html = await response.text();

  assert.match(html, /Tonic/);
  for (const svg of keyboardSvgs(html)) {
    assert.equal((svg.match(/data-role-marked="true"/g) ?? []).length, 2);
  }
});

test("shared selected key, spelling, and relative-minor state render before hydration", async () => {
  const response = await render("/?mode=focus&key=db&scale=minor&spellings=db:cs&layers=signatures,numbers,keyboards,minors&degrees=7");
  assert.equal(response.status, 200);
  const html = markup(await response.text());

  assert.match(html, /<h2>A♯ minor<\/h2>/);
  assert.match(html, /A♯ natural minor scale on a compact xylophone spanning about one and a half octaves/);
  assert.match(html, /C♯ major/);
  assert.match(html, /Subtonic/);
  assert.doesNotMatch(html, /Leading tone/);
  assert.equal((html.match(/key-orbit-group is-dimmed/g) ?? []).length, 9);
  const selectedKeyboard = keyboardSvgs(html).at(-1);
  keyboardSvgs(html).forEach(assertCompactKeyboard);
  assert.match(selectedKeyboard, /data-scale-mode="minor"/);
  assert.deepEqual(highlightedMidis(selectedKeyboard), [82, 84, 85, 87, 89, 90, 92, 94]);
  for (const note of ["A♯", "B♯", "C♯", "D♯", "E♯", "F♯", "G♯"]) assert.ok(selectedKeyboard.includes(note));
  assert.equal((selectedKeyboard.match(/data-role-marked="true"/g) ?? []).length, 1);
});

test("E major opens its correctly spelled C-sharp natural minor", async () => {
  const response = await render("/?mode=focus&key=e&scale=minor&layers=keyboards");
  assert.equal(response.status, 200);
  const html = markup(await response.text());

  assert.match(html, /<h2>C♯ minor<\/h2>/);
  const keyboard = keyboardSvgs(html).at(-1);
  assert.deepEqual(highlightedMidis(keyboard), [73, 75, 76, 78, 80, 81, 83, 85]);
  assert.equal((keyboard.match(/data-tonic="true"/g) ?? []).length, 2);
});

test("invalid lesson parameters are rejected and valid first spelling overrides survive", async () => {
  const params = new URLSearchParams({
    mode: "focus",
    key: "__proto__",
    scale: "harmonic",
    layers: "keyboards,keyboards,unknown",
    degrees: "1,1,7,0,8,nope",
    spellings: "__proto__:cs,constructor:fs,toString:cb,db:invalid,db:cs,db:db,gb-fs:fs:extra,gb-fs:fs,b:constructor",
  });
  params.append("key", "db");
  const response = await render(`/?${params}`);
  assert.equal(response.status, 200);
  const html = markup(await response.text());

  assert.match(html, /<h2>C major<\/h2>/);
  assert.match(html, /Layers <span>1<\/span>/);
  const keyboards = keyboardSvgs(html);
  assert.equal(keyboards.length, 13);
  assert.ok(keyboards.every((svg) => svg.includes('data-scale-mode="major"')));
  assert.ok(keyboards.some((svg) => svg.includes("C♯ major scale")), "the first valid spelling for D-flat's position wins");
  assert.ok(keyboards.some((svg) => svg.includes("F♯ major scale")));
  assert.ok(keyboards.some((svg) => svg.includes("B major scale")));
  assert.ok(!keyboards.some((svg) => svg.includes("D♭ major scale") || svg.includes("C♭ major scale")));
  assert.equal((keyboards.at(-1).match(/data-role-marked="true"/g) ?? []).length, 3, "duplicate and out-of-range degrees are ignored");
});

test("an explicitly empty layer list stays empty", async () => {
  const response = await render("/?mode=focus&key=g&layers=");
  assert.equal(response.status, 200);
  const html = markup(await response.text());

  assert.match(html, /<h2>G major<\/h2>/);
  assert.match(html, /Layers <span>0<\/span>/);
  assert.equal(keyboardSvgs(html).length, 0);
  assert.doesNotMatch(html, /data-glyph=|class="accidental-count"/);
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
  assert.equal((markup(html).match(/data-glyph="trebleClef"/g) ?? []).length, 12);
});

test("student signature quizzes engrave seven accidentals without exposing key-name answers", async () => {
  const response = await render("/?mode=quiz&quiz=key-names&key=db&scale=minor&spellings=db:cs,gb-fs:fs,b:cb");
  assert.equal(response.status, 200);
  const html = markup(await response.text());
  const board = html.slice(html.indexOf('<section class="lesson-board"'));
  const signatures = (board.match(/<svg\b[\s\S]*?<\/svg>/g) ?? [])
    .filter((svg) => svg.includes('data-glyph="trebleClef"'));

  assert.equal((board.match(/quiz-key-name-blank/g) ?? []).length, 12);
  assert.equal(signatures.length, 12);
  assert.equal((board.match(/data-glyph="trebleClef"/g) ?? []).length, 12);
  const sevenSharps = signatures.find((svg) => (svg.match(/data-glyph="sharp"/g) ?? []).length === 7);
  const sevenFlats = signatures.find((svg) => (svg.match(/data-glyph="flat"/g) ?? []).length === 7);
  assert.ok(sevenSharps, "C-sharp's seven-sharp signature is present");
  assert.ok(sevenFlats, "C-flat's seven-flat signature is present");
  assert.deepEqual([...sevenSharps.matchAll(/data-glyph="sharp"[^>]*data-staff-step="(\d+)"/g)].map((match) => Number(match[1])), [8, 5, 9, 6, 3, 7, 4]);
  assert.deepEqual([...sevenFlats.matchAll(/data-glyph="flat"[^>]*data-staff-step="(\d+)"/g)].map((match) => Number(match[1])), [4, 7, 3, 6, 2, 5, 1]);
  assert.doesNotMatch(board, /<span class="orbit-layer notation-node"[^>]*aria-hidden="true"/, "given signature descriptions remain accessible");
  const coreLabels = [...board.matchAll(/<button\b[^>]*aria-label="(Quiz position[^"]+)"/g)].map((match) => match[1]);
  assert.equal(coreLabels.length, 12);
  assert.ok(coreLabels.every((label) => /^Quiz position \d+; Blank for major key name$/.test(label)), "student labels identify blanks without naming the answer");
  assert.doesNotMatch(board, /class="key-name|C♯ major|C♭ major|A♯ minor|A♭ minor|data-keyboard-instrument|class="detail-panel/);
});

test("student accidental-count quizzes keep counts out of the worksheet markup", async () => {
  const response = await render("/?mode=quiz&spellings=db:cs,b:cb");
  assert.equal(response.status, 200);
  const html = markup(await response.text());
  const board = html.slice(html.indexOf('<section class="lesson-board"'));

  assert.equal((board.match(/quiz-count-blank/g) ?? []).length, 12);
  assert.match(board, /C♯/);
  assert.match(board, /C♭/);
  const coreLabels = [...board.matchAll(/<button\b[^>]*aria-label="(Quiz position[^"]+)"/g)].map((match) => match[1]);
  assert.equal(coreLabels.length, 12);
  assert.ok(coreLabels.every((label) => /; [A-G][♭♯]? major; Blank for accidental count$/.test(label)), "given names are spoken while count answers remain blank");
  assert.ok(coreLabels.every((label) => !/\d+ (?:sharp|flat)|No accidentals/.test(label)));
  assert.doesNotMatch(board, /class="accidental-count"|aria-label="\d+ (?:sharps|flats)|data-glyph=|class="detail-panel/);
});

test("the ready-made flat-side activity restores fourths and all seven flat signatures", async () => {
  const response = await render("/?mode=quiz&quiz=flat-side&direction=fifths&scope=sharps&spellings=db:cs,gb-fs:fs,b:b");
  assert.equal(response.status, 200);
  const html = markup(await response.text());
  const board = html.slice(html.indexOf('<section class="lesson-board"'));
  assert.match(board, /aria-label="Circle of fourths"/);
  assert.equal((board.match(/is-out-of-scope/g) ?? []).length, 4);
  assert.match(board, /aria-label="Quiz position 1; C major; No accidentals"/);
  for (let count = 1; count <= 7; count += 1) {
    assert.ok(board.includes(`aria-label="Quiz position ${count + 1}; Blank for major key name; ${count} flat${count === 1 ? "" : "s"}"`));
  }
  const excludedGroups = board.match(/<div class="key-orbit-group[^"]*is-out-of-scope"[^>]*>/g) ?? [];
  assert.equal(excludedGroups.length, 4);
  assert.ok(excludedGroups.every((group) => group.includes('aria-hidden="true"')));
  assert.doesNotMatch(board, /C♯ major|F♯ major|C♭ major/, "the supplied counts never announce hidden key-name answers");
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
  assert.doesNotMatch(markup(html), /data-glyph=/);
});

test("poster mode always renders the canonical classroom reference", async () => {
  const response = await render("/?direction=fifths&mode=poster&layers=numbers&instrument=piano&degrees=1,4,7&paper=tabloid&key=db&scale=minor&spellings=db:cs,b:cb");
  assert.equal(response.status, 200);
  const html = await response.text();

  assert.match(html, /Circle of Fourths/);
  assert.match(html, /Standard classroom poster/);
  assert.match(html, /Backwerd Rhythm Shop · Classroom Reference/i);
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
  assert.match(html, /Outline = tonic \(home note\)/);
  assert.match(html, /Staff = major key \+ relative minor/);
  assert.match(html, /B E A D G C F/);
  assert.match(html, /Sharps: F C G D A E B/);
  const diagrams = markup(html).match(/<g\b(?=[^>]*role="img")(?=[^>]*aria-label="[^"]*major scale on a xylophone; about one and a half octaves shown)[\s\S]*?<\/g>/g) ?? [];
  assert.equal(diagrams.length, 12);
  diagrams.forEach(assertCompactKeyboard);
  assert.ok(new Set(diagrams.map((diagram) => visibleMidis(diagram).join(","))).size > 1, "poster scales use adapted keyboard windows");
  assert.doesNotMatch(markup(html), /scale on a two-octave|scale on a compact piano/);
  assert.doesNotMatch(html, /is-role-marked/);
  assert.doesNotMatch(html, /aria-label="Board controls"/);
  assert.doesNotMatch(html, /class="detail-panel/);
  assert.doesNotMatch(markup(html), /data-scale-mode="minor"/);
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
