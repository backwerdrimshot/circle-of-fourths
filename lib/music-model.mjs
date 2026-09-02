const FLAT_ORDER = ["B♭", "E♭", "A♭", "D♭", "G♭", "C♭", "F♭"];
const SHARP_ORDER = ["F♯", "C♯", "G♯", "D♯", "A♯", "E♯", "B♯"];

const keys = [
  { id: "c", label: "C", pitchClass: 0, type: "none", count: 0, relativeMinor: "A minor" },
  { id: "f", label: "F", pitchClass: 5, type: "flat", count: 1, relativeMinor: "D minor" },
  { id: "bb", label: "B♭", pitchClass: 10, type: "flat", count: 2, relativeMinor: "G minor" },
  { id: "eb", label: "E♭", pitchClass: 3, type: "flat", count: 3, relativeMinor: "C minor" },
  { id: "ab", label: "A♭", pitchClass: 8, type: "flat", count: 4, relativeMinor: "F minor" },
  { id: "db", label: "D♭", pitchClass: 1, type: "flat", count: 5, relativeMinor: "B♭ minor" },
  {
    id: "gb-fs",
    label: "G♭",
    pitchClass: 6,
    type: "flat",
    count: 6,
    relativeMinor: "E♭ minor",
    fifthsVariant: {
      label: "F♯",
      type: "sharp",
      count: 6,
      relativeMinor: "D♯ minor",
    },
  },
  { id: "b", label: "B", pitchClass: 11, type: "sharp", count: 5, relativeMinor: "G♯ minor" },
  { id: "e", label: "E", pitchClass: 4, type: "sharp", count: 4, relativeMinor: "C♯ minor" },
  { id: "a", label: "A", pitchClass: 9, type: "sharp", count: 3, relativeMinor: "F♯ minor" },
  { id: "d", label: "D", pitchClass: 2, type: "sharp", count: 2, relativeMinor: "B minor" },
  { id: "g", label: "G", pitchClass: 7, type: "sharp", count: 1, relativeMinor: "E minor" },
];

const MAJOR_SCALE_STEPS = [0, 2, 4, 5, 7, 9, 11];

function withAccidentals(key) {
  const order = key.type === "flat" ? FLAT_ORDER : SHARP_ORDER;
  return {
    ...key,
    accidentals: key.type === "none" ? [] : order.slice(0, key.count),
    scalePitchClasses: MAJOR_SCALE_STEPS.map((step) => (key.pitchClass + step) % 12),
    signatureLabel:
      key.count === 0
        ? "No accidentals"
        : `${key.count} ${key.type}${key.count === 1 ? "" : "s"}`,
  };
}

export function getTraversal(orientation = "fourths") {
  const ordered = orientation === "fifths" ? [keys[0], ...keys.slice(1).reverse()] : keys;

  return ordered.map((key) => {
    if (orientation === "fifths" && key.fifthsVariant) {
      return withAccidentals({
        ...key,
        ...key.fifthsVariant,
      });
    }

    return withAccidentals(key);
  });
}

export function getKey(id, orientation = "fourths") {
  return getTraversal(orientation).find((key) => key.id === id) ?? null;
}

// Fifteen written major keys occupy twelve pitch centers. Keep each spelling's
// signature and relative minor together, without adding positions to the circle.
export function getPosterPositions() {
  return getTraversal("fourths").map((key) => {
    let spellings = [key];
    if (key.id === "db") {
      spellings.push(withAccidentals({ id: "cs", label: "C♯", pitchClass: 1, type: "sharp", count: 7, relativeMinor: "A♯ minor" }));
    } else if (key.id === "gb-fs") {
      spellings.push(withAccidentals({ ...key, ...key.fifthsVariant }));
    } else if (key.id === "b") {
      spellings = [withAccidentals({ id: "cb", label: "C♭", pitchClass: 11, type: "flat", count: 7, relativeMinor: "A♭ minor" }), key];
    }
    return { ...spellings[0], id: key.id, spellings };
  });
}

export const musicModel = Object.freeze({
  flatOrder: Object.freeze([...FLAT_ORDER]),
  sharpOrder: Object.freeze([...SHARP_ORDER]),
  fourths: Object.freeze(getTraversal("fourths")),
  fifths: Object.freeze(getTraversal("fifths")),
});
