import { getScaleNoteNames } from "./music-model.mjs";

export function compareKeys(from, to) {
  const before = getScaleNoteNames(from);
  const after = getScaleNoteNames(to);
  const changes = before.flatMap((note) => {
    const next = after.find((candidate) => candidate[0] === note[0]);
    return next === note ? [] : [{ from: note, to: next }];
  });
  const samePitches = from.scalePitchClasses.every((pc) => to.scalePitchClasses.includes(pc));
  return { changes, samePitches };
}

export function notePitchClass(note) {
  const natural = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[note[0]];
  return (natural + (note.includes("♯") ? 1 : note.includes("♭") ? -1 : 0) + 12) % 12;
}

export function midiNoteName(midi) {
  const names = ["C", "C♯ / D♭", "D", "D♯ / E♭", "E", "F", "F♯ / G♭", "G", "G♯ / A♭", "A", "A♯ / B♭", "B"];
  return names[midi % 12];
}
