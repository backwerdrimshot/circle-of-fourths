"use client";

import { useEffect, useMemo, useState } from "react";
import { getTraversal } from "@/lib/music-model.mjs";

type Orientation = "fourths" | "fifths";
type BoardMode = "build" | "poster" | "focus";
type Layer = "signatures" | "numbers" | "keyboards" | "minors" | "accidental-order";
type Instrument = "xylophone" | "piano";

const DEFAULT_REVEALED = ["c"];

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

function MiniScaleKeyboard({ label, tonic, scale, instrument }: { label: string; tonic: number; scale: number[]; instrument: Instrument }) {
  return (
    <span className={`mini-keyboard is-${instrument}`} role="img" aria-label={`${label} major scale on a one-octave ${instrument}`}>
      <span className="mini-natural-bars" aria-hidden="true">
        {MINI_NATURAL_BARS.map(([name, pitchClass], index) => (
          <span
            key={`${name}-${index}`}
            className={`mini-bar natural ${scale.includes(pitchClass) ? "is-scale-tone" : ""} ${pitchClass === tonic ? "is-tonic" : ""}`}
          />
        ))}
      </span>
      <span className="mini-accidental-bars" aria-hidden="true">
        {MINI_ACCIDENTAL_BARS.map(([pitchClass, afterNatural]) => (
          <span
            key={pitchClass}
            className={`mini-bar accidental ${scale.includes(pitchClass) ? "is-scale-tone" : ""} ${pitchClass === tonic ? "is-tonic" : ""}`}
            style={{ "--bar-left": `${(afterNatural / MINI_NATURAL_BARS.length) * 100}%` } as React.CSSProperties}
          />
        ))}
      </span>
    </span>
  );
}

