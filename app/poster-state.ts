import type { CircleBoardState, PosterSize } from "./CircleBoard";

export function createPosterState(posterSize: PosterSize): CircleBoardState {
  return {
    orientation: "fourths",
    mode: "poster",
    selectedId: "c",
    scaleMode: "major",
    spellings: {},
    layers: ["signatures", "numbers", "minors", "keyboards", "accidental-order"],
    revealed: ["c"],
    instrument: "xylophone",
    markedDegrees: [],
    quizPreset: "accidentals",
    quizScope: "full",
    quizRoles: { keyName: "given", numbers: "answer", signatures: "omitted" },
    quizPreview: "student",
    posterSize,
    presenting: false,
  };
}
