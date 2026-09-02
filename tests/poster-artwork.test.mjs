import assert from "node:assert/strict";
import test from "node:test";
import { getTraversal, getPosterPositions } from "../lib/music-model.mjs";
import { createPosterSvg, keySignatureLayout, posterGeometry, POSTER_PAPERS, scaleNoteNames, scaleOctave } from "../lib/poster-artwork.mjs";
import instrument from "../lib/xylophone-two-octaves.json" with { type: "json" };
import notationGlyphs from "../lib/notation-glyphs.json" with { type: "json" };

test("poster cards stay inside the artwork and clear of every other card", () => {
  for (const size of Object.keys(POSTER_PAPERS)) {
    const g = posterGeometry(size);
    const boxes = g.nodes.flatMap((node) => ["core", "notation", "keyboard"].map((band) => ({ ...node[band], label: `${node.key.label} ${band}` })));
    for (const [i, a] of boxes.entries()) {
      assert.ok(a.x >= 50 && a.x + a.width <= g.width - 50, `${size}: ${a.label} horizontal bounds`);
      assert.ok(a.y >= 143 && a.y + a.height <= g.height - 96, `${size}: ${a.label} header/footer clearance`);
      for (const b of boxes.slice(i + 1)) {
        const dx = Math.max(a.x - b.x - b.width, b.x - a.x - a.width);
        const dy = Math.max(a.y - b.y - b.height, b.y - a.y - a.height);
        assert.ok(Math.max(dx, dy) >= 4, `${size}: ${a.label} and ${b.label} need a visible gutter`);
      }
    }
  }
});

test("every printed scale spells one of each letter and matches its highlighted pitches", () => {
  const naturals = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  for (const key of getPosterPositions().flatMap((position) => position.spellings)) {
    const names = scaleNoteNames(key);
    assert.equal(new Set(names.map((note) => note[0])).size, 7);
    assert.deepEqual(names.map((note) => (naturals[note[0]] + (note.includes("♭") ? -1 : note.includes("♯") ? 1 : 0) + 12) % 12), key.scalePitchClasses);
  }
  assert.deepEqual(scaleNoteNames(getTraversal("fourths")[6]), ["G♭", "A♭", "B♭", "C♭", "D♭", "E♭", "F"]);
});

test("each scale highlights exactly one ascending tonic-to-tonic octave within the two-octave instrument", () => {
  for (const key of getPosterPositions().flatMap((position) => position.spellings)) {
    const { notes, midis } = scaleOctave(key);
    assert.equal(notes.length, 8);
    assert.equal(notes[0], notes.at(-1));
    assert.equal(new Set(midis).size, 8);
    assert.equal(midis.at(-1) - midis[0], 12);
    assert.deepEqual(midis.slice(1).map((midi, i) => midi - midis[i]), [2, 2, 1, 2, 2, 2, 1]);
    assert.ok(midis.every((midi) => instrument.bars.some((bar) => bar.midi === midi)));
  }
  const svg = createPosterSvg();
  assert.equal((svg.match(/data-scale-tone="true"/g) ?? []).length, 12 * 8);
  assert.equal((svg.match(/data-scale-tone="false"/g) ?? []).length, 12 * 17);
  assert.equal((svg.match(/data-tonic="true"/g) ?? []).length, 12 * 2);
  for (const position of getPosterPositions()) {
    const diagram = svg.match(new RegExp(`<g data-key="${position.id}">([\\s\\S]*?)<\\/g>`))[1];
    const tonics = [...diagram.matchAll(/data-midi="(\d+)" data-scale-tone="true" data-tonic="true"/g)].map((match) => Number(match[1]));
    assert.equal(tonics.length, 2, `${position.label}: two outlined tonic bars`);
    assert.equal(tonics[1] - tonics[0], 12);
    assert.ok(tonics.every((midi) => midi % 12 === position.pitchClass));
  }
});

test("fifteen written keys share twelve positions with all three enharmonic pairs", () => {
  const positions = getPosterPositions();
  assert.equal(positions.length, 12);
  assert.equal(new Set(positions.flatMap((position) => position.spellings.map((key) => key.label))).size, 15);
  const pairs = positions.filter((position) => position.spellings.length === 2);
  assert.deepEqual(pairs.map((position) => position.spellings.map((key) => [key.label, key.count, key.relativeMinor])), [
    [["D♭", 5, "B♭ minor"], ["C♯", 7, "A♯ minor"]],
    [["G♭", 6, "E♭ minor"], ["F♯", 6, "D♯ minor"]],
    [["C♭", 7, "A♭ minor"], ["B", 5, "G♯ minor"]],
  ]);
  for (const position of pairs) {
    const [a, b] = position.spellings.map(scaleOctave);
    assert.deepEqual(a.midis, b.midis);
    assert.notDeepEqual(a.notes, b.notes);
  }
  const cb = scaleOctave(pairs[2].spellings[0]);
  assert.deepEqual(cb.notes, ["C♭", "D♭", "E♭", "F♭", "G♭", "A♭", "B♭", "C♭"]);
  assert.equal(cb.midis[0], 83); // C-flat6 is the physical B5 bar, not C5.
  const cs = scaleOctave(pairs[0].spellings[1]);
  assert.equal(cs.midis[cs.notes.indexOf("B♯")], 84); // B-sharp5 uses C6.
  assert.equal(cs.midis[cs.notes.indexOf("E♯")], 77); // E-sharp5 uses F5.
});

