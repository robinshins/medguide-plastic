// SVG → PNG asset generation. Run manually (`npm run assets`), commit the output.
//
// Sources:
//   design/source/og.svg   → public/og/og.png        (1200x630 — social scrapers need raster)
//   src/app/icon.svg       → src/app/apple-icon.png  (180x180)
//                          → public/logo-512.png     (Organization.logo for JSON-LD)
//   generated rank badges  → public/og/rank-1..7.{svg,png}
//
// IMPORTANT: Korean text inside source SVGs must be outlined to <path> before
// rasterizing. sharp/librsvg resolves <text> against SYSTEM fonts — it renders on a
// Mac and silently breaks in CI. The generated rank badges use Latin text only
// (Helvetica/Arial exist everywhere librsvg runs).

// Run with `npm run assets` (tsx) — plain `node` cannot import the .ts token file.
import sharp from 'sharp';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { brand } from '../src/design/tokens.ts';

const png = (svg, w, h, out) =>
  sharp(Buffer.from(svg)).resize(w, h).png({ compressionLevel: 9, palette: true }).toFile(out);

await mkdir('public/og', { recursive: true });

// 1) site OG image
if (existsSync('design/source/og.svg')) {
  const og = await readFile('design/source/og.svg', 'utf8');
  await png(og, 1200, 630, 'public/og/og.png');
  console.log('public/og/og.png');
} else {
  console.warn('design/source/og.svg missing — skipping OG image');
}

// 2) favicon-derived rasters
if (existsSync('src/app/icon.svg')) {
  const mark = await readFile('src/app/icon.svg', 'utf8');
  await png(mark, 180, 180, 'src/app/apple-icon.png');
  await png(mark, 512, 512, 'public/logo-512.png');
  await writeFile('public/logo.svg', mark);
  console.log('src/app/apple-icon.png, public/logo-512.png, public/logo.svg');
} else {
  console.warn('src/app/icon.svg missing — skipping icon rasters');
}

// 3) rank badges 1..7 (referenced from ItemList JSON-LD)
const rankSvg = n => `<svg width="208" height="208" viewBox="0 0 208 208" xmlns="http://www.w3.org/2000/svg">
  <rect width="208" height="208" rx="28" fill="${brand[50]}"/>
  <rect x="5" y="5" width="198" height="198" rx="24" fill="#FFFFFF" stroke="${brand[200]}" stroke-width="2"/>
  <circle cx="104" cy="86" r="46" fill="none" stroke="${brand[300]}" stroke-width="3"/>
  <circle cx="104" cy="86" r="56" fill="none" stroke="${brand[200]}" stroke-width="1.5"/>
  <text x="104" y="107" text-anchor="middle" font-family="Helvetica,Arial,sans-serif"
        font-size="60" font-weight="700" fill="${brand[600]}">${n}</text>
  <text x="104" y="170" text-anchor="middle" font-family="Helvetica,Arial,sans-serif"
        font-size="17" font-weight="600" letter-spacing="5" fill="${brand[400]}">RANK</text>
</svg>`;

for (let n = 1; n <= 7; n++) {
  const svg = rankSvg(n);
  await writeFile(`public/og/rank-${n}.svg`, svg);
  await png(svg, 208, 208, `public/og/rank-${n}.png`);
}
console.log('public/og/rank-1..7.{svg,png}');
console.log('done');
