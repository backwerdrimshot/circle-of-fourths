import { getPosterPositions } from "./music-model.mjs";
import instrument from "./xylophone-two-octaves.json" with { type: "json" };
import notationGlyphs from "./notation-glyphs.json" with { type: "json" };

// One source of artwork for the responsive preview and the downloadable PDFs.
export const POSTER_PAPERS = {
  letter: { label: "US Letter", width: 792, height: 612, filename: "circle-of-fourths-letter" },
  a4: { label: "A4", width: 841.8898, height: 595.2756, filename: "circle-of-fourths-a4" },
  tabloid: { label: "11 × 17", width: 1224, height: 792, filename: "circle-of-fourths-11x17" },
};

const C = { ink: "#171717", muted: "#59564e", green: "#416034", brick: "#6d2d2d", tan: "#d2b48c", line: "#d8d2ca", paper: "#fafaf9", unlit: "#e8dbc8" };
const escape = (value) => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;");
const n = (value) => Number(value.toFixed(3));
const text = (x, y, value, size = 16, extra = "") => `<text x="${n(x)}" y="${n(y)}" font-size="${size}" ${extra}>${escape(value)}</text>`;
const rect = (x, y, width, height, fill, stroke = "none", radius = 0, extra = "") => `<rect x="${n(x)}" y="${n(y)}" width="${n(width)}" height="${n(height)}" rx="${radius}" fill="${fill}" stroke="${stroke}" ${extra}/>`;
const line = (x1, y1, x2, y2, color = C.line, extra = "") => `<line x1="${n(x1)}" y1="${n(y1)}" x2="${n(x2)}" y2="${n(y2)}" stroke="${color}" ${extra}/>`;

export function scaleNoteNames(key) {
  const letters = ["C", "D", "E", "F", "G", "A", "B"];
  const first = letters.indexOf(key.label[0]);
  return Array.from({ length: 7 }, (_, i) => {
    const letter = letters[(first + i) % 7];
    return key.accidentals.find((note) => note[0] === letter) ?? letter;
  });
}

export function scaleOctave(key) {
  const notes = scaleNoteNames(key);
  const tonicMidi = instrument.range.fromMidi + key.pitchClass;
  return {
    notes: [...notes, notes[0]],
    midis: [0, 2, 4, 5, 7, 9, 11, 12].map((step) => tonicMidi + step),
  };
}

export function posterGeometry(size = "letter") {
  const paper = POSTER_PAPERS[size] ?? POSTER_PAPERS.letter;
  // Preserve vertical clearance across paper ratios; wider paper gets wider orbits.
  const height = 1082;
  const width = height * paper.width / paper.height;
  const cx = width / 2;
  const top = 203;
  const bottom = height - 190;
  const cy = (top + bottom) / 2;
  const ry = (bottom - top) / 2;
  const bands = {
    core: { rx: 155, ry: 155, width: 68, height: 50 },
    notation: { rx: 310, ry: 228, width: 132, height: 78 },
    keyboard: { rx: width / 2 - 178, ry, width: 240, height: 102 },
  };
  const nodes = getPosterPositions().map((key, index) => {
    const angle = index * Math.PI / 6;
    const node = { key, index, ...Object.fromEntries(Object.entries(bands).map(([name, band]) => [name, {
      x: cx + Math.sin(angle) * band.rx - band.width / 2,
      y: cy - Math.cos(angle) * band.ry - band.height / 2,
      width: band.width, height: band.height,
    }])) };
    if (index === 1 || index === 11) {
      // The larger upper diagonal staves need clearance from both adjacent rings.
      node.notation.y -= 5;
      node.keyboard.y -= 8;
    }
    if ([2, 4, 8, 10].includes(index)) {
      // Narrow paper needs more room beside both ordinary and paired staves.
      const side = index < 6 ? 1 : -1;
      const minimumCenter = index === 4 || index === 8
        ? 266 + 124 + 6 + node.keyboard.width / 2
        : Math.abs(node.notation.x + node.notation.width / 2 - cx) + node.notation.width / 2 + 6 + node.keyboard.width / 2;
      const center = Math.max(Math.abs(node.keyboard.x + node.keyboard.width / 2 - cx), minimumCenter);
      node.keyboard.x = cx + side * center - node.keyboard.width / 2;
    }
    if (key.spellings.length === 2) {
      // Put the two spellings side by side so both staves can grow without
      // compressing the major/minor labels.
      node.notation.width = 248;
      node.notation.height = 74;
      if (index === 6) {
        node.core.y -= 10;
        node.notation.x = cx - 124;
        node.notation.y = cy + 174;
      } else {
        const side = index === 5 ? 1 : -1;
        node.notation.x = cx + side * 266 - 124;
        node.notation.y = cy + 158;
        node.keyboard.x = cx + side * bands.keyboard.rx * 0.77 - node.keyboard.width / 2;
      }
    }
    return node;
  });
  return { width, height, cx, cy, bands, nodes, paper };
}

