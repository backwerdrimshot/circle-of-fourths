import { CircleBoard, type CircleBoardState } from "./CircleBoard";
import { getKeySpellings, getTraversal } from "@/lib/music-model.mjs";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function Home({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const mode: CircleBoardState["mode"] = first(params.mode) === "poster"
    ? "poster"
    : first(params.mode) === "focus"
      ? "focus"
      : first(params.mode) === "quiz"
        ? "quiz"
        : "build";
  const isStandardPoster = mode === "poster";
  const isFlatSidePreset = mode === "quiz" && first(params.quiz) === "flat-side";
  const orientation = isStandardPoster || isFlatSidePreset ? "fourths" : first(params.direction) === "fifths" ? "fifths" : "fourths";
  const positionIds = new Set(getTraversal(orientation).map((key) => key.id));
  const keyParam = first(params.key);
  const selectedId = !isStandardPoster && keyParam && positionIds.has(keyParam) ? keyParam : "c";
  const spellings: CircleBoardState["spellings"] = {};
  if (!isStandardPoster) {
    for (const entry of (first(params.spellings) ?? "").split(",")) {
      const parts = entry.split(":");
      if (parts.length !== 2) continue;
      const [positionId, spellingId] = parts;
      if (!positionIds.has(positionId) || Object.hasOwn(spellings, positionId)) continue;
      if (getKeySpellings(positionId, orientation).some((option) => option.spellingId === spellingId)) {
        spellings[positionId] = spellingId;
      }
    }
  }
  if (isFlatSidePreset) Object.assign(spellings, { db: "db", "gb-fs": "gb", b: "cb" });
  const layerParam = first(params.layers) ?? "signatures,numbers,keyboards";
  const requestedLayers = [...new Set(layerParam
    .split(",")
    .filter((layer): layer is CircleBoardState["layers"][number] =>
      layer === "signatures" ||
      layer === "numbers" ||
      layer === "keyboards" ||
      layer === "minors" ||
      layer === "accidental-order",
    ))];
  const layers: CircleBoardState["layers"] = isStandardPoster
    ? ["signatures", "numbers", "minors", "keyboards", "accidental-order"]
    : requestedLayers;
  const revealed = [...new Set((first(params.revealed) ?? "c").split(",").filter((id) => positionIds.has(id)))];
  const degreeParam = first(params.degrees) ?? (first(params.tonic) === "1" ? "1" : "");
  const markedDegrees = [...new Set(degreeParam
    .split(",")
    .map(Number)
    .filter((degree): degree is CircleBoardState["markedDegrees"][number] => Number.isInteger(degree) && degree >= 1 && degree <= 7))];
  const quizParam = first(params.quiz);
  const quizPreset: CircleBoardState["quizPreset"] = quizParam === "key-names" || quizParam === "flat-side" || quizParam === "custom" ? quizParam : "accidentals";
  const presetRoles: CircleBoardState["quizRoles"] = quizPreset === "key-names"
    ? { keyName: "answer", numbers: "omitted", signatures: "given" }
    : quizPreset === "flat-side"
      ? { keyName: "answer", numbers: "given", signatures: "omitted" }
      : { keyName: "given", numbers: "answer", signatures: "omitted" };
  const quizRoles = { ...presetRoles };
  for (const entry of (first(params.roles) ?? "").split(",")) {
    const [field, role] = entry.split(":");
    if ((field === "keyName" || field === "numbers" || field === "signatures") && (role === "given" || role === "answer" || role === "omitted")) {
      quizRoles[field] = role;
    }
  }
  const scopeParam = first(params.scope);
  const quizScope: CircleBoardState["quizScope"] = isFlatSidePreset ? "flats" : scopeParam === "flats" || scopeParam === "sharps"
    ? scopeParam
    : quizPreset === "flat-side" ? "flats" : "full";
  const initialState: CircleBoardState = {
    orientation,
    mode,
    selectedId,
    scaleMode: !isStandardPoster && first(params.scale) === "minor" ? "minor" : "major",
    spellings,
    layers,
    revealed,
    instrument: isStandardPoster ? "xylophone" : first(params.instrument) === "piano" ? "piano" : "xylophone",
    markedDegrees: isStandardPoster ? [] : markedDegrees,
    quizPreset,
    quizScope,
    quizRoles,
    quizPreview: first(params.preview) === "answer" ? "answer" : "student",
    posterSize: first(params.paper) === "a4" ? "a4" : first(params.paper) === "tabloid" ? "tabloid" : "letter",
    presenting: first(params.present) === "1",
  };

  return <CircleBoard initialState={initialState} />;
}
