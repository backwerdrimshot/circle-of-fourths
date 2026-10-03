/* The build this app ships, as an ISO date (YYYY-MM-DD), with .2, .3 for a later
   build the same day — the same format every other Backwerd app uses.

   This is the one place that states it. scripts/capabilities.mjs publishes it as
   public/capabilities.json, and if the app ever renders a build stamp it must
   import this too. The `version` in package.json is package identity only; the
   app moved from semantic versions to date builds on 2026-10-03 (last: 0.15.2). */
export const BUILD = "2026-10-03.3";
