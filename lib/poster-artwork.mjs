import { getTraversal } from "./music-model.mjs";
import instrument from "./xylophone-two-octaves.json" with { type: "json" };

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

export function posterGeometry(size = "letter") {
  const paper = POSTER_PAPERS[size] ?? POSTER_PAPERS.letter;
  // Preserve vertical clearance across paper ratios; wider paper gets wider orbits.
  const height = 1082;
  const width = height * paper.width / paper.height;
  const cx = width / 2;
  const top = 215;
  const bottom = height - 170;
  const cy = (top + bottom) / 2;
  const ry = (bottom - top) / 2;
  const bands = {
    core: { rx: 155, ry: 155, width: 68, height: 50 },
    notation: { rx: 310, ry: 228, width: 108, height: 65 },
    keyboard: { rx: width / 2 - 178, ry, width: 240, height: 120 },
  };
  const nodes = getTraversal("fourths").map((key, index) => {
    const angle = index * Math.PI / 6;
    return { key, index, ...Object.fromEntries(Object.entries(bands).map(([name, band]) => [name, {
      x: cx + Math.sin(angle) * band.rx - band.width / 2,
      y: cy - Math.cos(angle) * band.ry - band.height / 2,
      width: band.width, height: band.height,
    }])) };
  });
  return { width, height, cx, cy, bands, nodes, paper };
}

function signature(key, box) {
  const x = box.x + 15;
  const y = box.y + 15;
  const lines = Array.from({ length: 5 }, (_, i) => line(x, y + i * 4, x + 78, y + i * 4, C.ink, 'stroke-width="0.8"')).join("");
  // Treble staff: flats B4 E5 A4 D5 G4 C5 F4; sharps F5 C5 G5 D5 A4 E5 B4.
  const positions = key.type === "flat" ? [8, 2, 10, 4, 12, 6, 14] : [0, 6, -2, 4, 10, 2, 8];
  const glyphs = Array.from({ length: key.count }, (_, i) => text(x + 7 + i * 10, y + positions[i] + (key.type === "flat" ? 3 : 6), key.type === "flat" ? "♭" : "♯", 20, 'font-family="Georgia, serif"')).join("");
  return rect(box.x, box.y, box.width, box.height, "#ffffff", C.tan, 8)
    + lines + glyphs
    + text(box.x + box.width / 2, box.y + 54, key.relativeMinor, 15, `text-anchor="middle" fill="${C.green}" font-weight="700"`);
}

function keyboard(key, box) {
  const notes = scaleNoteNames(key);
  const noteByPitch = new Map(key.scalePitchClasses.map((pitch, index) => [pitch, notes[index]]));
  const sx = 0.9;
  const sy = 0.17;
  const startX = box.x + (box.width - instrument.width * sx) / 2;
  const accidentalBase = box.y + 57;
  const naturalTop = accidentalBase + 8;
  let markup = `<g role="img" aria-label="${escape(key.label)} major scale on a two-octave xylophone; notes ${escape(notes.join(", "))}">`;
  markup += rect(box.x, box.y, box.width, box.height, "#ffffff", C.line, 9);
  markup += text(box.x + box.width / 2, box.y + 19, `${key.label} major`, 17, `text-anchor="middle" fill="${C.brick}" font-weight="700"`);
  for (const bar of instrument.bars) {
    const active = noteByPitch.has(bar.pitchClass);
    const width = bar.width * sx;
    const height = bar.length * sy;
    const x = startX + bar.center * sx - width / 2;
    const y = bar.accidental ? accidentalBase - height : naturalTop;
    markup += rect(x, y, width, height, active ? C.green : C.unlit, active ? C.green : "#baa58b", 2, 'stroke-width="0.7"');
    // Cord holes and the visible row gap make these individual percussion bars.
    markup += `<circle cx="${n(x + width / 2)}" cy="${n(y + height * 0.16)}" r="1" fill="${active ? "#c1d0b8" : "#a48e72"}"/>`;
    markup += `<circle cx="${n(x + width / 2)}" cy="${n(y + height * 0.84)}" r="1" fill="${active ? "#c1d0b8" : "#a48e72"}"/>`;
    if (active) markup += text(x + width / 2, y + height / 2, noteByPitch.get(bar.pitchClass), 9.5, `text-anchor="middle" dominant-baseline="central" transform="rotate(-90 ${n(x + width / 2)} ${n(y + height / 2)})" fill="#ffffff" font-weight="700"`);
  }
  markup += text(box.x + box.width / 2, box.y + 111, notes.join("  "), 16, `text-anchor="middle" fill="${C.ink}" font-weight="700"`);
  return markup + "</g>";
}

