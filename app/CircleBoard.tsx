"use client";

import { useEffect, useMemo, useState } from "react";
import { getTraversal } from "@/lib/music-model.mjs";

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

const DEFAULT_REVEALED = ["c"];
const CLASSROOM_POSTER_LAYERS: Layer[] = ["signatures", "numbers", "minors", "keyboards", "accidental-order"];

const POSTER_SIZES: Record<PosterSize, { label: string; detail: string; pageSize: string }> = {
  letter: { label: "US Letter", detail: "11 × 8.5 in", pageSize: "11in 8.5in" },
  a4: { label: "A4", detail: "297 × 210 mm", pageSize: "297mm 210mm" },
  tabloid: { label: "11 × 17", detail: "Classroom wall", pageSize: "17in 11in" },
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

function getScaleDegree(scale: number[], pitchClass: number) {
  const index = scale.indexOf(pitchClass);
  return index === -1 ? null : (index + 1) as ScaleDegree;
}

const STAFF_POSITIONS = {
  flat: [50, 26, 58, 34, 66, 42, 74],
  sharp: [18, 42, 66, 34, 58, 26, 50],
};

const NATURAL_BARS = [
  ["C4", 0], ["D4", 2], ["E4", 4], ["F4", 5], ["G4", 7], ["A4", 9], ["B4", 11],
  ["C5", 0], ["D5", 2], ["E5", 4], ["F5", 5], ["G5", 7], ["A5", 9], ["B5", 11],
  ["C6", 0],
] as const;

const ACCIDENTAL_BARS = [
  ["C♯4 / D♭4", 1, 1], ["D♯4 / E♭4", 3, 2], ["F♯4 / G♭4", 6, 4], ["G♯4 / A♭4", 8, 5],
  ["A♯4 / B♭4", 10, 6], ["C♯5 / D♭5", 1, 8], ["D♯5 / E♭5", 3, 9], ["F♯5 / G♭5", 6, 11],
  ["G♯5 / A♭5", 8, 12], ["A♯5 / B♭5", 10, 13],
] as const;

const MINI_NATURAL_BARS = [
  ["C", 0], ["D", 2], ["E", 4], ["F", 5], ["G", 7], ["A", 9], ["B", 11], ["C", 0],
] as const;

const MINI_ACCIDENTAL_BARS = [
  [1, 1], [3, 2], [6, 4], [8, 5], [10, 6],
] as const;

function KeySignature({ type, count, compact = false }: { type: string; count: number; compact?: boolean }) {
  const accidental = type === "flat" ? "♭" : "♯";
  const positions = type === "flat" ? STAFF_POSITIONS.flat : STAFF_POSITIONS.sharp;

  return (
    <span
      className={`key-signature ${compact ? "is-compact" : ""}`}
      role="img"
      aria-label={count === 0 ? "No accidentals" : `${count} ${type}${count === 1 ? "" : "s"}`}
    >
      <span className="staff-lines" aria-hidden="true" />
      {count > 0 &&
        positions.slice(0, count).map((top, index) => (
          <span
            className="staff-accidental"
            style={{ "--staff-top": `${top}%`, "--staff-index": index } as React.CSSProperties}
            aria-hidden="true"
            key={`${type}-${index}`}
          >
            {accidental}
          </span>
        ))}
    </span>
  );
}

function AccidentalCount({ type, count }: { type: string; count: number }) {
  return (
    <span className="accidental-count" aria-label={`${count} ${type === "none" ? "accidentals" : type + (count === 1 ? "" : "s")}`}>
      <strong>{count}</strong>
      <span aria-hidden="true">{type === "flat" ? "♭" : type === "sharp" ? "♯" : "—"}</span>
    </span>
  );
}

function MiniScaleKeyboard({ label, scale, instrument, markedDegrees }: { label: string; scale: number[]; instrument: Instrument; markedDegrees: ScaleDegree[] }) {
  const roleSummary = markedDegrees.map((degree) => `${degree} ${DEGREE_NAMES[degree]}`).join(", ");
  return (
    <span className={`mini-keyboard is-${instrument}`} role="img" aria-label={`${label} major scale on a one-octave ${instrument}${roleSummary ? `; marked roles: ${roleSummary}` : ""}`}>
      <span className="mini-natural-bars" aria-hidden="true">
        {MINI_NATURAL_BARS.map(([name, pitchClass], index) => {
          const degree = getScaleDegree(scale, pitchClass);
          const isMarked = degree !== null && markedDegrees.includes(degree);
          return <span key={`${name}-${index}`} data-degree={isMarked ? degree : undefined} className={`mini-bar natural ${degree ? "is-scale-tone" : ""} ${isMarked ? "is-role-marked" : ""}`} />;
        })}
      </span>
      <span className="mini-accidental-bars" aria-hidden="true">
        {MINI_ACCIDENTAL_BARS.map(([pitchClass, afterNatural]) => {
          const degree = getScaleDegree(scale, pitchClass);
          const isMarked = degree !== null && markedDegrees.includes(degree);
          return <span key={pitchClass} data-degree={isMarked ? degree : undefined} className={`mini-bar accidental ${degree ? "is-scale-tone" : ""} ${isMarked ? "is-role-marked" : ""}`} style={{ "--bar-left": `${(afterNatural / MINI_NATURAL_BARS.length) * 100}%` } as React.CSSProperties} />;
        })}
      </span>
    </span>
  );
}

function PracticeKeyboard({ label, scale, instrument, markedDegrees }: { label: string; scale: number[]; instrument: Instrument; markedDegrees: ScaleDegree[] }) {
  return (
    <section className="marimba-section" aria-labelledby="marimba-heading">
      <div className="marimba-heading-row">
        <div>
          <p className="eyebrow" id="marimba-heading">Practice {instrument}</p>
          <h3>{label} major scale</h3>
        </div>
        <span className={`marimba-legend ${markedDegrees.length ? "shows-roles" : ""}`}>
          {markedDegrees.length > 0 && <><i className="role-swatch" /> outlined = selected role</>}
          <i className="scale-swatch" /> lit = scale tone
        </span>
      </div>
      {markedDegrees.length > 0 && (
        <div className="role-summary" aria-label="Selected scale-degree roles">
          {markedDegrees.map((degree) => <span key={degree}><strong>{degree}</strong> {DEGREE_NAMES[degree]}</span>)}
        </div>
      )}
      <div className={`practice-marimba is-${instrument}`} role="list" aria-label={`Two-octave practice ${instrument} with the ${label} major scale highlighted`}>
        <div className="natural-bars">
          {NATURAL_BARS.map(([name, pitchClass]) => {
            const isScaleTone = scale.includes(pitchClass);
            const degree = getScaleDegree(scale, pitchClass);
            const isMarked = degree !== null && markedDegrees.includes(degree);
            return (
              <span
                key={name}
                role="listitem"
                aria-label={`${name}, ${isMarked ? `degree ${degree}, ${DEGREE_NAMES[degree]}` : isScaleTone ? "scale tone" : "not in scale"}`}
                className={`mallet-bar natural ${isScaleTone ? "is-scale-tone" : ""} ${isMarked ? "is-role-marked" : ""}`}
              >
                <span aria-hidden="true">{name.replace(/\d/, "")}</span>
                {isMarked && <b className="degree-badge" aria-hidden="true">{degree}</b>}
              </span>
            );
          })}
        </div>
        <div className="accidental-bars">
          {ACCIDENTAL_BARS.map(([name, pitchClass, afterNatural]) => {
            const isScaleTone = scale.includes(pitchClass);
            const degree = getScaleDegree(scale, pitchClass);
            const isMarked = degree !== null && markedDegrees.includes(degree);
            return (
              <span
                key={name}
                title={name}
                role="listitem"
                aria-label={`${name}, ${isMarked ? `degree ${degree}, ${DEGREE_NAMES[degree]}` : isScaleTone ? "scale tone" : "not in scale"}`}
                className={`mallet-bar accidental ${isScaleTone ? "is-scale-tone" : ""} ${isMarked ? "is-role-marked" : ""}`}
                style={{ "--bar-left": `${(afterNatural / NATURAL_BARS.length) * 100}%` } as React.CSSProperties}
              >
                {isMarked && <b className="degree-badge" aria-hidden="true">{degree}</b>}
              </span>
            );
          })}
        </div>
      </div>
    </section>
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
  const [selectedId, setSelectedId] = useState("c");
  const [shareStatus, setShareStatus] = useState("Copy lesson link");

  const traversal = useMemo(() => getTraversal(orientation), [orientation]);
  const selected = traversal.find((key) => key.id === selectedId) ?? traversal[0];
  const selectedIndex = traversal.findIndex((key) => key.id === selected.id);
  const focusIds = new Set([
    selected.id,
    traversal[(selectedIndex + traversal.length - 1) % traversal.length].id,
    traversal[(selectedIndex + 1) % traversal.length].id,
  ]);
  const isClassroomPoster = mode === "poster";
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
    if (layers.length) params.set("layers", layers.join(","));
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
    window.history.replaceState(null, "", `${window.location.pathname}?${params}`);
  }, [instrument, layers, markedDegrees, mode, orientation, posterSize, presenting, quizPreset, quizPreview, quizRoles, quizScope, revealed]);

  function toggleLayer(layer: Layer) {
    setLayers((current) =>
      current.includes(layer) ? current.filter((item) => item !== layer) : [...current, layer],
    );
  }

  function selectKey(id: string) {
    setSelectedId(id);
    if (mode === "build") {
      setRevealed((current) =>
        current.includes(id) ? current.filter((keyId) => keyId !== id) : [...current, id],
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
    setLayers(["signatures", "numbers"]);
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
  }

  function resetToOpenedLink() {
    setOrientation(initialState.orientation);
    setMode(initialState.mode);
    setLayers(initialState.layers);
    setRevealed(initialState.revealed);
    setInstrument(initialState.instrument);
    setMarkedDegrees(initialState.markedDegrees);
    setQuizPreset(initialState.quizPreset);
    setQuizScope(initialState.quizScope);
    setQuizRoles(initialState.quizRoles);
    setQuizPreview(initialState.quizPreview);
    setPosterSize(initialState.posterSize);
    setPresenting(initialState.presenting);
    setSelectedId("c");
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
          <button type="button" className="quiet-button" onClick={() => window.print()}>
            Print current board
          </button>
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
            onClick={() => setOrientation("fifths")}
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
            <span>Choose a paper size, then select the same size in your browser’s print dialog.</span>
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
          <button type="button" onClick={() => window.print()}>Print poster / Save PDF</button>
          <button type="button" className="poster-return" onClick={resetToOpenedLink}>Return to opened board</button>
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
            <button type="button" className="role-preset" aria-pressed={markedDegrees.length === 1 && markedDegrees[0] === 4} onClick={() => setMarkedDegrees([4])}>
              Flat lesson · 4th
            </button>
            <button type="button" className="role-preset" aria-pressed={markedDegrees.length === 1 && markedDegrees[0] === 7} onClick={() => setMarkedDegrees([7])}>
              Sharp lesson · 7th
            </button>
            {SCALE_DEGREES.map((degree) => (
              <button key={degree} type="button" aria-pressed={markedDegrees.includes(degree)} onClick={() => toggleDegree(degree)}>
                <strong>{degree}</strong> {DEGREE_NAMES[degree]}
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

      <section className={`board-layout ${mode === "quiz" ? "is-quiz-layout" : ""} ${isClassroomPoster ? "is-classroom-poster-layout" : ""}`}>
        <section className="lesson-board" aria-label="Framed circle teaching board">
          {isClassroomPoster ? (
            <header className="standard-poster-masthead">
              <div>
                <span>Backwerd Rhythm Shop · Classroom Reference</span>
                <h2>Circle of Fourths</h2>
                <p>Major keys · accidental counts · key signatures · relative minors · xylophone scales</p>
              </div>
              <aside>
                <strong>C starts at twelve o’clock.</strong>
                <span>Move clockwise through the flat keys—the fourths-first path used in many band rooms.</span>
              </aside>
            </header>
          ) : <header className="board-frame-header">
            <div>
              <span className="board-kicker">{mode === "quiz" ? "Circle activity" : isClassroomPoster ? "Classroom reference poster" : "Teaching board"}</span>
              <strong>{mode === "quiz" ? activeQuiz.title : `Circle of ${orientation === "fourths" ? "Fourths" : "Fifths"}`}</strong>
            </div>
              <span>{mode === "build" ? "Progressive build" : mode === "focus" ? "Relationship focus" : mode === "quiz" ? (quizPreview === "student" ? "Student worksheet" : "Teacher answer key") : "Complete poster"}{mode !== "quiz" && layers.includes("keyboards") ? ` · ${instrument}` : ""}</span>
          </header>}
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
          <div className={`circle-stage ${mode !== "quiz" && layers.includes("keyboards") ? "has-keyboards" : ""}`} aria-label={`Circle of ${orientation}`}>
          <div className="circle-ring" aria-hidden="true" />
          {traversal.map((key, index) => {
            const angle = index * 30;
            const quizActive = mode === "quiz";
            const inQuizScope = !quizActive || isInQuizScope(key);
            const visible = quizActive || mode === "poster" || mode === "focus" || revealed.includes(key.id);
            const dimmed = (mode === "focus" && !focusIds.has(key.id)) || (quizActive && !inQuizScope);
            const keyNameRole = effectiveQuizRole("keyName", key.id);
            const numberRole = effectiveQuizRole("numbers", key.id);
            const signatureRole = effectiveQuizRole("signatures", key.id);
            const showQuizAnswers = quizPreview === "answer";
            return (
              <div
                key={key.id}
                className={`key-orbit-group ${dimmed ? "is-dimmed" : ""} ${quizActive && !inQuizScope ? "is-out-of-scope" : ""}`}
                style={{ "--angle": `${angle}deg` } as React.CSSProperties}
              >
                <button
                  type="button"
                  className={`key-card core-node ${visible ? "is-visible" : "is-covered"} ${!quizActive && selectedId === key.id ? "is-selected" : ""} ${quizActive ? "is-quiz-card" : ""}`}
                  aria-label={quizActive ? `Quiz position ${index + 1}` : visible ? `${key.label} major, ${key.signatureLabel}, ${key.relativeMinor}` : `Reveal key at position ${index + 1}`}
                  aria-pressed={visible}
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
                          <span className="key-name">{key.label}</span>
                          {layers.includes("numbers") && <AccidentalCount type={key.type} count={key.count} />}
                        </>
                      )}
                    </>
                  ) : <span className="covered-mark">+</span>}
                </button>
                {visible && (quizActive ? signatureRole !== "omitted" : layers.includes("signatures") || layers.includes("minors")) && (
                  <span className="orbit-layer notation-node" aria-hidden="true">
                    {quizActive ? (
                      signatureRole === "answer" && !showQuizAnswers
                        ? <span className="quiz-signature-blank"><span className="staff-lines" /></span>
                        : <span className={signatureRole === "answer" ? "quiz-answer" : ""}><KeySignature type={key.type} count={key.count} compact /></span>
                    ) : (
                      <>
                        {layers.includes("signatures") && <KeySignature type={key.type} count={key.count} compact />}
                        {layers.includes("minors") && <span className="minor-name">{key.relativeMinor}</span>}
                      </>
                    )}
                  </span>
                )}
                {visible && !quizActive && layers.includes("keyboards") && (
                  <span className="orbit-layer keyboard-node">
                    <MiniScaleKeyboard label={key.label} scale={key.scalePitchClasses} instrument={instrument} markedDegrees={markedDegrees} />
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
                <strong>{selected.label}</strong>
                <small>{selected.signatureLabel}</small>
              </>
            )}
          </div>
          </div>
          {isClassroomPoster && (
            <>
              <div className="poster-reference-legend" aria-label="Poster legend">
                <span><strong>Core</strong> Major key · accidental count</span>
                <span><strong>Middle</strong> Key signature · relative minor</span>
                <span><strong>Outer</strong> Major scale on xylophone</span>
                <span><strong>Center</strong> Flat and sharp order</span>
              </div>
              <footer className="standard-poster-footer">
                <span>Fourth-first for band classrooms · {POSTER_SIZES[posterSize].label}</span>
                <strong>BACKWERD RHYTHM SHOP</strong>
                <span>Flip the relationship—not the facts—to study fifths.</span>
              </footer>
            </>
          )}
        </section>

        {mode !== "quiz" && !isClassroomPoster && <aside className="detail-panel hide-when-presenting" aria-live="polite">
          <p className="eyebrow">Selected key</p>
          <div className="detail-key-heading">
            <h2>{selected.label} major</h2>
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
          {layers.includes("keyboards") && (
            <PracticeKeyboard
              label={selected.label}
              scale={selected.scalePitchClasses}
              instrument={instrument}
              markedDegrees={markedDegrees}
            />
          )}
          <p className="teacher-tip">
            {mode === "build"
              ? "Select a covered position to reveal it as the lesson grows."
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
