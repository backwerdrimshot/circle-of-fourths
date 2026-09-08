import type { MusicKey } from "./music-model.mjs";
export function compareKeys(from: MusicKey, to: MusicKey): { changes: { from: string; to: string }[]; samePitches: boolean };
export function notePitchClass(note: string): number;
export function midiNoteName(midi: number): string;