export function createPosterSvg(size = "letter") {
  const g = posterGeometry(size);
  const { width, height, cx, cy, bands, nodes, paper } = g;
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${paper.width}" height="${paper.height}" viewBox="0 0 ${width} ${n(height)}" role="img" aria-labelledby="poster-title poster-description" font-family="Arial, Helvetica, sans-serif" fill="${C.ink}">`;
  svg += '<title id="poster-title">Circle of Fourths — Classroom Reference</title>';
  svg += '<desc id="poster-description">C starts at twelve o’clock. Move clockwise through the flat keys. Major key and accidental count form the core, key signature and relative minor the middle ring, and two-octave xylophone scales the outer ring. Separated, graduated percussion bars run low to high from left to right. Green bars with note names belong to the scale. Notes below each diagram begin on its tonic.</desc>';
  svg += rect(0, 0, width, height, C.paper);
  svg += rect(22, 22, width - 44, height - 44, "none", C.tan, 13, 'stroke-width="1.4"');
  svg += text(52, 57, "BACKWERD RHYTHM SHOP · CLASSROOM REFERENCE", 13, `fill="${C.green}" font-weight="700" letter-spacing="1.5"`);
  svg += text(50, 111, "Circle of Fourths", 54, `fill="${C.brick}" font-family="Georgia, serif"`);
  svg += text(width - 495, 67, "C starts at twelve o’clock.", 18, `fill="${C.brick}" font-weight="700"`);
  svg += text(width - 495, 93, "Move clockwise through the flat keys.", 16);
  svg += text(width - 495, 116, "Major keys · signatures · relative minors · scales", 13, `fill="${C.muted}"`);
  svg += line(50, 133, width - 50, 133, C.tan);
  for (const [name, band] of Object.entries(bands)) {
    svg += `<ellipse cx="${cx}" cy="${n(cy)}" rx="${band.rx}" ry="${n(band.ry)}" fill="none" stroke="${name === "core" ? "#d8dfd2" : "#e7e0d5"}" stroke-width="${name === "core" ? 24 : 1.5}"/>`;
  }
  for (const { key, core, notation, keyboard: kb } of nodes) {
    svg += `<g data-key="${key.id}">`;
    svg += rect(core.x, core.y, core.width, core.height, "#ffffff", C.line, 9);
    svg += text(core.x + core.width / 2, core.y + 26, key.label, 27, `font-family="Georgia, serif" text-anchor="middle" fill="${C.brick}"`);
    svg += text(core.x + core.width / 2, core.y + 43, key.count === 0 ? "0" : `${key.count} ${key.type === "flat" ? "♭" : "♯"}`, 14, `text-anchor="middle" fill="${C.green}" font-weight="700"`);
    svg += signature(key, notation);
    svg += keyboard(key, kb);
    svg += "</g>";
  }
  svg += text(cx, cy - 30, "ORDER OF FLATS", 12, `text-anchor="middle" fill="${C.green}" font-weight="700" letter-spacing="1.2"`);
  svg += text(cx, cy + 3, "B E A D G C F", 25, 'text-anchor="middle" font-weight="700"');
  svg += text(cx, cy + 32, "Sharps reverse: F C G D A E B", 12, `text-anchor="middle" fill="${C.muted}"`);
  const legendY = height - 86;
  svg += line(50, legendY, width - 50, legendY, C.tan);
  svg += text(60, legendY + 27, "Core", 13, `font-weight="700" fill="${C.brick}"`);
  svg += text(97, legendY + 27, "Major key · accidental count", 13);
  svg += text(315, legendY + 27, "Middle", 13, `font-weight="700" fill="${C.brick}"`);
  svg += text(365, legendY + 27, "Key signature · relative minor", 13);
  svg += text(605, legendY + 27, "Outer", 13, `font-weight="700" fill="${C.brick}"`);
  svg += rect(648, legendY + 15, 12, 16, C.green, "none", 2);
  svg += text(670, legendY + 27, "Green + note name = scale tone", 13);
  svg += text(950, legendY + 27, "Two octaves · low to high, left to right", 13);
  svg += text(60, height - 36, `Fourth-first for band classrooms · ${paper.label}`, 11, `fill="${C.muted}"`);
  svg += text(cx, height - 36, "Notes below each xylophone start on the tonic.", 11, `text-anchor="middle" fill="${C.muted}"`);
  svg += text(width - 60, height - 36, "BACKWERD RHYTHM SHOP", 11, `text-anchor="end" fill="${C.brick}" font-weight="700" letter-spacing="1"`);
  return svg + "</svg>";
}