function PracticeKeyboard({ label, tonic, scale, instrument }: { label: string; tonic: number; scale: number[]; instrument: Instrument }) {
  return (
    <section className="marimba-section" aria-labelledby="marimba-heading">
      <div className="marimba-heading-row">
        <div>
          <p className="eyebrow" id="marimba-heading">Practice {instrument}</p>
          <h3>{label} major scale</h3>
        </div>
        <span className="marimba-legend"><i /> tonic <i /> scale tone</span>
      </div>
      <div className={`practice-marimba is-${instrument}`} role="list" aria-label={`Two-octave practice ${instrument} with the ${label} major scale highlighted`}>
        <div className="natural-bars">
          {NATURAL_BARS.map(([name, pitchClass]) => {
            const isScaleTone = scale.includes(pitchClass);
            const isTonic = pitchClass === tonic;
            return (
              <span
                key={name}
                role="listitem"
                aria-label={`${name}, ${isTonic ? "tonic" : isScaleTone ? "scale tone" : "not in scale"}`}
                className={`mallet-bar natural ${isScaleTone ? "is-scale-tone" : ""} ${isTonic ? "is-tonic" : ""}`}
              >
                <span aria-hidden="true">{name.replace(/\d/, "")}</span>
              </span>
            );
          })}
        </div>
        <div className="accidental-bars">
          {ACCIDENTAL_BARS.map(([name, pitchClass, afterNatural]) => {
            const isScaleTone = scale.includes(pitchClass);
            const isTonic = pitchClass === tonic;
            return (
              <span
                key={name}
                title={name}
                role="listitem"
                aria-label={`${name}, ${isTonic ? "tonic" : isScaleTone ? "scale tone" : "not in scale"}`}
                className={`mallet-bar accidental ${isScaleTone ? "is-scale-tone" : ""} ${isTonic ? "is-tonic" : ""}`}
                style={{ "--bar-left": `${(afterNatural / NATURAL_BARS.length) * 100}%` } as React.CSSProperties}
              />
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
  presenting: boolean;
};

export function CircleBoard({ initialState }: { initialState: CircleBoardState }) {
  const [orientation, setOrientation] = useState<Orientation>(initialState.orientation);
  const [mode, setMode] = useState<BoardMode>(initialState.mode);
  const [layers, setLayers] = useState<Layer[]>(initialState.layers);
  const [revealed, setRevealed] = useState<string[]>(initialState.revealed);
  const [instrument, setInstrument] = useState<Instrument>(initialState.instrument);
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

  useEffect(() => {
    const params = new URLSearchParams();
    params.set("direction", orientation);
    params.set("mode", mode);
    if (layers.length) params.set("layers", layers.join(","));
    params.set("instrument", instrument);
    if (presenting) params.set("present", "1");
    if (mode === "build") params.set("revealed", revealed.join(","));
    window.history.replaceState(null, "", `${window.location.pathname}?${params}`);
  }, [instrument, layers, mode, orientation, presenting, revealed]);

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

  function resetBoard() {
    setOrientation("fourths");
    setMode("build");
    setLayers(["signatures", "numbers"]);
    setRevealed(DEFAULT_REVEALED);
    setInstrument("xylophone");
    setPresenting(false);
    setSelectedId("c");
  }

  function resetToOpenedLink() {
    setOrientation(initialState.orientation);
    setMode(initialState.mode);
    setLayers(initialState.layers);
    setRevealed(initialState.revealed);
    setInstrument(initialState.instrument);
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
    <main className={`app-shell ${presenting ? "is-presenting" : ""}`}>
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
          <button type="button" className="quiet-button" onClick={copyLink}>
            {shareStatus}
          </button>
          <button type="button" className="quiet-button" onClick={() => window.print()}>
            Print
          </button>
        </div>
      </header>

      <section className="toolbar no-print hide-when-presenting" aria-label="Board controls">
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
          <button type="button" aria-pressed={mode === "poster"} onClick={() => setMode("poster")}>
            Poster
          </button>
          <button
            type="button"
            aria-pressed={mode === "focus"}
            onClick={() => setMode("focus")}
          >
            Focus
          </button>
        </div>
        <div className="control-group compact-group board-tools" aria-label="Board actions">
          {mode === "build" && (
            <>
              <button type="button" onClick={() => setRevealed(traversal.map((key) => key.id))}>Reveal all</button>
              <button type="button" onClick={() => setRevealed([])}>Hide all</button>
            </>
          )}
          <button
            type="button"
            className="layers-button"
            aria-expanded={showLayerPanel}
            onClick={() => setShowLayerPanel((current) => !current)}
          >
            Layers <span>{layers.length}</span>
          </button>
          <button type="button" className="present-button" onClick={() => setPresenting(true)}>Present</button>
        </div>
        <div className="control-group compact-group reset-actions">
          <button type="button" onClick={resetToOpenedLink}>Reset link</button>
          <button type="button" className="reset-button" onClick={resetBoard}>Start fresh</button>
        </div>
      </section>

      {showLayerPanel && !presenting && (
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
        </section>
      )}

      <section className="board-layout">
        <section className="lesson-board" aria-label="Framed circle teaching board">
          <header className="board-frame-header">
            <div>
              <span className="board-kicker">Teaching board</span>
              <strong>Circle of {orientation === "fourths" ? "Fourths" : "Fifths"}</strong>
            </div>
              <span>{mode === "build" ? "Progressive build" : mode === "focus" ? "Relationship focus" : "Complete poster"}{layers.includes("keyboards") ? ` · ${instrument}` : ""}</span>
          </header>
          <div className={`circle-stage ${layers.includes("keyboards") ? "has-keyboards" : ""}`} aria-label={`Circle of ${orientation}`}>
          <div className="direction-note" aria-live="polite">
            <span>Ascending {orientation}</span>
            <strong>{orientation === "fourths" ? "↻" : "↺"}</strong>
          </div>
          <div className="circle-ring" aria-hidden="true" />
          {traversal.map((key, index) => {
            const angle = index * 30;
            const visible = mode === "poster" || mode === "focus" || revealed.includes(key.id);
            const dimmed = mode === "focus" && !focusIds.has(key.id);
            return (
              <div
                key={key.id}
                className={`key-orbit-group ${dimmed ? "is-dimmed" : ""}`}
                style={{ "--angle": `${angle}deg` } as React.CSSProperties}
              >
                <button
                  type="button"
                  className={`key-card core-node ${visible ? "is-visible" : "is-covered"} ${selectedId === key.id ? "is-selected" : ""}`}
                  aria-label={visible ? `${key.label} major, ${key.signatureLabel}, ${key.relativeMinor}` : `Reveal key at position ${index + 1}`}
                  aria-pressed={visible}
                  onClick={() => selectKey(key.id)}
                >
                  {visible ? (
                    <>
                      <span className="key-name">{key.label}</span>
                      {layers.includes("numbers") && <AccidentalCount type={key.type} count={key.count} />}
                    </>
                  ) : <span className="covered-mark">+</span>}
                </button>
                {visible && (layers.includes("signatures") || layers.includes("minors")) && (
                  <span className="orbit-layer notation-node" aria-hidden="true">
                    {layers.includes("signatures") && <KeySignature type={key.type} count={key.count} compact />}
                    {layers.includes("minors") && <span className="minor-name">{key.relativeMinor}</span>}
                  </span>
                )}
                {visible && layers.includes("keyboards") && (
                  <span className="orbit-layer keyboard-node">
                    <MiniScaleKeyboard label={key.label} tonic={key.pitchClass} scale={key.scalePitchClasses} instrument={instrument} />
                  </span>
                )}
              </div>
            );
          })}
          <div className={`circle-center ${layers.includes("accidental-order") ? "shows-order" : ""}`}>
            {layers.includes("accidental-order") ? (
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
        </section>

        <aside className="detail-panel hide-when-presenting" aria-live="polite">
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
              tonic={selected.pitchClass}
              scale={selected.scalePitchClasses}
              instrument={instrument}
            />
          )}
          <p className="teacher-tip">
            {mode === "build"
              ? "Select a covered position to reveal it as the lesson grows."
              : mode === "focus"
                ? "Select a key to emphasize its immediate fourths and fifths relationships."
                : "Poster mode keeps the complete reference visible."}
          </p>
        </aside>
      </section>

      <footer className="hide-when-presenting no-print">
        <span>Fourth-first for band classrooms.</span>
        <span>Flip once to see the same relationships as fifths.</span>
      </footer>
    </main>
  );
}
