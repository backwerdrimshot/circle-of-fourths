import { CircleBoard, type CircleBoardState } from "./CircleBoard";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function Home({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const layerParam = first(params.layers) ?? "signatures";
  const layers = layerParam
    .split(",")
    .filter((layer): layer is CircleBoardState["layers"][number] =>
      layer === "signatures" || layer === "minors",
    );
  const revealed = (first(params.revealed) ?? "c").split(",").filter(Boolean);
  const initialState: CircleBoardState = {
    orientation: first(params.direction) === "fifths" ? "fifths" : "fourths",
    mode: first(params.mode) === "poster" ? "poster" : "build",
    layers,
    revealed,
  };

  return <CircleBoard initialState={initialState} />;
}
