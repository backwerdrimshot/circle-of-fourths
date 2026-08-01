const FLAT_ORDER = ["B♭", "E♭", "A♭", "D♭", "G♭", "C♭", "F♭"];
const SHARP_ORDER = ["F♯", "C♯", "G♯", "D♯", "A♯", "E♯", "B♯"];

const keys = [
  { id: "c", label: "C", type: "none", count: 0, relativeMinor: "A minor" },
  { id: "f", label: "F", type: "flat", count: 1, relativeMinor: "D minor" },
  { id: "bb", label: "B♭", type: "flat", count: 2, relativeMinor: "G minor" },
  { id: "eb", label: "E♭", type: "flat", count: 3, relativeMinor: "C minor" },
  { id: "ab", label: "A♭", type: "flat", count: 4, relativeMinor: "F minor" },
  { id: "db", label: "D♭", type: "flat", count: 5, relativeMinor: "B♭ minor" },
  {
    id: "gb-fs",
    label: "G♭",
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
  { id: "b", label: "B", type: "sharp", count: 5, relativeMinor: "G♯ minor" },
  { id: "e", label: "E", type: "sharp", count: 4, relativeMinor: "C♯ minor" },
  { id: "a", label: "A", type: "sharp", count: 3, relativeMinor: "F♯ minor" },
  { id: "d", label: "D", type: "sharp", count: 2, relativeMinor: "B minor" },
  { id: "g", label: "G", type: "sharp", count: 1, relativeMinor: "E minor" },
];

function withAccidentals(key) {
  const order = key.type === "flat" ? FLAT_ORDER : SHARP_ORDER;
  return {
    ...key,
    accidentals: key.type === "none" ? [] : order.slice(0, key.count),
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

export const musicModel = Object.freeze({
  flatOrder: Object.freeze([...FLAT_ORDER]),
  sharpOrder: Object.freeze([...SHARP_ORDER]),
  fourths: Object.freeze(getTraversal("fourths")),
  fifths: Object.freeze(getTraversal("fifths")),
});
