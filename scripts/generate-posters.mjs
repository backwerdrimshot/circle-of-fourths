import { mkdir, writeFile } from "node:fs/promises";
import { deflateSync } from "node:zlib";
import sharp from "sharp";
import { createPosterSvg, POSTER_PAPERS } from "../lib/poster-artwork.mjs";

// Lossless 300-dpi RGB artwork, flattened once for predictable classroom printing.
// The SVG beside each PDF is the identical artwork used by the app preview.
function imagePdf(rgb, pixels, paper) {
  const compressed = deflateSync(rgb);
  const command = Buffer.from(`q\n${paper.width} 0 0 ${paper.height} 0 0 cm\n/Poster Do\nQ\n`);
  const stream = (dictionary, data) => Buffer.concat([
    Buffer.from(`<< ${dictionary} /Length ${data.length} >>\nstream\n`), data, Buffer.from("\nendstream"),
  ]);
  const objects = [
    Buffer.from("<< /Type /Catalog /Pages 2 0 R >>"),
    Buffer.from("<< /Type /Pages /Kids [3 0 R] /Count 1 >>"),
    Buffer.from(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${paper.width} ${paper.height}] /Resources << /XObject << /Poster 4 0 R >> >> /Contents 5 0 R >>`),
    stream(`/Type /XObject /Subtype /Image /Width ${pixels.width} /Height ${pixels.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode`, compressed),
    stream("", command),
    Buffer.from("<< /Title (Circle of Fourths - Classroom Reference) /Author (Backwerd Rhythm Shop) /Creator (Circle of Fourths poster generator) >>"),
  ];
  const parts = [Buffer.from("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n", "binary")];
  const offsets = [0];
  let length = parts[0].length;
  for (const [index, body] of objects.entries()) {
    offsets.push(length);
    const object = Buffer.concat([Buffer.from(`${index + 1} 0 obj\n`), body, Buffer.from("\nendobj\n")]);
    parts.push(object);
    length += object.length;
  }
  const xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info 6 0 R >>\nstartxref\n${length}\n%%EOF\n`;
  return Buffer.concat([...parts, Buffer.from(xref)]);
}

const output = new URL("../public/posters/", import.meta.url);
await mkdir(output, { recursive: true });
for (const [size, paper] of Object.entries(POSTER_PAPERS)) {
  const svg = createPosterSvg(size);
  const { data, info } = await sharp(Buffer.from(svg), { density: 300 }).flatten({ background: "#ffffff" }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  if (info.channels !== 3) throw new Error("Poster must export as RGB");
  await writeFile(new URL(`${paper.filename}.svg`, output), svg);
  await writeFile(new URL(`${paper.filename}.pdf`, output), imagePdf(data, info, paper));
  process.stdout.write(`${paper.label}: ${info.width} × ${info.height} pixels, one page at 300 dpi\n`);
}
