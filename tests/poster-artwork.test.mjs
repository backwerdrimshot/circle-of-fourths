import assert from "node:assert/strict";
import test from "node:test";
import { getTraversal } from "../lib/music-model.mjs";
import { createPosterSvg, posterGeometry, POSTER_PAPERS, scaleNoteNames } from "../lib/poster-artwork.mjs";
import instrument from "../lib/xylophone-two-octaves.json" with { type: "json" };

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
  for (const key of getTraversal("fourths")) {
    const names = scaleNoteNames(key);
    assert.equal(new Set(names.map((note) => note[0])).size, 7);
    assert.deepEqual(names.map((note) => (naturals[note[0]] + (note.includes("♭") ? -1 : note.includes("♯") ? 1 : 0) + 12) % 12), key.scalePitchClasses);
  }
  assert.deepEqual(scaleNoteNames(getTraversal("fourths")[6]), ["G♭", "A♭", "B♭", "C♭", "D♭", "E♭", "F"]);
});

test("the percussion excerpt keeps its two-and-three geography and graduated bars", () => {
  assert.equal(instrument.bars.length, 25);
  assert.equal(instrument.bars.filter((bar) => !bar.accidental).length, 15);
  assert.deepEqual(instrument.bars.filter((bar) => bar.accidental).map((bar) => bar.pitchClass), [1, 3, 6, 8, 10, 1, 3, 6, 8, 10]);
  assert.ok(instrument.bars.every((bar, i, bars) => i === 0 || bar.length < bars[i - 1].length));
  const svg = createPosterSvg();
  assert.equal((svg.match(/major scale on a two-octave xylophone/g) ?? []).length, 12);
  assert.ok(svg.includes("Green + note name = scale tone"));
});
