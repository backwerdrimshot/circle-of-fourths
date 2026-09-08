# Circle of Fourths

An interactive, projector-first classroom board for building and exploring key relationships. It defaults to fourths for band pedagogy and reverses to fifths without maintaining a second musical model.

## Current milestone

- Build, Poster, and relationship Focus modes
- fourths/fifths reversal
- revealable key positions with separate select and hide actions
- key-signature and relative-minor layers
- precise Bravura treble-clef signatures with separate numerical accidental counts
- concentric information bands: key/count core, notation/minor middle ring, and keyboard outer ring
- selected-key detail panel
- compact graduated percussion-bar diagrams around all twelve circle positions, with a piano option and ranges of about 1½ octaves that adapt to each scale
- exactly one tonic-to-tonic octave highlighted, with both tonic bars outlined
- enharmonic spelling switches for D♭/C♯, G♭/F♯, and C♭/B
- major/relative natural minor comparison that changes the tonic and scale order while preserving the shared signature
- a touch-sized phone circle with the selected scale and staff below it
- independently toggleable scale-degree roles with functional names and shareable state
- one-tap fourth/flat-lesson and seventh/sharp-lesson role presets
- Quiz Builder v0.1 with editable presets, scope controls, and Given/Answer/Omitted field roles
- student worksheet and teacher answer-key previews with shareable URL state
- print-ready worksheet directions and student identification lines
- canonical, fourths-first Classroom Poster with every stable reference layer, dedicated masthead, legend, and print-safe layout
- direct, finished US Letter, A4, and 11×17 PDF downloads with flattened print-safe colors
- custom teaching-board printing remains separate from the standard poster and future Praxis assignment authoring
- toggleable BEADGCF flat order with its reverse sharp order
- URL-persisted lesson state, including selected key, spelling choices, and major/minor view
- compact teaching toolbar with a separate layer/display drawer
- copy-link, opened-link reset, start-fresh reset, board/quiz print actions, and fixed poster downloads
- framed teaching-board layout with a shareable Presentation view
- Backwerd Rhythm Shop palette using warm white, deep brick, forest, and tan roles
- deterministic musical model with automated tests
- return from the poster to the current lesson, or open a fresh teaching board from a direct poster link

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
preview and its finished downloads. Every diagram shows about 1½ octaves of
separate, graduated percussion bars, with exactly eight highlighted bars tracing one
tonic-to-tonic major scale. Fifteen written keys share twelve positions, with
D♭/C♯, G♭/F♯, and C♭/B paired to demonstrate enharmonic spelling. Each spelling
has its own staff labeled with the major key and relative minor. Note names appear
on the highlighted bars, with no repeated note sequences below the instruments.
The two tonic bars have a thick dark outline. Teaching examples connect C major
with A minor and explain C♭/B, F♭/E, E♯/F, and B♯/C on the same physical bars.
The paired signatures sit side by side, allowing larger staves with explicit
relative-minor labels and clear gutters even on Letter paper.
The displayed ranges adapt to each scale: 18–20 consecutive chromatic bars keep
the full highlighted octave and both tonic bars in view, with natural bars at
both ends. The interactive app uses the same ranges for its xylophone and piano
diagrams, adjusting them when the selected key or major/relative-minor view changes.
Every physical semitone within a displayed range remains present.
The canonical C5–C7 source geometry in `lib/xylophone-two-octaves.json` remains a cropped, attributed
snapshot of the shop’s canonical xylophone specification (the full-instrument
taper is preserved); compact diagrams select a window from that source.

Staff symbols use the shop’s pinned Bravura outlines in `lib/notation-glyphs.json`,
registered to explicit treble-staff pitches. The font license is included in
`public/licenses/bravura-LICENSE.txt`; staff rendering does not depend on text-font
baselines or fonts installed on the viewer’s device.

After changing the poster artwork, regenerate all three sizes with:

```bash
pnpm posters:build
```

This emits matching SVGs and single-page, lossless 300-dpi RGB PDFs under
`public/posters/`. The PDFs are deliberately flattened for reliable printing;
the SVGs retain scalable text and bar shapes. The geometry checks cover every
card pair and its clearance from the masthead and footer in each paper size.
