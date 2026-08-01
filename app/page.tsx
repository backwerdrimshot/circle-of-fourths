import { CircleBoard, type CircleBoardState } from "./CircleBoard";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function Home({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const layerParam = first(params.layers) ?? "signatures,numbers";
  const layers = layerParam
    .split(",")
    .filter((layer): layer is CircleBoardState["layers"][number] =>
      layer === "signatures" ||
      layer === "numbers" ||
      layer === "keyboards" ||
      layer === "minors" ||
      layer === "accidental-order",
    );
  const revealed = (first(params.revealed) ?? "c").split(",").filter(Boolean);
  const degreeParam = first(params.degrees) ?? (first(params.tonic) === "1" ? "1" : "");
  const markedDegrees = degreeParam
    .split(",")
    .map(Number)
    .filter((degree): degree is CircleBoardState["markedDegrees"][number] => Number.isInteger(degree) && degree >= 1 && degree <= 7);
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
  const quizScope: CircleBoardState["quizScope"] = scopeParam === "flats" || scopeParam === "sharps"
    ? scopeParam
    : quizPreset === "flat-side" ? "flats" : "full";
  const initialState: CircleBoardState = {
    orientation: first(params.direction) === "fifths" ? "fifths" : "fourths",
    mode: first(params.mode) === "poster" ? "poster" : first(params.mode) === "focus" ? "focus" : first(params.mode) === "quiz" ? "quiz" : "build",
    layers,
    revealed,
    instrument: first(params.instrument) === "piano" ? "piano" : "xylophone",
    markedDegrees,
    quizPreset,
    quizScope,
    quizRoles,
    quizPreview: first(params.preview) === "answer" ? "answer" : "student",
    presenting: first(params.present) === "1",
  };

  return <CircleBoard initialState={initialState} />;
}
