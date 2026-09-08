import { getScaleOctave, type MusicKey, type ScaleMode } from "@/lib/music-model.mjs";
import { getKeyboardWindow } from "@/lib/keyboard-window.mjs";
import notation from "@/lib/notation-glyphs.json";
import sourceInstrument from "@/lib/xylophone-two-octaves.json";
import { midiNoteName } from "@/lib/lesson-model.mjs";
import "./MusicVisuals.css";

type SignatureProps = {
  type: string;
  count: number;
  compact?: boolean;
  label?: string;
  emphasizedNotes?: string[];
};

export function KeySignature({ type, count, compact = false, label, emphasizedNotes = [] }: SignatureProps) {
  const accidentalName = type === "flat" ? "flat" : "sharp";
  const accidentalCount = type === "none" ? 0 : Math.min(7, Math.max(0, Math.floor(count)));
  const steps = type === "flat" ? [4, 7, 3, 6, 2, 5, 1] : [8, 5, 9, 6, 3, 7, 4];
  const space = 7;
  const base = 46;
  const clefX = 8;
  const accidental = notation.glyphs[accidentalName];
  const firstAccidentalX = clefX + (notation.glyphs.trebleClef.right + 0.7) * space;
  const stride = (accidental.right - accidental.left + 0.6) * space;
  const glyphs: { name: keyof typeof notation.glyphs; step: number; x: number }[] = [{ name: "trebleClef", step: 2, x: clefX }];
  steps.slice(0, accidentalCount).forEach((step, index) => glyphs.push({ name: accidentalName, step, x: firstAccidentalX + index * stride }));
  const description = label ?? `Treble key signature: ${accidentalCount === 0 ? "no accidentals" : `${accidentalCount} ${accidentalName}${accidentalCount === 1 ? "" : "s"}`}`;
  const scale = space / notation.unitsPerSpace;

  return (
    <svg className={`musical-signature-svg${compact ? " is-compact" : ""}`} viewBox="0 0 128 64" role="img" aria-label={description}>
      <title>{description}</title>
      {[0, 2, 4, 6, 8].map((step) => <line key={step} x1="4" x2="124" y1={base - step * space / 2} y2={base - step * space / 2} className="music-staff-line" />)}
      {glyphs.map((glyph, index) => <path key={index} d={notation.glyphs[glyph.name].path} transform={`translate(${glyph.x} ${base - glyph.step * space / 2}) scale(${scale} ${-scale})`} data-glyph={glyph.name} data-staff-step={glyph.step} className={`music-notation-glyph${index > 0 && emphasizedNotes.includes((type === "flat" ? ["B♭", "E♭", "A♭", "D♭", "G♭", "C♭", "F♭"] : ["F♯", "C♯", "G♯", "D♯", "A♯", "E♯", "B♯"])[index - 1]) ? " is-changed" : ""}`} />)}
    </svg>
  );
}

type ScaleKeyboardProps = {
  musicKey: MusicKey;
  scaleMode?: ScaleMode;
  instrument?: "xylophone" | "piano";
  markedDegrees?: number[];
  compact?: boolean;
  fixedRange?: boolean;
  emphasizedPitchClasses?: number[];
  playingMidi?: number | null;
  onPlay?: (midi: number) => void;
  concealScale?: boolean;
};

type ToneBar = {
  midi: number;
  accidental: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
};

