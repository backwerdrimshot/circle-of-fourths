export type Orientation = "fourths" | "fifths";
export type ScaleMode = "major" | "minor";
export type ScaleDegree = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type AccidentalType = "none" | "flat" | "sharp";

export interface MusicKey {
  id: string;
  label: string;
  pitchClass: number;
  type: AccidentalType;
  count: number;
  relativeMinor: string;
  accidentals: string[];
  scalePitchClasses: number[];
  signatureLabel: string;
  spellingId?: string;
  fifthsVariant?: {
    label: string;
    type: AccidentalType;
    count: number;
    relativeMinor: string;
  };
}

export interface SpelledMusicKey extends MusicKey {
  spellingId: string;
}

export interface TeachingKey extends SpelledMusicKey {
  spellings: SpelledMusicKey[];
}

export interface ScaleOctave {
  label: string;
  tonic: string;
  notes: string[];
  midis: number[];
  degrees: ScaleDegree[];
}

export function getTraversal(orientation?: Orientation): MusicKey[];
export function getKey(id: string, orientation?: Orientation): MusicKey | null;
export function getPosterPositions(): (MusicKey & { spellings: MusicKey[] })[];
export function getKeySpellings(positionId: string, orientation?: Orientation): SpelledMusicKey[];
export function getTeachingTraversal(orientation?: Orientation, spellings?: Record<string, string>): TeachingKey[];
export function getScaleNoteNames(key: MusicKey): string[];
export function getScaleOctave(key: MusicKey, scaleMode?: ScaleMode): ScaleOctave;
export const musicModel: Readonly<{
  flatOrder: readonly string[];
  sharpOrder: readonly string[];
  fourths: readonly MusicKey[];
  fifths: readonly MusicKey[];
}>;
