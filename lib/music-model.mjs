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

/** Written alternatives retain the circle position id so selection never moves. */
export function getKeySpellings(positionId, orientation = "fourths") {
  const preferred = getKey(positionId, orientation);
  if (!preferred) return [];
  const position = getPosterPositions().find((key) => key.id === positionId);
  const spellings = position.spellings.map((key) => ({
    ...key,
    id: positionId,
    spellingId: key.label.replace("♭", "b").replace("♯", "s").toLowerCase(),
  }));
  return spellings.sort((a, b) => Number(b.label === preferred.label) - Number(a.label === preferred.label));
}

/** Apply written-key choices without changing the twelve circle positions. */
export function getTeachingTraversal(orientation = "fourths", spellings = {}) {
  return getTraversal(orientation).map((key) => {
    const options = getKeySpellings(key.id, orientation);
    const selected = options.find((option) => option.spellingId === spellings[key.id]) ?? options[0];
    return { ...selected, spellings: options };
  });
}

/** Spell every diatonic letter from the key signature, including C-flat/F-flat. */
export function getScaleNoteNames(key) {
  const letters = ["C", "D", "E", "F", "G", "A", "B"];
  const first = letters.indexOf(key.label[0]);
  return Array.from({ length: 7 }, (_, index) => {
    const letter = letters[(first + index) % 7];
    return key.accidentals.find((note) => note[0] === letter) ?? letter;
  });
}

/** One tonic-to-tonic octave, placed within the shared two-octave instrument. */
export function getScaleOctave(key, scaleMode = "major") {
  const majorNotes = getScaleNoteNames(key);
  const isMinor = scaleMode === "minor";
  const notes = isMinor ? [...majorNotes.slice(5), ...majorNotes.slice(0, 5)] : majorNotes;
  const tonic = notes[0];
  const tonicPitchClass = (key.pitchClass + (isMinor ? 9 : 0)) % 12;
  // Choose the first physical tonic in range. Adding nine to the major's MIDI
  // tonic instead would push some relative-minor octaves beyond the last bar.
  const low = instrument.range.fromMidi;
  const tonicMidi = low + (tonicPitchClass - low % 12 + 12) % 12;
  const steps = isMinor ? [0, 2, 3, 5, 7, 8, 10, 12] : [...MAJOR_SCALE_STEPS, 12];
  return {
    label: `${tonic} ${isMinor ? "minor" : "major"}`,
    tonic,
    notes: [...notes, tonic],
    midis: steps.map((step) => tonicMidi + step),
    degrees: [1, 2, 3, 4, 5, 6, 7, 1],
  };
}

export const musicModel = Object.freeze({
  flatOrder: Object.freeze([...FLAT_ORDER]),
  sharpOrder: Object.freeze([...SHARP_ORDER]),
  fourths: Object.freeze(getTraversal("fourths")),
  fifths: Object.freeze(getTraversal("fifths")),
});
import instrument from "./xylophone-two-octaves.json" with { type: "json" };