export function ScaleKeyboard({ musicKey, scaleMode = "major", instrument: instrumentName = "xylophone", markedDegrees = [], compact = false, fixedRange = false, emphasizedPitchClasses = [], playingMidi = null, onPlay, concealScale = false }: ScaleKeyboardProps) {
  const octave = getScaleOctave(musicKey, scaleMode);
  const keyboard = fixedRange ? sourceInstrument : getKeyboardWindow(octave.midis);
  const horizontalScale = compact ? 236 / keyboard.width : 1;
  const drawingWidth = keyboard.width * horizontalScale;
  const activeNotes = new Map(octave.midis.map((midi, index) => [midi, { note: octave.notes[index], degree: octave.degrees[index] }]));
  const isPiano = instrumentName === "piano";
  const bars: ToneBar[] = keyboard.bars.map((bar) => {
    if (isPiano) {
      const width = (bar.accidental ? 10 : 16) * horizontalScale;
      return { midi: bar.midi, accidental: bar.accidental, x: bar.center * horizontalScale + 8 - width / 2, y: 14, width, height: bar.accidental ? 52 : 85 };
    }
    const height = bar.length * 0.24;
    return { midi: bar.midi, accidental: bar.accidental, x: (bar.center - bar.width / 2) * horizontalScale + 8, y: bar.accidental ? 55 - height : 63, width: bar.width * horizontalScale, height };
  });
  // Piano accidentals sit in front of white keys. Percussion accidentals remain
  // an entirely separate raised row of equally wide, graduated tone bars.
  const orderedBars = isPiano ? [...bars.filter((bar) => !bar.accidental), ...bars.filter((bar) => bar.accidental)] : bars;
  const roleDescription = markedDegrees.length ? `; numbered gold badges mark scale degrees ${[...new Set(markedDegrees)].sort().join(", ")}` : "";
  const scaleLabel = scaleMode === "minor" ? `${octave.tonic} natural minor` : octave.label;
  const description = concealScale ? `Practice ${scaleLabel} on the ${instrumentName}; scale markings hidden. Select a bar.` : `${scaleLabel} scale on a ${fixedRange ? "fixed two-octave" : "compact"} ${instrumentName}${fixedRange ? "" : " spanning about one and a half octaves"}; eight notes highlighted from ${octave.tonic} to ${octave.tonic}; tonic notes outlined${roleDescription}. Notes: ${octave.notes.join(", ")}.`;

  return (
    <svg className={`music-keyboard-svg is-${instrumentName}${compact ? " is-compact" : ""}${onPlay ? " is-playable" : ""}`} viewBox={`0 0 ${drawingWidth + 16} 118`} role={onPlay ? "group" : "img"} aria-label={description} data-scale-mode={scaleMode} data-keyboard-instrument={instrumentName}>
      <title>{description}</title>
      {isPiano && <rect x="4" y="12" width={drawingWidth + 8} height="89" rx="2" className="music-piano-case" />}
      {orderedBars.map((bar) => {
        const tone = concealScale ? undefined : activeNotes.get(bar.midi);
        const tonic = tone?.degree === 1;
        const marked = tone !== undefined && markedDegrees.includes(tone.degree);
        const centerX = bar.x + bar.width / 2;
        const labelY = isPiano && !bar.accidental ? bar.y + 63 : bar.y + bar.height / 2;
        const badgeY = bar.accidental ? bar.y - 6.5 : bar.y + bar.height + 6.5;
        return (
          <g key={bar.midi} role={onPlay ? "button" : undefined} tabIndex={onPlay ? 0 : undefined} aria-label={onPlay ? `${tone?.note ?? midiNoteName(bar.midi)}, octave ${Math.floor(bar.midi / 12) - 1}${!concealScale && tonic ? ", tonic" : ""}` : undefined} onClick={onPlay ? () => onPlay(bar.midi) : undefined} onKeyDown={onPlay ? (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onPlay(bar.midi); } } : undefined}>
            <rect
              x={bar.x} y={bar.y} width={bar.width} height={bar.height} rx={isPiano ? 0.7 : 2}
              className={`music-tone-bar${bar.accidental ? " is-accidental" : " is-natural"}${tone ? " is-scale-tone" : ""}${tonic ? " is-tonic" : ""}${emphasizedPitchClasses.includes(bar.midi % 12) ? " is-changed" : ""}${playingMidi === bar.midi ? " is-playing" : ""}`}
              data-midi={bar.midi} data-scale-tone={Boolean(tone)} data-tonic={Boolean(tonic)} data-degree={tone?.degree} data-role-marked={marked}
            />
            {!isPiano && [0.17, 0.83].map((position) => <circle key={position} cx={centerX} cy={bar.y + bar.height * position} r="0.9" className={`music-cord-hole${tone ? " is-active" : ""}`} />)}
            {tone && <text x={centerX} y={labelY} textAnchor="middle" dominantBaseline="central" transform={`rotate(-90 ${centerX} ${labelY})`} className="music-bar-note">{tone.note}</text>}
            {marked && <g className="music-degree-badge" aria-hidden="true"><circle cx={centerX} cy={badgeY} r="4.8" /><text x={centerX} y={badgeY} textAnchor="middle" dominantBaseline="central">{tone.degree}</text></g>}
          </g>
        );
      })}
    </svg>
  );
}
