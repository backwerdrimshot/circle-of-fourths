import { CircleBoard, type PosterSize } from "../../CircleBoard";
import { createPosterState } from "../../poster-state";

type Params = Promise<{ size: string }>;

export default async function SizedPosterPage({ params }: { params: Params }) {
  const { size } = await params;
  const posterSize: PosterSize = size === "a4" ? "a4" : size === "11x17" ? "tabloid" : "letter";

  return <CircleBoard initialState={createPosterState(posterSize)} />;
}
