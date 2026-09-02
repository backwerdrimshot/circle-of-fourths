import instrument from "./xylophone-two-octaves.json" with { type: "json" };

/** A compact physical excerpt, keeping the complete scale and nearby context. */
export function getKeyboardWindow(midis) {
  const low = Math.min(...midis);
  const high = Math.max(...midis);
  const naturals = instrument.bars.filter((bar) => !bar.accidental);
  let best;
  for (const first of naturals) {
    for (const last of naturals) {
      const span = last.midi - first.midi;
      if (first.midi > low || last.midi < high || span < 17 || span > 19) continue;
      // Prefer balanced context over forcing an exact tritone at the edges.
      // Natural end bars preserve a recognizable, complete lower row.
      const score = Math.abs(span - 18) + Math.abs(first.midi + last.midi - low - high);
      if (!best || score < best.score) best = { first, last, score };
    }
  }
  if (!best) throw new RangeError("The scale does not fit a compact keyboard excerpt.");
  const left = best.first.center - best.first.width / 2;
  const right = best.last.center + best.last.width / 2;
  return {
    fromMidi: best.first.midi,
    toMidi: best.last.midi,
    width: right - left,
    bars: instrument.bars
      .filter((bar) => bar.midi >= best.first.midi && bar.midi <= best.last.midi)
      .map((bar) => ({ ...bar, center: bar.center - left })),
  };
}
