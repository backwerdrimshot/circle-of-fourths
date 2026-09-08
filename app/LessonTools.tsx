import { useState } from "react";
import { getScaleOctave, type TeachingKey, type ScaleMode } from "@/lib/music-model.mjs";
import { compareKeys, notePitchClass } from "@/lib/lesson-model.mjs";
import { KeySignature, ScaleKeyboard } from "./MusicVisuals";
import { useScaleAudio } from "./useScaleAudio";

type Props = {
  musicKey: TeachingKey;
  nextKey: TeachingKey;
  scaleMode: ScaleMode;
  instrument: "xylophone" | "piano";
  onExplore: (id: string) => void;
};

export function KeyComparison({ musicKey, nextKey, instrument, onExplore, showSignatures }: Omit<Props, "scaleMode"> & { showSignatures: boolean }) {
  const [kind, setKind] = useState<"next" | "relative" | "enharmonic">("next");
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [alternateView, setAlternateView] = useState(false);
  const alternate = musicKey.spellings.find((key) => key.spellingId !== musicKey.spellingId);
  const target = kind === "next" ? nextKey : kind === "enharmonic" && alternate ? alternate : musicKey;
  const comparison = compareKeys(musicKey, target);
  const targetMinor = kind === "relative";
  const targetLabel = targetMinor ? musicKey.relativeMinor : `${target.label} major`;
  const displayed = alternateView ? target : musicKey;
  const displayMode = alternateView && targetMinor ? "minor" : "major";
  const changedNotes = comparison.changes.map((change) => change.to);
  return <section className="key-comparison" aria-label="Compare key relationships">
    <h3>See the relationship</h3>
    <div className="lesson-buttons" role="group" aria-label="Comparison type">
      <button type="button" aria-pressed={kind === "next"} onClick={() => { setKind("next"); setAlternateView(false); }}>Next key</button>
      <button type="button" aria-pressed={kind === "relative"} onClick={() => { setKind("relative"); setAlternateView(false); }}>Major / minor</button>
      {alternate && <button type="button" aria-pressed={kind === "enharmonic"} onClick={() => { setKind("enharmonic"); setAlternateView(false); }}>Enharmonic</button>}
    </div>
    <p className="comparison-heading">{musicKey.label} major → {targetLabel}</p>
    {kind === "relative" ? <p>Same signature and pitch classes. The home note changes from {musicKey.label} to {musicKey.relativeMinor.replace(" minor", "")}, the major scale’s sixth degree. Compare the natural minor scale on the same bars.</p>
      : kind === "enharmonic" ? <p>Same physical pitches, different spelling. The bars stay in place while their written names and key signature change.</p>
      : <><p><strong>What changed?</strong> {comparison.changes.map(({ from, to }) => `${from} → ${to}`).join(" · ") || "The signature stays the same."}</p>
        {comparison.changes.length > 1 && <p className="lesson-note">This crosses a spelling boundary. Several written names change; compare the highlighted bars to see the physical pitch changes.</p>}</>}
    {showSignatures && <div className="comparison-staves">
      <div><strong>{musicKey.label} major</strong><KeySignature type={musicKey.type} count={musicKey.count} emphasizedNotes={comparison.changes.map((change) => change.from)} /></div>
      <div><strong>{targetLabel}</strong><KeySignature type={target.type} count={target.count} emphasizedNotes={changedNotes} /></div>
    </div>}
    {showSignatures && comparison.changes.length > 0 && <p className="lesson-note">Blue marks changed written accidentals.</p>}
    <div className="lesson-buttons">
      <button type="button" aria-expanded={showKeyboard} onClick={() => setShowKeyboard(!showKeyboard)}>{showKeyboard ? "Close keyboard comparison" : "Compare on keyboard"}</button>
      {kind === "next" && <button type="button" onClick={() => onExplore(nextKey.id)}>Explore {nextKey.label} major</button>}
    </div>
    {showKeyboard && <div className="fixed-keyboard-comparison">
      <div className="lesson-buttons" role="group" aria-label="Keyboard comparison view">
        <button type="button" aria-pressed={!alternateView} onClick={() => setAlternateView(false)}>{musicKey.label} major</button>
        <button type="button" aria-pressed={alternateView} onClick={() => setAlternateView(true)}>{targetLabel}</button>
      </div>
      <ScaleKeyboard musicKey={displayed} scaleMode={displayMode} instrument={instrument} fixedRange emphasizedPitchClasses={kind === "next" && alternateView ? target.scalePitchClasses.filter((pc) => !musicKey.scalePitchClasses.includes(pc)) : []} />
      <p className="lesson-note">Two octaves held in place for comparison. One scale octave highlighted{kind === "next" ? "; blue outlines mark new pitches" : ""}.</p>
    </div>}
  </section>;
}

