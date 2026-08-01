import { CircleBoard } from "../CircleBoard";
import { createPosterState } from "../poster-state";

export default function PosterPage() {
  return <CircleBoard initialState={createPosterState("letter")} />;
}
