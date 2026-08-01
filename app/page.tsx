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
  const initialState: CircleBoardState = {
    orientation: first(params.direction) === "fifths" ? "fifths" : "fourths",
    mode: first(params.mode) === "poster" ? "poster" : first(params.mode) === "focus" ? "focus" : "build",
    layers,
    revealed,
    instrument: first(params.instrument) === "piano" ? "piano" : "xylophone",
    markedDegrees,
    presenting: first(params.present) === "1",
  };

  return <CircleBoard initialState={initialState} />;
}