export function keySignatureLayout(key, box, paired = false) {
  const space = paired ? 4.4 : 5;
  const base = box.y + (paired ? 44 : 48);
  const x = box.x + 8;
  const width = box.width - 16;
  const yForStep = (step) => base - step * space / 2;
  const steps = key.type === "flat" ? [4, 7, 3, 6, 2, 5, 1] : [8, 5, 9, 6, 3, 7, 4];
  const clefX = x + space * 0.5;
  const glyphs = [{ name: "trebleClef", step: 2, x: clefX, y: yForStep(2) }];
  const accidentalName = key.type === "flat" ? "flat" : "sharp";
  const accidental = notationGlyphs.glyphs[accidentalName];
  const accidentalX = clefX + (notationGlyphs.glyphs.trebleClef.right + 0.7) * space;
  const accidentalStride = (accidental.right - accidental.left + 0.6) * space;
  key.accidentals.forEach((pitch, i) => glyphs.push({
    name: accidentalName, pitch,
    step: steps[i], x: accidentalX + i * accidentalStride, y: yForStep(steps[i]),
  }));
  return { space, base, x, width, glyphs };
}

function signatureRow(key, box, paired = false) {
  const { space, base, x, width, glyphs } = keySignatureLayout(key, box, paired);
  let markup = text(box.x + box.width / 2, box.y + 13, `${key.label} major`, paired ? 12 : 13, `text-anchor="middle" fill="${C.brick}" font-weight="700"`);
  markup += Array.from({ length: 5 }, (_, i) => line(x, base - i * space, x + width, base - i * space, "#000000", 'stroke-width="0.65"')).join("");
  for (const glyph of glyphs) {
    const scale = space / notationGlyphs.unitsPerSpace;
    markup += `<path d="${notationGlyphs.glyphs[glyph.name].path}" transform="translate(${n(glyph.x)} ${n(glyph.y)}) scale(${scale} ${-scale})" fill="#000000" data-glyph="${glyph.name}" data-staff-step="${glyph.step}"/>`;
  }
  const minor = key.relativeMinor.replace(/ minor$/, "");
  markup += text(box.x + box.width / 2, box.y + (paired ? 65 : 71), `Relative minor: ${minor}`, 11, `text-anchor="middle" fill="${C.green}" font-weight="700"`);
  return markup;
}

function signature(key, box) {
  let markup = rect(box.x, box.y, box.width, box.height, "#ffffff", C.tan, 8);
  if (key.spellings.length === 1) return markup + signatureRow(key, box);
  const columnWidth = (box.width - 8) / 2;
  markup += signatureRow(key.spellings[0], { ...box, width: columnWidth }, true);
  markup += line(box.x + box.width / 2, box.y + 8, box.x + box.width / 2, box.y + box.height - 8);
  markup += signatureRow(key.spellings[1], { ...box, x: box.x + columnWidth + 8, width: columnWidth }, true);
  return markup;
}