export function PlayableScale({ musicKey, nextKey, scaleMode, instrument, markedDegrees }: Omit<Props, "onExplore"> & { markedDegrees: number[] }) {
  const scale = getScaleOctave(musicKey, scaleMode);
  const audio = useScaleAudio(`${musicKey.spellingId}:${scaleMode}:${instrument}`, instrument);
  const [bpm, setBpm] = useState(90);
  const [exercise, setExercise] = useState<"off" | "tonic" | "change">("off");
  const [feedback, setFeedback] = useState("");
  const [solved, setSolved] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const changes = compareKeys(musicKey, nextKey).changes;
  const canPracticeChange = changes.length === 1;

  function chooseBar(midi: number) {
    void audio.play([midi], bpm);
    if (exercise === "tonic") {
      const correct = midi % 12 === scale.midis[0] % 12;
      setSolved(correct);
      setFeedback(correct ? `Correct. ${scale.tonic} is the tonic, or home note. Either octave is correct.` : `Try again. Find ${scale.tonic}, the home note of this scale.`);
    }
  }
  function setPractice(next: typeof exercise) { audio.stop(); setExercise(next); setSolved(false); setShowAnswer(false); setFeedback(""); }
  return <section className="scale-detail" aria-label="Selected scale keyboard">
    <h3>{scale.label} scale</h3>
    <p className="keyboard-guide">About 1½ octaves of {instrument === "piano" ? "keys" : "bars"} · one octave highlighted</p>
    <ScaleKeyboard musicKey={musicKey} scaleMode={scaleMode} instrument={instrument} markedDegrees={markedDegrees} playingMidi={audio.playingMidi} onPlay={chooseBar} concealScale={exercise === "tonic" && !solved && !showAnswer} />
    <p className="keyboard-guide">{exercise === "tonic" && !solved && !showAnswer ? "Scale markings hidden. Tap a bar to find the tonic." : "Green = scale note · dark outline = tonic"}</p>
    <div className="sound-controls no-print" aria-label="Scale playback">
      <div className="lesson-buttons">
        <button type="button" onClick={() => void audio.play(scale.midis, bpm)}>Play ascending</button>
        <button type="button" onClick={() => void audio.play([...scale.midis].reverse(), bpm)}>Play descending</button>
        <button type="button" onClick={audio.stop} disabled={!audio.playing}>Stop</button>
      </div>
      <div className="sound-settings">
        <label>Tempo <input type="range" min="40" max="180" step="5" value={bpm} onChange={(e) => { audio.stop(); setBpm(Number(e.target.value)); }} /> <output>{bpm} BPM</output></label>
        <label>Volume <input type="range" min="0" max="0.7" step="0.05" value={audio.volume} onChange={(e) => { audio.stop(); audio.setVolume(Number(e.target.value)); }} /> <output>{Math.round(audio.volume * 100)}%</output></label>
      </div>
      <p className="lesson-note">Tap a bar, or Tab to a bar and press Enter. Sound uses synthesized teaching tones.</p>
      <p role="status" className="audio-status">{audio.error || (audio.playing ? "Playing" : "")}</p>
    </div>
    <section className="quick-practice no-print" aria-label="Quick practice">
      <h3>Try it</h3>
      <div className="lesson-buttons">
        <button type="button" aria-pressed={exercise === "tonic"} onClick={() => setPractice(exercise === "tonic" ? "off" : "tonic")}>Find the tonic</button>
        {canPracticeChange && <button type="button" aria-pressed={exercise === "change"} onClick={() => setPractice(exercise === "change" ? "off" : "change")}>Which note changes?</button>}
      </div>
      {exercise === "tonic" && <><p>Find {scale.tonic} on the keyboard above. Choose either tonic bar.</p><button type="button" onClick={() => setShowAnswer(!showAnswer)}>{showAnswer ? "Hide scale markings" : "Show scale markings"}</button></>}
      {exercise === "change" && canPracticeChange && <>
        <p>Moving from {musicKey.label} major to {nextKey.label} major: which note takes a new accidental or returns to natural?</p>
        <div className="lesson-buttons" aria-label="Choose the changing note">{getScaleOctave(musicKey).notes.slice(0, 7).map((note) => <button type="button" key={note} onClick={() => {
          const correct = note === changes[0].from;
          setSolved(correct);
          setFeedback(correct ? `Correct. ${changes[0].from} becomes ${changes[0].to}.` : `Try again. Compare the key signatures, one letter at a time.`);
          if (correct) void audio.play([72 + notePitchClass(changes[0].from), 72 + notePitchClass(changes[0].to)], bpm);
        }}>{note}</button>)}</div>
      </>}
      <p role="status" className={solved ? "practice-feedback is-correct" : "practice-feedback"}>{feedback}</p>
    </section>
  </section>;
}
