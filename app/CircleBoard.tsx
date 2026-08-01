"use client";

import { useEffect, useMemo, useState } from "react";
import { getTraversal } from "@/lib/music-model.mjs";

type Orientation = "fourths" | "fifths";
type BoardMode = "build" | "poster";
type Layer = "signatures" | "minors";

const DEFAULT_REVEALED = ["c"];

export type CircleBoardState = {
  orientation: Orientation;
  mode: BoardMode;
  layers: Layer[];
  revealed: string[];
};

export function CircleBoard({ initialState }: { initialState: CircleBoardState }) {
  const [orientation, setOrientation] = useState<Orientation>(initialState.orientation);
  const [mode, setMode] = useState<BoardMode>(initialState.mode);
  const [layers, setLayers] = useState<Layer[]>(initialState.layers);
  const [revealed, setRevealed] = useState<string[]>(initialState.revealed);
  const [selectedId, setSelectedId] = useState("c");
  const [shareStatus, setShareStatus] = useState("Copy lesson link");

  const traversal = useMemo(() => getTraversal(orientation), [orientation]);
  const selected = traversal.find((key) => key.id === selectedId) ?? traversal[0];

  useEffect(() => {
    const params = new URLSearchParams();
    params.set("direction", orientation);
    params.set("mode", mode);
    if (layers.length) params.set("layers", layers.join(","));
    if (mode === "build") params.set("revealed", revealed.join(","));
    window.history.replaceState(null, "", `${window.location.pathname}?${params}`);
  }, [layers, mode, orientation, revealed]);

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
    setLayers(["signatures"]);
    setRevealed(DEFAULT_REVEALED);
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
    <main className="app-shell">
      <header className="topbar">
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

      <section className="toolbar no-print" aria-label="Board controls">
        <div className="control-group" aria-label="Direction">
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
        <div className="control-group" aria-label="Board mode">
          <span className="control-label">View</span>
          <button type="button" aria-pressed={mode === "build"} onClick={() => setMode("build")}>
            Build
          </button>
          <button type="button" aria-pressed={mode === "poster"} onClick={() => setMode("poster")}>
            Poster
          </button>
        </div>
        <div className="control-group" aria-label="Visible layers">
          <span className="control-label">Layers</span>
          <button
            type="button"
            aria-pressed={layers.includes("signatures")}
            onClick={() => toggleLayer("signatures")}
          >
            Signatures
          </button>
          <button
            type="button"
            aria-pressed={layers.includes("minors")}
            onClick={() => toggleLayer("minors")}
          >
            Relative minors
          </button>
        </div>
        <button type="button" className="reset-button" onClick={resetBoard}>
          Start fresh
        </button>
      </section>

      <section className="board-layout">
        <div className="circle-stage" aria-label={`Circle of ${orientation}`}>
          <div className="direction-note" aria-live="polite">
            <span>Ascending {orientation}</span>
            <strong>{orientation === "fourths" ? "↻" : "↺"}</strong>
          </div>
          <div className="circle-ring" aria-hidden="true" />
          {traversal.map((key, index) => {
            const angle = index * 30 - 90;
            const visible = mode === "poster" || revealed.includes(key.id);
            return (
              <button
                type="button"
                key={key.id}
                className={`key-card ${visible ? "is-visible" : "is-covered"} ${
                  selectedId === key.id ? "is-selected" : ""
                }`}
                style={{ "--angle": `${angle}deg` } as React.CSSProperties}
                aria-label={
                  visible
                    ? `${key.label} major, ${key.signatureLabel}, ${key.relativeMinor}`
                    : `Reveal key at position ${index + 1}`
                }
                aria-pressed={visible}
                onClick={() => selectKey(key.id)}
              >
                {visible ? (
                  <>
                    <span className="key-name">{key.label}</span>
                    {layers.includes("signatures") && (
                      <span className="signature">{key.signatureLabel}</span>
                    )}
                    {layers.includes("minors") && (
                      <span className="minor-name">{key.relativeMinor}</span>
                    )}
                  </>
                ) : (
                  <span className="covered-mark">+</span>
                )}
              </button>
            );
          })}
          <div className="circle-center">
            <span>{mode === "build" ? "Build mode" : "Poster mode"}</span>
            <strong>{selected.label}</strong>
            <small>{selected.signatureLabel}</small>
          </div>
        </div>

        <aside className="detail-panel" aria-live="polite">
          <p className="eyebrow">Selected key</p>
          <h2>{selected.label} major</h2>
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
          <p className="teacher-tip">
            {mode === "build"
              ? "Select a covered position to reveal it as the lesson grows."
              : "Poster mode keeps the complete reference visible."}
          </p>
        </aside>
      </section>

      <footer>
        <span>Fourth-first for band classrooms.</span>
        <span>Flip once to see the same relationships as fifths.</span>
      </footer>
    </main>
  );
}