test("the percussion excerpt keeps its two-and-three geography and graduated bars", () => {
  assert.equal(instrument.bars.length, 25);
  assert.equal(instrument.bars.filter((bar) => !bar.accidental).length, 15);
  assert.deepEqual(instrument.bars.filter((bar) => bar.accidental).map((bar) => bar.pitchClass), [1, 3, 6, 8, 10, 1, 3, 6, 8, 10]);
  assert.ok(instrument.bars.every((bar, i, bars) => i === 0 || bar.length < bars[i - 1].length));
  const svg = createPosterSvg();
  assert.equal((svg.match(/major scale on a two-octave xylophone/g) ?? []).length, 12);
  assert.ok(svg.includes("Green + note name = scale tone"));
  const diagrams = [...svg.matchAll(/<g role="img" aria-label="[^"]*major scale on a two-octave xylophone[^"]*">([\s\S]*?)<\/g>/g)];
  for (const [, diagram] of diagrams) {
    const labels = [...diagram.matchAll(/<text\b([^>]*)>([^<]*)<\/text>/g)];
    assert.equal(labels.length, 9, "each instrument has its title and eight bar labels only");
    assert.ok(labels.slice(1).every(([, attributes]) => attributes.includes('transform="rotate(-90')), "note names stay on their bars");
  }
});

test("treble signatures use the conventional written pitches through seven accidentals", () => {
  const treblePitchSteps = { F4: 1, G4: 2, A4: 3, B4: 4, C5: 5, D5: 6, E5: 7, F5: 8, G5: 9 };
  const writtenPitches = {
    flat: ["B4", "E5", "A4", "D5", "G4", "C5", "F4"],
    sharp: ["F5", "C5", "G5", "D5", "A4", "E5", "B4"],
  };
  for (const position of getPosterPositions()) {
    for (const key of position.spellings) {
      const { glyphs, base, space } = keySignatureLayout(key, { x: 0, y: 0, width: 124 });
      assert.equal(glyphs[0].name, "trebleClef");
      assert.equal(glyphs[0].y, base - space); // G4, second line from the bottom.
      assert.equal(glyphs.length, key.count + 1);
      for (const [i, glyph] of glyphs.slice(1).entries()) {
        const pitch = writtenPitches[key.type][i];
        assert.equal(glyph.pitch[0], pitch[0]);
        assert.equal(glyph.step, treblePitchSteps[pitch]);
        assert.equal(glyph.y, base - treblePitchSteps[pitch] * space / 2);
      }
    }
  }
  const svg = createPosterSvg();
  assert.equal((svg.match(/data-glyph="trebleClef"/g) ?? []).length, 15);
  assert.equal((svg.match(/Relative minor: /g) ?? []).length, 15);
  assert.ok(svg.includes("Minor tonic = major’s 6th degree."));
});

test("notation outlines clear the major and relative-minor labels at both staff sizes", () => {
  for (const size of Object.keys(POSTER_PAPERS)) {
    for (const { key, notation } of posterGeometry(size).nodes) {
      const paired = key.spellings.length === 2;
      for (const [index, spelling] of key.spellings.entries()) {
        const columnWidth = paired ? (notation.width - 8) / 2 : notation.width;
        const column = { ...notation, x: notation.x + index * (columnWidth + 8), width: columnWidth };
        const { glyphs, space } = keySignatureLayout(spelling, column, paired);
        assert.equal(space, paired ? 4.4 : 5, `${spelling.label}: enlarged staff spacing`);
        for (const glyph of glyphs) {
          const metric = notationGlyphs.glyphs[glyph.name];
          const top = glyph.y - metric.above * space;
          const bottom = glyph.y + metric.below * space;
          assert.ok(top >= column.y + 18, `${spelling.label}: ${glyph.name} major-label clearance`);
          assert.ok(bottom <= column.y + (paired ? 52 : 57), `${spelling.label}: ${glyph.name} minor-label clearance`);
          assert.ok(glyph.x >= column.x + 8);
          assert.ok(glyph.x + metric.right * space <= column.x + column.width - 8);
        }
      }
    }
  }
});
