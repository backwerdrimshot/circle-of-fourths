export type KeyboardBar = {
  midi: number;
  pitchClass: number;
  center: number;
  width: number;
  length: number;
  accidental: boolean;
};
export function getKeyboardWindow(midis: readonly number[]): {
  fromMidi: number;
  toMidi: number;
  width: number;
  bars: KeyboardBar[];
};
