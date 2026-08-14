#!/usr/bin/env node
/*
 * Decode the design handover into readable files.
 *
 * `index.html` and `mobile.html` are bundler outputs: the application markup is
 * a single JSON string inside <script type="__bundler/template">, next to a
 * base64 asset map (gzipped JS, woff2 fonts, and in the standalone builds the
 * images too). Neither is readable as shipped.
 *
 *   node scripts/decode-design.mjs <handover-dir> ./.design-decoded
 *
 * Writes <name>.template.html (the markup) and <name>.asset<n>.js (the logic)
 * per input file. Output is gitignored — regenerate rather than commit it.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import { gunzipSync } from 'node:zlib';

const [, , srcDir = process.argv[2], outDir = process.argv[3] ?? './.design-decoded'] = process.argv;

if (!srcDir || !existsSync(srcDir)) {
  console.error('usage: node scripts/decode-design.mjs <handover-dir> [out-dir]');
  process.exit(1);
}
mkdirSync(outDir, { recursive: true });

for (const file of ['index.html', 'mobile.html']) {
  const path = join(srcDir, file);
  if (!existsSync(path)) {
    console.warn(`skip ${file} (not found)`);
    continue;
  }
  const src = readFileSync(path, 'utf8');
  const name = basename(file, '.html');

  const tpl = src.match(/<script type="__bundler\/template">([\s\S]*?)<\/script>/);
  if (!tpl) {
    console.warn(`skip ${file} (no template)`);
    continue;
  }
  const html = JSON.parse(tpl[1]);
  writeFileSync(join(outDir, `${name}.template.html`), html);
  console.log(`${file} → ${name}.template.html  (${html.length.toLocaleString()} chars)`);

  const map = src.match(/^\{"[0-9a-f-]{36}":\{"mime"[\s\S]*\}$/m);
  if (!map) continue;
  const assets = Object.values(JSON.parse(map[0]));
  assets
    .filter((a) => a.mime.includes('javascript'))
    .forEach((a, i) => {
      let raw = Buffer.from(a.data, 'base64');
      if (a.compressed) raw = gunzipSync(raw);
      const out = `${name}.asset${i}.js`;
      writeFileSync(join(outDir, out), raw.toString('utf8'));
      console.log(`   asset ${i} → ${out}  (${raw.length.toLocaleString()} bytes)`);
    });
}

console.log(`\nDone. Note: SVG attributes are camel-escaped in the template —`);
console.log(`normalise sc-camel-view-box → viewBox and sc-camel-on-click → onClick when reading.`);