function keyboard(key, box) {
  const { notes, midis } = scaleOctave(key);
  const noteByMidi = new Map(midis.map((midi, index) => [midi, notes[index]]));
  const sx = 0.9;
  const sy = 0.17;
  const startX = box.x + (box.width - instrument.width * sx) / 2;
  const accidentalBase = box.y + 57;
  const naturalTop = accidentalBase + 8;
  const pairLabel = key.spellings.map((spelling) => spelling.label).join(" / ");
  const alternate = key.spellings[1];
  let markup = `<g role="img" aria-label="${escape(key.label)} major scale on a two-octave xylophone; one tonic-to-tonic octave highlighted; outlined bars mark the starting and ending tonic; notes ${escape(notes.join(", "))}${alternate ? `; enharmonic ${escape(alternate.label)} major: ${escape(scaleOctave(alternate).notes.join(", "))}` : ""}">`;
  markup += rect(box.x, box.y, box.width, box.height, "#ffffff", C.line, 9);
  markup += text(box.x + box.width / 2, box.y + 19, `${pairLabel} major`, 17, `text-anchor="middle" fill="${C.brick}" font-weight="700"`);
  for (const bar of instrument.bars) {
    const active = noteByMidi.has(bar.midi);
    const tonic = bar.midi === midis[0] || bar.midi === midis.at(-1);
    const width = bar.width * sx;
    const height = bar.length * sy;
    const x = startX + bar.center * sx - width / 2;
    const y = bar.accidental ? accidentalBase - height : naturalTop;
    markup += rect(x, y, width, height, active ? C.green : C.unlit, tonic ? C.ink : active ? C.green : "#baa58b", 2, `stroke-width="${tonic ? 2.2 : 0.7}" data-midi="${bar.midi}" data-scale-tone="${active}" data-tonic="${tonic}"`);
    // Cord holes and the visible row gap make these individual percussion bars.
    markup += `<circle cx="${n(x + width / 2)}" cy="${n(y + height * 0.16)}" r="1" fill="${active ? "#c1d0b8" : "#a48e72"}"/>`;
    markup += `<circle cx="${n(x + width / 2)}" cy="${n(y + height * 0.84)}" r="1" fill="${active ? "#c1d0b8" : "#a48e72"}"/>`;
    if (active) markup += text(x + width / 2, y + height / 2, noteByMidi.get(bar.midi), 9.5, `text-anchor="middle" dominant-baseline="central" transform="rotate(-90 ${n(x + width / 2)} ${n(y + height / 2)})" fill="#ffffff" font-weight="700"`);
  }
  return markup + "</g>";
}

