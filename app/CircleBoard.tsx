"use client";

import { useEffect, useMemo, useState } from "react";
import { getTeachingTraversal, getScaleOctave } from "@/lib/music-model.mjs";
import { KeySignature, ScaleKeyboard } from "./MusicVisuals";
import { createPosterSvg, posterGeometry } from "@/lib/poster-artwork.mjs";

type Orientation = "fourths" | "fifths";
type BoardMode = "build" | "poster" | "focus" | "quiz";
type Layer = "signatures" | "numbers" | "keyboards" | "minors" | "accidental-order";
type Instrument = "xylophone" | "piano";
type ScaleDegree = 1 | 2 | 3 | 4 | 5 | 6 | 7;
type QuizPreset = "accidentals" | "key-names" | "flat-side" | "custom";
type QuizScope = "full" | "flats" | "sharps";
type QuizField = "keyName" | "numbers" | "signatures";
type FieldRole = "given" | "answer" | "omitted";
type QuizPreview = "student" | "answer";
export type PosterSize = "letter" | "a4" | "tabloid";
type QuizRoles = Record<QuizField, FieldRole>;

// Use the proven poster gutters for the wide teaching board; the phone layout
// keeps a touch-sized circle and shows the selected instrument below it.
const diagram = posterGeometry("letter");
const diagramArea = { x: 50, y: 140, width: diagram.width - 100, height: diagram.height - 236 };
function orbitStyle(index: number, band: "core" | "notation" | "keyboard"): React.CSSProperties {
  type Box = { x: number; y: number; width: number; height: number };
  const node = diagram.nodes[index] as (typeof diagram.nodes)[number] & Record<typeof band, Box>;
  const box = node[band];
  const angle = index * Math.PI / 6;
  const width = band === "notation" ? 132 : box.width;
  const height = band === "notation" ? 82 : box.height;
  // Keep server and browser coordinates identical across math engines.
  const percent = (value: number) => `${Number(value.toFixed(4))}%`;
  return {
    "--card-x": percent((box.x + box.width / 2 - diagramArea.x) / diagramArea.width * 100),
    "--card-y": percent((box.y + box.height / 2 - diagramArea.y) / diagramArea.height * 100),
    "--card-width": percent(width / diagramArea.width * 100),
    "--card-height": percent(height / diagramArea.height * 100),
    "--mobile-x": percent(50 + Math.sin(angle) * 36),
    "--mobile-y": percent(50 - Math.cos(angle) * 36),
  } as React.CSSProperties;
}

const DEFAULT_REVEALED = ["c"];
const CLASSROOM_POSTER_LAYERS: Layer[] = ["signatures", "numbers", "minors", "keyboards", "accidental-order"];

const POSTER_SIZES: Record<PosterSize, { label: string; detail: string; pageSize: string; download: string; filename: string }> = {
  letter: { label: "US Letter", detail: "11 × 8.5 in", pageSize: "11in 8.5in", download: "/posters/circle-of-fourths-letter.pdf", filename: "circle-of-fourths-letter.pdf" },
  a4: { label: "A4", detail: "297 × 210 mm", pageSize: "297mm 210mm", download: "/posters/circle-of-fourths-a4.pdf", filename: "circle-of-fourths-a4.pdf" },
  tabloid: { label: "11 × 17", detail: "Classroom wall", pageSize: "17in 11in", download: "/posters/circle-of-fourths-11x17.pdf", filename: "circle-of-fourths-11x17.pdf" },
};

const QUIZ_FIELDS: { id: QuizField; label: string }[] = [
  { id: "keyName", label: "Key name" },
  { id: "numbers", label: "Accidental count" },
  { id: "signatures", label: "Key signature" },
];

const QUIZ_PRESETS: Record<Exclude<QuizPreset, "custom">, { title: string; directions: string; scope: QuizScope; roles: QuizRoles }> = {
  accidentals: {
    title: "How many accidentals?",
    directions: "Write the number and type of accidentals for each named major key.",
    scope: "full",
    roles: { keyName: "given", numbers: "answer", signatures: "omitted" },
  },
  "key-names": {
    title: "Name that key",
    directions: "Identify each major key from its written key signature.",
    scope: "full",
    roles: { keyName: "answer", numbers: "omitted", signatures: "given" },
  },
  "flat-side": {
    title: "Build the flat side",
    directions: "Begin with C and complete the major-key sequence moving by ascending fourths.",
    scope: "flats",
    roles: { keyName: "answer", numbers: "given", signatures: "omitted" },
  },
};

