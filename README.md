# Circle of Fourths

An interactive, projector-first classroom board for building and exploring key relationships. It defaults to fourths for band pedagogy and reverses to fifths without maintaining a second musical model.

## Current milestone

- Build, Poster, and relationship Focus modes
- fourths/fifths reversal
- revealable key positions
- key-signature and relative-minor layers
- visual staff signatures with separate numerical accidental counts
- concentric information bands: key/count core, notation/minor middle ring, and keyboard outer ring
- selected-key detail panel
- toggleable one-octave xylophone or piano scale diagrams around all twelve circle positions
- two-octave selected-scale xylophone/piano detail view
- binary lit/unlit scale highlighting with an optional tonic marker
- independently toggleable scale-degree roles with functional names and shareable state
- one-tap fourth/flat-lesson and seventh/sharp-lesson role presets
- Quiz Builder v0.1 with editable presets, scope controls, and Given/Answer/Omitted field roles
- student worksheet and teacher answer-key previews with shareable URL state
- print-ready worksheet directions and student identification lines
- canonical, fourths-first Classroom Poster with every stable reference layer, dedicated masthead, legend, and print-safe layout
- direct, finished US Letter, A4, and 11×17 PDF downloads with flattened print-safe colors
- custom teaching-board printing remains separate from the standard poster and future Praxis assignment authoring
- toggleable BEADGCF flat order with its reverse sharp order
- URL-persisted lesson state
- compact teaching toolbar with a separate layer/display drawer
- copy-link, opened-link reset, start-fresh reset, board/quiz print actions, and fixed poster downloads
- framed teaching-board layout with a shareable Presentation view
- Backwerd Rhythm Shop palette using warm white, deep brick, forest, and tan roles
- deterministic musical model with automated tests

## Local development

Requires Node.js 22.13 or newer and pnpm.

```bash
pnpm install
pnpm dev
```

Run the complete verification suite with:

```bash
pnpm test
```

## Product boundary

This app owns key-relationship visualization, progressive circle construction, and future circle-native quizzes and games. Mallet Board remains the source of truth for physical keyboard geography, ranges, instruments, and scale paths. Praxis may later own teacher accounts, assignments, persistence, and learner evidence.

## Poster artwork

The standard poster uses `lib/poster-artwork.mjs` for both its responsive SVG
preview and its finished downloads. Every diagram shows two octaves of separate,
graduated percussion bars, with scale-note labels and a tonic-first note sequence.
The C5–C7 geometry in `lib/xylophone-two-octaves.json` is a cropped, attributed
snapshot of the shop’s canonical xylophone specification (the full-instrument
taper is preserved).

After changing the poster artwork, regenerate all three sizes with:

```bash
pnpm posters:build
```

This emits matching SVGs and single-page, lossless 300-dpi RGB PDFs under
`public/posters/`. The PDFs are deliberately flattened for reliable printing;
the SVGs retain scalable text and bar shapes. The geometry checks cover every
card pair and its clearance from the masthead and footer in each paper size.