export function createPosterSvg(size = "letter") {
  const g = posterGeometry(size);
  const { width, height, cx, cy, bands, nodes, paper } = g;
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${paper.width}" height="${paper.height}" viewBox="0 0 ${width} ${n(height)}" role="img" aria-labelledby="poster-title poster-description" font-family="Arial, Helvetica, sans-serif" fill="${C.ink}">`;
  svg += '<title id="poster-title">Circle of Fourths — Classroom Reference</title>';
  svg += '<metadata>Notation outlines derived from Bravura 1.481, © Steinberg Media Technologies GmbH, SIL Open Font License 1.1. License: https://circle-of-fourths.backwerdrhythmshop.com/licenses/bravura-LICENSE.txt</metadata>';
  svg += '<desc id="poster-description">C starts at twelve o’clock. Move clockwise through the flat keys. Fifteen written major keys occupy twelve positions, including the enharmonic pairs D-flat/C-sharp, G-flat/F-sharp, and C-flat/B. Each spelling has its own key signature and relative minor. Two octaves of graduated percussion bars remain visible; exactly eight green bars trace one ascending tonic-to-tonic octave, with note names printed on those bars. A thick outline marks the starting and ending tonic. C major and A minor share a signature with no sharps or flats, with C and A as their respective home notes. Enharmonic spellings use the same physical bars: C-flat is B, F-flat is E, E-sharp is F, and B-sharp is C.</desc>';
  svg += rect(0, 0, width, height, C.paper);
  svg += rect(22, 22, width - 44, height - 44, "none", C.tan, 13, 'stroke-width="1.4"');
  svg += text(52, 57, "BACKWERD RHYTHM SHOP · CLASSROOM REFERENCE", 13, `fill="${C.green}" font-weight="700" letter-spacing="1.5"`);
  svg += text(50, 111, "Circle of Fourths", 54, `fill="${C.brick}" font-family="Georgia, serif"`);
  svg += text(width - 495, 67, "C starts at twelve o’clock.", 18, `fill="${C.brick}" font-weight="700"`);
  svg += text(width - 495, 93, "Move clockwise through the flat keys.", 16);
  svg += text(width - 495, 116, "15 key spellings · 12 positions · enharmonic pairs", 13, `fill="${C.muted}"`);
  svg += line(50, 133, width - 50, 133, C.tan);
  for (const [name, band] of Object.entries(bands)) {
    svg += `<ellipse cx="${cx}" cy="${n(cy)}" rx="${band.rx}" ry="${n(band.ry)}" fill="none" stroke="${name === "core" ? "#d8dfd2" : "#e7e0d5"}" stroke-width="${name === "core" ? 24 : 1.5}"/>`;
  }
  for (const { key, core, notation, keyboard: kb } of nodes) {
    svg += `<g data-key="${key.id}">`;
    svg += rect(core.x, core.y, core.width, core.height, "#ffffff", C.line, 9);
    if (key.spellings.length === 2) {
      key.spellings.forEach((spelling, i) => {
        svg += text(core.x + 7, core.y + 21 + i * 21, spelling.label, 20, `font-family="Georgia, serif" fill="${C.brick}"`);
        svg += text(core.x + core.width - 7, core.y + 20 + i * 21, `${spelling.count}${spelling.type === "flat" ? "♭" : "♯"}`, 12, `text-anchor="end" fill="${C.green}" font-weight="700"`);
      });
    } else {
      svg += text(core.x + core.width / 2, core.y + 26, key.label, 27, `font-family="Georgia, serif" text-anchor="middle" fill="${C.brick}"`);
      svg += text(core.x + core.width / 2, core.y + 43, key.count === 0 ? "0" : `${key.count} ${key.type === "flat" ? "♭" : "♯"}`, 14, `text-anchor="middle" fill="${C.green}" font-weight="700"`);
    }
    svg += signature(key, notation);
    svg += keyboard(key, kb);
    svg += "</g>";
  }
  svg += text(cx, cy - 98, "RELATIVE MINOR", 10.5, `text-anchor="middle" fill="${C.green}" font-weight="700"`);
  svg += text(cx, cy - 81, "C major · A minor", 14.5, 'text-anchor="middle" font-weight="700"');
  svg += text(cx, cy - 65, "No sharps or flats; home notes C & A.", 10.5, `text-anchor="middle" fill="${C.muted}"`);
  svg += text(cx, cy - 50, "Minor tonic = major’s 6th degree.", 10.5, `text-anchor="middle" fill="${C.muted}"`);
  svg += text(cx, cy - 24, "ORDER OF FLATS", 11, `text-anchor="middle" fill="${C.green}" font-weight="700" letter-spacing="1.2"`);
  svg += text(cx, cy + 2, "B E A D G C F", 23, 'text-anchor="middle" font-weight="700"');
  svg += text(cx, cy + 20, "Sharps: F C G D A E B", 10.5, `text-anchor="middle" fill="${C.muted}"`);
  svg += text(cx, cy + 47, "ENHARMONIC NOTES", 10.5, `text-anchor="middle" fill="${C.brick}" font-weight="700"`);
  svg += text(cx, cy + 64, "Same bar · different note names", 10.5, `text-anchor="middle" fill="${C.muted}"`);
  svg += text(cx, cy + 82, "C♭ = B · F♭ = E", 12, 'text-anchor="middle" font-weight="700"');
  svg += text(cx, cy + 99, "E♯ = F · B♯ = C", 12, 'text-anchor="middle" font-weight="700"');
  const legendY = height - 86;
  svg += line(50, legendY, width - 50, legendY, C.tan);
  svg += rect(60, legendY + 15, 12, 16, C.green, "none", 2);
  svg += text(84, legendY + 27, "Green + note name = scale tone", 13);
  svg += rect(330, legendY + 15, 12, 16, C.green, C.ink, 2, 'stroke-width="2.2"');
  svg += text(354, legendY + 27, "Outline = tonic (home note)", 13);
  svg += text(590, legendY + 27, "Staff = major key + relative minor", 13);
  svg += text(width - 60, legendY + 27, "Two octaves shown · one octave highlighted", 13, 'text-anchor="end"');
  svg += text(60, height - 36, `Fourth-first for band classrooms · ${paper.label}`, 11, `fill="${C.muted}"`);
  svg += text(cx, height - 36, "Eight highlighted bars: tonic to the next tonic.", 11, `text-anchor="middle" fill="${C.muted}"`);
  svg += text(width - 60, height - 36, "BACKWERD RHYTHM SHOP", 11, `text-anchor="end" fill="${C.brick}" font-weight="700" letter-spacing="1"`);
  return svg + "</svg>";
}