const DEFAULT_QUIZ = QUIZ_PRESETS.accidentals;

const DEGREE_NAMES: Record<ScaleDegree, string> = {
  1: "Tonic",
  2: "Supertonic",
  3: "Mediant",
  4: "Subdominant",
  5: "Dominant",
  6: "Submediant",
  7: "Leading tone",
};

const SCALE_DEGREES = Object.keys(DEGREE_NAMES).map(Number) as ScaleDegree[];

function AccidentalCount({ type, count }: { type: string; count: number }) {
  return (
    <span className="accidental-count" aria-label={`${count} ${type === "none" ? "accidentals" : type + (count === 1 ? "" : "s")}`}>
      <strong>{count}</strong>
      <span aria-hidden="true">{type === "flat" ? "♭" : type === "sharp" ? "♯" : "—"}</span>
    </span>
  );
}

export type CircleBoardState = {
  orientation: Orientation;
  mode: BoardMode;
  layers: Layer[];
  revealed: string[];
  instrument: Instrument;
  markedDegrees: ScaleDegree[];
  quizPreset: QuizPreset;
  quizScope: QuizScope;
  quizRoles: QuizRoles;
  quizPreview: QuizPreview;
  posterSize: PosterSize;
  presenting: boolean;
  selectedId: string;
  scaleMode: "major" | "minor";
  spellings: Record<string, string>;
};

