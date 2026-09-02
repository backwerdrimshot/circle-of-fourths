import assert from "node:assert/strict";
import test from "node:test";
import { getKey, getKeySpellings, getScaleOctave, getTeachingTraversal, getTraversal, musicModel } from "../lib/music-model.mjs";
import instrument from "../lib/xylophone-two-octaves.json" with { type: "json" };

test("fourths traversal follows the band-friendly flat-side order", () => {
  assert.deepEqual(
    getTraversal("fourths").map((key) => key.label),
    ["C", "F", "B♭", "E♭", "A♭", "D♭", "G♭", "B", "E", "A", "D", "G"],
  );
});

test("fifths reverses the graph and uses the F-sharp boundary spelling", () => {
  assert.deepEqual(
    getTraversal("fifths").map((key) => key.label),
    ["C", "G", "D", "A", "E", "B", "F♯", "D♭", "A♭", "E♭", "B♭", "F"],
  );
  assert.equal(getKey("gb-fs", "fifths")?.signatureLabel, "6 sharps");
  assert.equal(getKey("gb-fs", "fourths")?.signatureLabel, "6 flats");
});

test("signature counts match accumulated accidentals", () => {
  for (const orientation of ["fourths", "fifths"]) {
    for (const key of getTraversal(orientation)) {
      assert.equal(key.accidentals.length, key.count, `${orientation}: ${key.label}`);
    }
  }
});

test("each key exposes a seven-tone major scale for the mallet preview", () => {
  for (const orientation of ["fourths", "fifths"]) {
    for (const key of getTraversal(orientation)) {
      assert.equal(key.scalePitchClasses.length, 7, `${orientation}: ${key.label}`);
      assert.equal(new Set(key.scalePitchClasses).size, 7, `${orientation}: ${key.label}`);
      assert.ok(key.scalePitchClasses.includes(key.pitchClass), `${orientation}: ${key.label} tonic`);
    }
  }
});

test("C remains at twelve o'clock in either direction", () => {
  assert.equal(getTraversal("fourths")[0].id, "c");
  assert.equal(getTraversal("fifths")[0].id, "c");
});

test("accidental orders are explicit and reversed by type", () => {
  assert.deepEqual(musicModel.flatOrder, ["B♭", "E♭", "A♭", "D♭", "G♭", "C♭", "F♭"]);
  assert.deepEqual(musicModel.sharpOrder, ["F♯", "C♯", "G♯", "D♯", "A♯", "E♯", "B♯"]);
});

test("teaching spellings preserve the twelve position ids and expose all fifteen written keys", () => {
  const positions = getTeachingTraversal();
  assert.deepEqual(positions.map((key) => key.id), getTraversal().map((key) => key.id));
  const writtenKeys = positions.flatMap((key) => key.spellings);
  assert.equal(writtenKeys.length, 15);
  assert.equal(new Set(writtenKeys.map((key) => key.spellingId)).size, 15);
  for (const position of positions) {
    assert.ok(position.spellings.every((key) => key.id === position.id && key.pitchClass === position.pitchClass));
  }
  assert.deepEqual(getKeySpellings("db").map((key) => key.spellingId), ["db", "cs"]);
  assert.deepEqual(getKeySpellings("gb-fs").map((key) => key.spellingId), ["gb", "fs"]);
  assert.deepEqual(getKeySpellings("gb-fs", "fifths").map((key) => key.spellingId), ["fs", "gb"]);
  assert.deepEqual(getKeySpellings("b").map((key) => key.spellingId), ["b", "cb"]);
  assert.deepEqual(getKeySpellings("unknown"), []);
});

test("explicit enharmonic choices persist through direction changes while invalid choices fall back", () => {
  const choices = { db: "cs", "gb-fs": "gb", b: "cb", c: "cs" };
  for (const orientation of ["fourths", "fifths"]) {
    const traversal = getTeachingTraversal(orientation, choices);
    for (const [id, label, count, minor] of [["db", "C♯", 7, "A♯ minor"], ["gb-fs", "G♭", 6, "E♭ minor"], ["b", "C♭", 7, "A♭ minor"]]) {
      const key = traversal.find((item) => item.id === id);
      assert.equal(key.label, label);
      assert.equal(key.count, count);
      assert.equal(key.relativeMinor, minor);
    }
    assert.equal(traversal[0].spellingId, "c");
  }
  assert.deepEqual(choices, { db: "cs", "gb-fs": "gb", b: "cb", c: "cs" });
});

test("major and relative natural-minor octaves keep correct spellings and exactly eight physical pitches", () => {
  const naturalPitch = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  for (const key of getTeachingTraversal().flatMap((position) => position.spellings)) {
    for (const mode of ["major", "minor"]) {
      const octave = getScaleOctave(key, mode);
      assert.equal(octave.notes.length, 8);
      assert.equal(octave.midis.length, 8);
      assert.equal(new Set(octave.midis).size, 8);
      assert.equal(new Set(octave.notes.slice(0, 7).map((note) => note[0])).size, 7);
      assert.equal(octave.notes[0], octave.notes[7]);
      assert.equal(octave.tonic, octave.notes[0]);
      assert.equal(octave.label, mode === "minor" ? key.relativeMinor : `${key.label} major`);
      assert.deepEqual(octave.degrees, [1, 2, 3, 4, 5, 6, 7, 1]);
      assert.deepEqual(octave.midis.slice(1).map((midi, i) => midi - octave.midis[i]), mode === "minor" ? [2, 1, 2, 2, 1, 2, 2] : [2, 2, 1, 2, 2, 2, 1]);
      octave.notes.forEach((note, index) => {
        const accidental = note.includes("♭") ? -1 : note.includes("♯") ? 1 : 0;
        assert.equal((naturalPitch[note[0]] + accidental + 12) % 12, octave.midis[index] % 12, `${key.label} ${mode}: ${note}`);
        assert.ok(instrument.bars.some((bar) => bar.midi === octave.midis[index]), `${key.label} ${mode}: fits the instrument`);
      });
    }
  }
});

test("enharmonic relative minors share bars while retaining their complete written scales", () => {
  const expected = {
    cb: { notes: ["A♭", "B♭", "C♭", "D♭", "E♭", "F♭", "G♭", "A♭"], midis: [80, 82, 83, 85, 87, 88, 90, 92] },
    b: { notes: ["G♯", "A♯", "B", "C♯", "D♯", "E", "F♯", "G♯"], midis: [80, 82, 83, 85, 87, 88, 90, 92] },
    db: { notes: ["B♭", "C", "D♭", "E♭", "F", "G♭", "A♭", "B♭"], midis: [82, 84, 85, 87, 89, 90, 92, 94] },
    cs: { notes: ["A♯", "B♯", "C♯", "D♯", "E♯", "F♯", "G♯", "A♯"], midis: [82, 84, 85, 87, 89, 90, 92, 94] },
    gb: { notes: ["E♭", "F", "G♭", "A♭", "B♭", "C♭", "D♭", "E♭"], midis: [75, 77, 78, 80, 82, 83, 85, 87] },
    fs: { notes: ["D♯", "E♯", "F♯", "G♯", "A♯", "B", "C♯", "D♯"], midis: [75, 77, 78, 80, 82, 83, 85, 87] },
  };
  for (const key of getTeachingTraversal().flatMap((position) => position.spellings)) {
    if (!expected[key.spellingId]) continue;
    const octave = getScaleOctave(key, "minor");
    assert.deepEqual(octave.notes, expected[key.spellingId].notes);
    assert.deepEqual(octave.midis, expected[key.spellingId].midis);
  }
});
