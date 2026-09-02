import assert from "node:assert/strict";
import test from "node:test";
import { getPosterPositions, getScaleOctave } from "../lib/music-model.mjs";
import { getKeyboardWindow } from "../lib/keyboard-window.mjs";
import instrument from "../lib/xylophone-two-octaves.json" with { type: "json" };

test("compact excerpts keep every major and relative-minor scale on continuous physical bars", () => {
  const ranges = new Set();
  for (const key of getPosterPositions().flatMap((position) => position.spellings)) {
    for (const mode of ["major", "minor"]) {
      const scale = getScaleOctave(key, mode);
      const window = getKeyboardWindow(scale.midis);
      const label = `${key.label} ${mode}`;
      assert.ok(window.bars.length >= 18 && window.bars.length <= 20, label);
      assert.equal(window.bars[0].accidental, false, label);
      assert.equal(window.bars.at(-1).accidental, false, label);
      assert.deepEqual(window.bars.map((bar) => bar.midi), Array.from({ length: window.bars.length }, (_, i) => window.fromMidi + i), label);
      assert.ok(scale.midis.every((midi) => window.bars.some((bar) => bar.midi === midi)), label);
      const sourceFirst = instrument.bars.find((bar) => bar.midi === window.fromMidi);
      for (const bar of window.bars) {
        const source = instrument.bars.find((original) => original.midi === bar.midi);
        assert.equal(bar.length, source.length, "the canonical percussion taper stays intact");
        assert.equal(bar.center - window.bars[0].center, source.center - sourceFirst.center, "natural/accidental geography stays intact");
      }
      ranges.add(`${window.fromMidi}:${window.toMidi}`);
    }
  }
  assert.ok(ranges.size > 1, "the excerpt adapts to the scale");
});
