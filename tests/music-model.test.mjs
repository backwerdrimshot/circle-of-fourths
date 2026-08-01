import assert from "node:assert/strict";
import test from "node:test";
import { getKey, getTraversal, musicModel } from "../lib/music-model.mjs";

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
