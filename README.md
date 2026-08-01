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
- toggleable BEADGCF flat order with its reverse sharp order
- URL-persisted lesson state
- compact teaching toolbar with a separate layer/display drawer
- copy-link, opened-link reset, start-fresh reset, and print actions
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
