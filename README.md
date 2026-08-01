# Circle of Fourths

An interactive, projector-first classroom board for building and exploring key relationships. It defaults to fourths for band pedagogy and reverses to fifths without maintaining a second musical model.

## Current milestone

- Build and Poster modes
- fourths/fifths reversal
- revealable key positions
- key-signature and relative-minor layers
- visual staff signatures with separate numerical accidental counts
- selected-key detail panel
- two-octave practice-marimba scale preview
- URL-persisted lesson state
- copy-link, reset, and print actions
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