export function CircleBoard({ initialState }: { initialState: CircleBoardState }) {
  const [orientation, setOrientation] = useState<Orientation>(initialState.orientation);
  const [mode, setMode] = useState<BoardMode>(initialState.mode);
  const [layers, setLayers] = useState<Layer[]>(initialState.layers);
  const [revealed, setRevealed] = useState<string[]>(initialState.revealed);
  const [instrument, setInstrument] = useState<Instrument>(initialState.instrument);
  const [markedDegrees, setMarkedDegrees] = useState<ScaleDegree[]>(initialState.markedDegrees);
  const [quizPreset, setQuizPreset] = useState<QuizPreset>(initialState.quizPreset);
  const [quizScope, setQuizScope] = useState<QuizScope>(initialState.quizScope);
  const [quizRoles, setQuizRoles] = useState<QuizRoles>(initialState.quizRoles);
  const [quizPreview, setQuizPreview] = useState<QuizPreview>(initialState.quizPreview);
  const [posterSize, setPosterSize] = useState<PosterSize>(initialState.posterSize);
  const [presenting, setPresenting] = useState(initialState.presenting);
  const [showLayerPanel, setShowLayerPanel] = useState(false);
  const [selectedId, setSelectedId] = useState(initialState.selectedId);
  const [scaleMode, setScaleMode] = useState(initialState.scaleMode);
  const [spellings, setSpellings] = useState(initialState.spellings);
  const [returnState, setReturnState] = useState<CircleBoardState | null>(null);
  const [shareStatus, setShareStatus] = useState("Copy lesson link");

  const traversal = useMemo(() => getTeachingTraversal(orientation, spellings), [orientation, spellings]);
  const selected = traversal.find((key) => key.id === selectedId) ?? traversal[0];
  const selectedScale = getScaleOctave(selected, scaleMode);
  const degreeName = (degree: ScaleDegree) => degree === 7 && scaleMode === "minor" ? "Subtonic" : DEGREE_NAMES[degree];
  const selectedIndex = traversal.findIndex((key) => key.id === selected.id);
  const focusIds = new Set([
    selected.id,
    traversal[(selectedIndex + traversal.length - 1) % traversal.length].id,
    traversal[(selectedIndex + 1) % traversal.length].id,
  ]);
  const isClassroomPoster = mode === "poster";
  const posterArtwork = useMemo(() => isClassroomPoster ? createPosterSvg(posterSize) : "", [isClassroomPoster, posterSize]);
  const activeQuiz = quizPreset === "custom"
    ? { title: "Custom circle activity", directions: "Complete every blank using the musical information provided." }
    : QUIZ_PRESETS[quizPreset];

  function isInQuizScope(key: { id: string; type: string }) {
    if (quizScope === "full" || key.id === "c") return true;
    return quizScope === "flats" ? key.type === "flat" : key.type === "sharp";
  }

  function effectiveQuizRole(field: QuizField, keyId: string): FieldRole {
    if (quizPreset === "flat-side" && field === "keyName" && keyId === "c") return "given";
    return quizRoles[field];
  }

  useEffect(() => {
    if (mode === "poster") {
      const posterPath = posterSize === "letter" ? "/poster" : posterSize === "a4" ? "/poster/a4" : "/poster/11x17";
      window.history.replaceState(null, "", posterPath);
      return;
    }

    const params = new URLSearchParams();
    params.set("direction", orientation);
    params.set("mode", mode);
    params.set("layers", layers.join(","));
    params.set("key", selectedId);
    if (scaleMode === "minor") params.set("scale", "minor");
    if (Object.keys(spellings).length) params.set("spellings", Object.entries(spellings).sort().map(([id, spelling]) => `${id}:${spelling}`).join(","));
    params.set("instrument", instrument);
    if (markedDegrees.length) params.set("degrees", markedDegrees.join(","));
    if (presenting) params.set("present", "1");
    if (mode === "build") params.set("revealed", revealed.join(","));
    if (mode === "quiz") {
      params.set("quiz", quizPreset);
      params.set("scope", quizScope);
      params.set("roles", QUIZ_FIELDS.map(({ id }) => `${id}:${quizRoles[id]}`).join(","));
      params.set("preview", quizPreview);
    }
    window.history.replaceState(null, "", `/?${params}`);
  }, [instrument, layers, markedDegrees, mode, orientation, posterSize, presenting, quizPreset, quizPreview, quizRoles, quizScope, revealed, selectedId, scaleMode, spellings]);

  function toggleLayer(layer: Layer) {
    setLayers((current) =>
      current.includes(layer) ? current.filter((item) => item !== layer) : [...current, layer],
    );
  }

  function selectKey(id: string) {
    setSelectedId(id);
    if (mode === "build") {
      setRevealed((current) =>
        current.includes(id) ? current : [...current, id],
      );
    }
  }

  function toggleDegree(degree: ScaleDegree) {
    setMarkedDegrees((current) =>
      current.includes(degree) ? current.filter((item) => item !== degree) : [...current, degree].sort(),
    );
  }

  function applyQuizPreset(presetId: Exclude<QuizPreset, "custom">) {
    const preset = QUIZ_PRESETS[presetId];
    setQuizPreset(presetId);
    setQuizScope(preset.scope);
    setQuizRoles({ ...preset.roles });
    if (presetId === "flat-side") {
      setOrientation("fourths");
      setSpellings((current) => ({ ...current, db: "db", "gb-fs": "gb", b: "cb" }));
    }
    setMode("quiz");
  }

  function setQuizFieldRole(field: QuizField, role: FieldRole) {
    setQuizPreset("custom");
    setQuizRoles((current) => ({ ...current, [field]: role }));
  }

  function setCustomQuizScope(scope: QuizScope) {
    setQuizPreset("custom");
    setQuizScope(scope);
  }

  function loadClassroomPoster() {
    if (mode === "poster") return;
    setReturnState({ orientation, mode, layers, revealed, instrument, markedDegrees, quizPreset, quizScope, quizRoles, quizPreview, posterSize, presenting, selectedId, scaleMode, spellings });
    setOrientation("fourths");
    setMode("poster");
    setLayers([...CLASSROOM_POSTER_LAYERS]);
    setInstrument("xylophone");
    setMarkedDegrees([]);
    setPresenting(false);
    setSelectedId("c");
    setShowLayerPanel(false);
  }

  function resetBoard() {
    setOrientation("fourths");
    setMode("build");
    setLayers(["signatures", "numbers", "keyboards"]);
    setRevealed(DEFAULT_REVEALED);
    setInstrument("xylophone");
    setMarkedDegrees([]);
    setQuizPreset("accidentals");
    setQuizScope(DEFAULT_QUIZ.scope);
    setQuizRoles({ ...DEFAULT_QUIZ.roles });
    setQuizPreview("student");
    setPosterSize("letter");
    setPresenting(false);
    setSelectedId("c");
    setScaleMode("major");
    setSpellings({});
    setShowLayerPanel(false);
  }

  function applyBoardState(state: CircleBoardState) {
    setOrientation(state.orientation);
    setMode(state.mode);
    setLayers(state.layers);
    setRevealed(state.revealed);
    setInstrument(state.instrument);
    setMarkedDegrees(state.markedDegrees);
    setQuizPreset(state.quizPreset);
    setQuizScope(state.quizScope);
    setQuizRoles(state.quizRoles);
    setQuizPreview(state.quizPreview);
    setPosterSize(state.posterSize);
    setPresenting(state.presenting);
    setSelectedId(state.selectedId);
    setScaleMode(state.scaleMode);
    setSpellings(state.spellings);
    setShowLayerPanel(false);
  }

  function resetToOpenedLink() {
    if (initialState.mode === "poster") resetBoard();
    else applyBoardState(initialState);
  }

  function returnToTeachingBoard() {
    if (returnState) applyBoardState(returnState);
    else resetBoard();
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShareStatus("Link copied");
    } catch {
      setShareStatus("Copy from address bar");
    }
    window.setTimeout(() => setShareStatus("Copy lesson link"), 1800);
  }

  return (
    <main className={`app-shell ${presenting ? "is-presenting" : ""} ${isClassroomPoster ? `poster-size-${posterSize}` : ""}`}>
      {isClassroomPoster && (
        <style>{`@media print { @page { size: ${POSTER_SIZES[posterSize].pageSize}; margin: 0.35in; } }`}</style>
      )}
      {presenting && (
        <button type="button" className="exit-presentation no-print" onClick={() => setPresenting(false)}>
          Exit presentation
        </button>
      )}
      <header className="topbar hide-when-presenting no-print">
        <div>
          <p className="eyebrow">Backwerd Rhythm Shop · classroom prototype</p>
          <h1>Circle of Fourths</h1>
          <p className="subtitle">Start with one key. Build the relationship.</p>
        </div>
        <div className="header-actions no-print">
          <button type="button" className="quiet-button poster-preset-button" onClick={loadClassroomPoster}>
            Standard poster
          </button>
          <button type="button" className="quiet-button" onClick={copyLink}>
            {shareStatus}
          </button>
          {!isClassroomPoster && (
            <button type="button" className="quiet-button" onClick={() => window.print()}>
              Print current board
            </button>
          )}
        </div>
      </header>

      {!isClassroomPoster && <section className="toolbar no-print hide-when-presenting" aria-label="Board controls">
        <div className="control-group compact-group" aria-label="Direction">
          <span className="control-label">Direction</span>
          <button
            type="button"
            aria-pressed={orientation === "fourths"}
            onClick={() => setOrientation("fourths")}
          >
            Fourths
          </button>
          <button
            type="button"
            aria-pressed={orientation === "fifths"}
            onClick={() => {
              setOrientation("fifths");
              if (quizPreset === "flat-side") setQuizPreset("custom");
            }}
          >
            Fifths
          </button>
        </div>
        <div className="control-group compact-group" aria-label="Board mode">
          <span className="control-label">Teach</span>
          <button type="button" aria-pressed={mode === "build"} onClick={() => setMode("build")}>
            Build
          </button>
          <button type="button" aria-pressed="false" onClick={loadClassroomPoster}>
            Standard poster
          </button>
          <button
            type="button"
            aria-pressed={mode === "focus"}
            onClick={() => setMode("focus")}
          >
            Focus
          </button>
          <button type="button" aria-pressed={mode === "quiz"} onClick={() => setMode("quiz")}>
            Quiz
          </button>
        </div>
        <div className="control-group compact-group board-tools" aria-label="Board actions">
          {mode === "build" && (
            <>
              <button type="button" onClick={() => setRevealed(traversal.map((key) => key.id))}>Reveal all</button>
              <button type="button" onClick={() => setRevealed([])}>Hide all</button>
              <button type="button" disabled={!revealed.includes(selectedId)} onClick={() => setRevealed(current => current.filter(id => id !== selectedId))}>Hide selected</button>
            </>
          )}
          {mode !== "quiz" && (
            <button
              type="button"
              className="layers-button"
              aria-expanded={showLayerPanel}
              onClick={() => setShowLayerPanel((current) => !current)}
            >
              Layers <span>{layers.length}</span>
            </button>
          )}
          <button type="button" className="present-button" onClick={() => setPresenting(true)}>Present</button>
        </div>
        <div className="control-group compact-group reset-actions">
          <button type="button" onClick={resetToOpenedLink}>Reset link</button>
          <button type="button" className="reset-button" onClick={resetBoard}>Start fresh</button>
        </div>
      </section>}

      {isClassroomPoster && !presenting && (
        <section className="poster-ready-panel no-print" aria-label="Classroom poster ready">
          <div>
            <strong>Standard classroom poster</strong>
            <span>Choose a size and download the finished PDF. No browser print settings required.</span>
            <a className="poster-full-size" href={POSTER_SIZES[posterSize].download.replace(/\.pdf$/, ".svg")} target="_blank" rel="noreferrer">Open full-size preview</a>
          </div>
          <fieldset className="poster-size-picker" aria-label="Poster paper size">
            <legend>Poster size</legend>
            {(Object.keys(POSTER_SIZES) as PosterSize[]).map((size) => (
              <button key={size} type="button" aria-pressed={posterSize === size} onClick={() => setPosterSize(size)}>
                <strong>{POSTER_SIZES[size].label}</strong>
                <span>{POSTER_SIZES[size].detail}</span>
              </button>
            ))}
          </fieldset>
          <a
            className="poster-download"
            href={POSTER_SIZES[posterSize].download}
            download={POSTER_SIZES[posterSize].filename}
          >
            Download {POSTER_SIZES[posterSize].label} PDF
          </a>
          <button type="button" className="poster-return" onClick={returnToTeachingBoard}>{returnState ? "Return to teaching board" : "Open teaching board"}</button>
        </section>
      )}

      {showLayerPanel && mode !== "quiz" && !presenting && (
        <section className="layer-panel no-print" aria-label="Layer and display options">
          <div>
            <span className="control-label">Information bands</span>
            <button type="button" aria-pressed={layers.includes("signatures")} onClick={() => toggleLayer("signatures")}>Key signatures</button>
            <button type="button" aria-pressed={layers.includes("numbers")} onClick={() => toggleLayer("numbers")}>Accidental numbers</button>
            <button type="button" aria-pressed={layers.includes("minors")} onClick={() => toggleLayer("minors")}>Relative minors</button>
            <button type="button" aria-pressed={layers.includes("keyboards")} onClick={() => toggleLayer("keyboards")}>Keyboards</button>
            <button type="button" aria-pressed={layers.includes("accidental-order")} onClick={() => toggleLayer("accidental-order")}>BEADGCF order</button>
          </div>
          <div>
            <span className="control-label">Keyboard style</span>
            <button type="button" aria-pressed={instrument === "xylophone"} onClick={() => setInstrument("xylophone")}>Xylophone</button>
            <button type="button" aria-pressed={instrument === "piano"} onClick={() => setInstrument("piano")}>Piano</button>
          </div>
          <div className="note-role-controls">
            <span className="control-label">Note roles</span>
            {scaleMode === "major" && <><button type="button" className="role-preset" aria-pressed={markedDegrees.length === 1 && markedDegrees[0] === 4} onClick={() => setMarkedDegrees([4])}>
              Flat lesson · 4th
            </button>
            <button type="button" className="role-preset" aria-pressed={markedDegrees.length === 1 && markedDegrees[0] === 7} onClick={() => setMarkedDegrees([7])}>
              Sharp lesson · 7th
            </button></>}
            {SCALE_DEGREES.map((degree) => (
              <button key={degree} type="button" aria-pressed={markedDegrees.includes(degree)} onClick={() => toggleDegree(degree)}>
                <strong>{degree}</strong> {degreeName(degree)}
              </button>
            ))}
            {markedDegrees.length > 0 && <button type="button" className="clear-roles" onClick={() => setMarkedDegrees([])}>Clear roles</button>}
          </div>
        </section>
      )}

      {mode === "quiz" && !presenting && (
        <section className="quiz-builder no-print" aria-label="Quiz Builder controls">
          <div className="quiz-builder-heading">
            <div>
              <span className="control-label">Quiz Builder v0.1</span>
              <strong>{activeQuiz.title}</strong>
            </div>
            <p>Start from a ready-made activity, then change its scope or field roles.</p>
          </div>
          <div className="quiz-builder-grid">
            <fieldset>
              <legend>Ready-made activity</legend>
              {(Object.keys(QUIZ_PRESETS) as Exclude<QuizPreset, "custom">[]).map((presetId) => (
                <button key={presetId} type="button" aria-pressed={quizPreset === presetId} onClick={() => applyQuizPreset(presetId)}>
                  {QUIZ_PRESETS[presetId].title}
                </button>
              ))}
            </fieldset>
            <fieldset>
              <legend>Scope</legend>
              {(["full", "flats", "sharps"] as QuizScope[]).map((scope) => (
                <button key={scope} type="button" aria-pressed={quizScope === scope} onClick={() => setCustomQuizScope(scope)}>
                  {scope === "full" ? "Full circle" : scope === "flats" ? "Flat side" : "Sharp side"}
                </button>
              ))}
            </fieldset>
            <fieldset className="field-role-editor">
              <legend>What students see and supply</legend>
              {QUIZ_FIELDS.map((field) => (
                <div className="field-role-row" key={field.id}>
                  <span>{field.label}</span>
                  {(["given", "answer", "omitted"] as FieldRole[]).map((role) => (
                    <button key={role} type="button" aria-pressed={quizRoles[field.id] === role} onClick={() => setQuizFieldRole(field.id, role)}>
                      {role[0].toUpperCase() + role.slice(1)}
                    </button>
                  ))}
                </div>
              ))}
            </fieldset>
            <fieldset>
              <legend>Preview</legend>
              <button type="button" aria-pressed={quizPreview === "student"} onClick={() => setQuizPreview("student")}>Student</button>
              <button type="button" aria-pressed={quizPreview === "answer"} onClick={() => setQuizPreview("answer")}>Answer key</button>
              <button type="button" className="print-quiz" onClick={() => window.print()}>Print / Save PDF</button>
            </fieldset>
          </div>
        </section>
      )}

      {!isClassroomPoster && mode !== "quiz" && (
        <section className="relationship-controls" aria-label="Key relationships">
          <fieldset className="scale-mode-control">
            <legend>Explore the scale</legend>
            <button type="button" aria-pressed={scaleMode === "major"} onClick={() => setScaleMode("major")}>Major</button>
            <button type="button" aria-pressed={scaleMode === "minor"} onClick={() => setScaleMode("minor")}>Relative minor</button>
          </fieldset>
          {selected.spellings.length > 1 && <fieldset className="enharmonic-control">
            <legend>Enharmonic spelling</legend>
            {selected.spellings.map(spelling => <button type="button" key={spelling.spellingId} aria-pressed={selected.spellingId === spelling.spellingId} onClick={() => {
              setSpellings(current => ({ ...current, [selected.id]: spelling.spellingId }));
              if (quizPreset === "flat-side") setQuizPreset("custom");
            }}>{spelling.label} major</button>)}
            <span>Same bars · different note names</span>
          </fieldset>}
          <p>{selected.label} major · {selected.relativeMinor}<br /><span>Same signature · different tonic</span></p>
        </section>
      )}

      <section className={`board-layout ${mode === "quiz" ? "is-quiz-layout" : ""} ${isClassroomPoster ? "is-classroom-poster-layout" : ""}`}>
        <section className="lesson-board" aria-label="Framed circle teaching board">
          {isClassroomPoster ? (
            <div className="poster-artwork" dangerouslySetInnerHTML={{ __html: posterArtwork }} />
          ) : <>
          <header className="board-frame-header">
            <div>
              <span className="board-kicker">{mode === "quiz" ? "Circle activity" : isClassroomPoster ? "Classroom reference poster" : "Teaching board"}</span>
              <strong>{mode === "quiz" ? activeQuiz.title : `Circle of ${orientation === "fourths" ? "Fourths" : "Fifths"}`}</strong>
            </div>
              <span>{mode === "build" ? "Progressive build" : mode === "focus" ? "Relationship focus" : mode === "quiz" ? (quizPreview === "student" ? "Student worksheet" : "Teacher answer key") : "Complete poster"}{mode !== "quiz" && layers.includes("keyboards") ? ` · ${instrument}` : ""}</span>
          </header>
          {mode === "quiz" && (
            <section className="worksheet-meta" aria-label="Worksheet information">
              <div>
                <h2>{activeQuiz.title}</h2>
                <p>{activeQuiz.directions}</p>
              </div>
              <div className="student-lines">
                <span>Name <i /></span>
                <span>Date <i /></span>
                <span>Class <i /></span>
              </div>
              {quizPreview === "answer" && <strong className="answer-key-stamp">Answer key</strong>}
            </section>
          )}
          <p className="mobile-board-hint">Tap a key to explore its signature and keyboard below.</p>
          <div className={`circle-stage ${mode !== "quiz" && layers.includes("keyboards") ? "has-keyboards" : ""}`} style={{ aspectRatio: `${diagramArea.width} / ${diagramArea.height}` }} aria-label={`Circle of ${orientation}`}>
          <div className="circle-ring" aria-hidden="true" />
          {traversal.map((key, index) => {
            const angle = index * 30;
            const keyScale = getScaleOctave(key, mode === "quiz" ? "major" : scaleMode);
            const quizActive = mode === "quiz";
            const inQuizScope = !quizActive || isInQuizScope(key);
            const visible = quizActive || mode === "focus" || revealed.includes(key.id);
            const dimmed = (mode === "focus" && !focusIds.has(key.id)) || (quizActive && !inQuizScope);
            const keyNameRole = effectiveQuizRole("keyName", key.id);
            const numberRole = effectiveQuizRole("numbers", key.id);
            const signatureRole = effectiveQuizRole("signatures", key.id);
            const showQuizAnswers = quizPreview === "answer";
            const quizCoreLabel = [
              `Quiz position ${index + 1}`,
              keyNameRole === "omitted" ? null : keyNameRole === "answer" && !showQuizAnswers ? "Blank for major key name" : `${key.label} major`,
              numberRole === "omitted" ? null : numberRole === "answer" && !showQuizAnswers ? "Blank for accidental count" : key.signatureLabel,
            ].filter(Boolean).join("; ");
            return (
              <div
                key={key.id}
                className={`key-orbit-group ${dimmed ? "is-dimmed" : ""} ${quizActive && !inQuizScope ? "is-out-of-scope" : ""}`}
                style={{ "--angle": `${angle}deg` } as React.CSSProperties}
                aria-hidden={quizActive && !inQuizScope ? true : undefined}
              >
                <button
                  type="button"
                  className={`key-card core-node ${visible ? "is-visible" : "is-covered"} ${!quizActive && selectedId === key.id ? "is-selected" : ""} ${quizActive ? "is-quiz-card" : ""}`}
                  aria-label={quizActive ? quizCoreLabel : visible ? `${keyScale.label}, ${key.signatureLabel}; ${key.label} major and ${key.relativeMinor}` : `Reveal key at position ${index + 1}`}
                  aria-pressed={visible}
                  disabled={quizActive && !inQuizScope}
                  style={orbitStyle(index, "core")}
                  onClick={() => selectKey(key.id)}
                >
                  {visible ? (
                    <>
                      {quizActive ? (
                        <>
                          {keyNameRole === "answer" && !showQuizAnswers
                            ? <span className="quiz-blank quiz-key-name-blank" aria-label="Blank for major key name" />
                            : keyNameRole !== "omitted" && <span className={`key-name ${keyNameRole === "answer" ? "quiz-answer" : ""}`}>{key.label}</span>}
                          {numberRole === "answer" && !showQuizAnswers
                            ? <span className="quiz-count-blank" aria-label="Blank for accidental count" />
                            : numberRole !== "omitted" && <span className={numberRole === "answer" ? "quiz-answer" : ""}><AccidentalCount type={key.type} count={key.count} /></span>}
                        </>
                      ) : (
                        <>
                          <span className="key-name">{keyScale.tonic}</span>
                          {layers.includes("numbers") && <AccidentalCount type={key.type} count={key.count} />}
                        </>
                      )}
                    </>
                  ) : <span className="covered-mark">+</span>}
                </button>
                {visible && (quizActive ? signatureRole !== "omitted" : layers.includes("signatures") || layers.includes("minors")) && (
                  <span className="orbit-layer notation-node" style={orbitStyle(index, "notation")} aria-hidden={quizActive ? undefined : true}>
                    {quizActive ? (
                      signatureRole === "answer" && !showQuizAnswers
                        ? <span className="quiz-signature-blank"><KeySignature type="none" count={0} compact label="Blank key signature staff" /></span>
                        : <span className={signatureRole === "answer" ? "quiz-answer" : ""}><KeySignature type={key.type} count={key.count} compact /></span>
                    ) : (
                      <>
                        {layers.includes("signatures") && <><span className="notation-major">{key.label} major</span><KeySignature type={key.type} count={key.count} compact /></>}
                        {layers.includes("minors") && <span className="minor-name">Relative minor: {key.relativeMinor.replace(/ minor$/, "")}</span>}
                      </>
                    )}
                  </span>
                )}
                {visible && !quizActive && layers.includes("keyboards") && (
                  <span className="orbit-layer keyboard-node" style={orbitStyle(index, "keyboard")}>
                    <span className="keyboard-label">{keyScale.label}</span>
                    <ScaleKeyboard musicKey={key} scaleMode={scaleMode} instrument={instrument} markedDegrees={markedDegrees} compact />
                  </span>
                )}
              </div>
            );
          })}
          <div className={`circle-center ${layers.includes("accidental-order") ? "shows-order" : ""}`}>
            {mode === "quiz" ? (
              <>
                <span>{quizPreview === "student" ? "Student worksheet" : "Answer key"}</span>
                <strong>{quizScope === "full" ? "12 keys" : quizScope === "flats" ? "Flat side" : "Sharp side"}</strong>
                <small>Circle of {orientation}</small>
              </>
            ) : layers.includes("accidental-order") ? (
              <>
                <span>Order of flats</span>
                <strong className="accidental-order">B E A D G C F</strong>
                <small>Sharps reverse: F C G D A E B</small>
              </>
            ) : (
              <>
                <span>{mode === "build" ? "Build mode" : mode === "focus" ? "Focus mode" : "Poster mode"}</span>
                <strong>{selectedScale.tonic}</strong>
                <small>{scaleMode === "minor" ? "Natural minor" : "Major"} · {selected.signatureLabel}</small>
              </>
            )}
          </div>
          </div>
          </>}
        </section>

        {mode !== "quiz" && !isClassroomPoster && <aside className="detail-panel hide-when-presenting" aria-live="polite">
          <p className="eyebrow">Selected key</p>
          <div className="detail-key-heading">
            <h2>{selectedScale.label}</h2>
            {layers.includes("numbers") && <AccidentalCount type={selected.type} count={selected.count} />}
          </div>
          {layers.includes("signatures") && <KeySignature type={selected.type} count={selected.count} />}
          <dl>
            <div>
              <dt>Signature</dt>
              <dd>{selected.signatureLabel}</dd>
            </div>
            <div>
              <dt>Accidentals</dt>
              <dd>{selected.accidentals.length ? selected.accidentals.join(" · ") : "None"}</dd>
            </div>
            <div>
              <dt>Relative minor</dt>
              <dd>{selected.relativeMinor}</dd>
            </div>
          </dl>
          <p className="relative-explanation">
            <strong>{selected.label} major and {selected.relativeMinor}</strong> share this key signature.
            {" "}Their home notes are {selected.label} and {selected.relativeMinor.replace(/ minor$/, "")}.
            {scaleMode === "minor" && " This is the natural minor scale; its tonic is the major scale’s sixth degree."}
          </p>
          {layers.includes("keyboards") && (
            <section className="scale-detail" aria-label="Selected scale keyboard">
              <h3>{selectedScale.label} scale</h3>
              <p className="keyboard-guide">About 1½ octaves of {instrument === "piano" ? "keys" : "bars"} · one octave highlighted</p>
              <ScaleKeyboard musicKey={selected} scaleMode={scaleMode} instrument={instrument} markedDegrees={markedDegrees} />
              <p className="keyboard-guide">Green = scale note · dark outline = tonic</p>
              {markedDegrees.length > 0 && <p className="role-summary">Numbered marks: {markedDegrees.map(degree => `${degree} ${degreeName(degree)}`).join(" · ")}</p>}
            </section>
          )}
          <p className="teacher-tip">
            {mode === "build"
              ? "Select a position to reveal or explore its key. Use Hide selected to cover it again."
              : mode === "focus"
                ? "Select a key to emphasize its immediate fourths and fifths relationships."
                : "Poster mode keeps the complete reference visible."}
          </p>
        </aside>}
      </section>

      <footer className="hide-when-presenting no-print">
        <span>Fourth-first for band classrooms.</span>
        <span>Flip once to see the same relationships as fifths.</span>
      </footer>
    </main>
  );
}
