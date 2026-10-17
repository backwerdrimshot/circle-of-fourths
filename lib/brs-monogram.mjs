// The BRS monogram from public/brs-monogram.svg, ready to nest in poster artwork.
// Its clip paths only frame the 1080 square, so they are dropped with the white
// disc; tests/poster-artwork.test.mjs keeps this copy equal to the file.
export function monogramMarkup(svg) {
  return svg.slice(svg.indexOf(">") + 1, svg.indexOf("<defs>"))
    .replace(/<\/?g[^>]*>/g, "")
    .replace(/<path d="M540 1080C[^"]*" fill="white"\/>/, "")
    .replace(/\s*\n\s*/g, "");
}
