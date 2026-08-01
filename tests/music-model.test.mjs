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

test("accidental orders are explicit and reversed by type", () => {
  assert.deepEqual(musicModel.flatOrder, ["B♭", "E♭", "A♭", "D♭", "G♭", "C♭", "F♭"]);
  assert.deepEqual(musicModel.sharpOrder, ["F♯", "C♯", "G♯", "D♯", "A♯", "E♯", "B♯"]);
});
