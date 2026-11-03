// Extract only the two licensed font assets from the supplied design bundle.
// Never execute the bundle's scripts.
import fs from 'node:fs';
import path from 'node:path';
import { gunzipSync } from 'node:zlib';

const source = fs.readFileSync(process.argv[2], 'utf8');
const manifest = JSON.parse(source.match(/<script type="__bundler\/manifest">([\s\S]*?)<\/script>/)[1]);
const directory = path.resolve('public/fonts');
for (const [id, name] of [
  ['889b24ed-dbe1-40f4-bf7f-6370692c7609', 'bricolage-grotesque-latin-ext.woff2'],
  ['031eba35-2b5d-466f-8593-e63ab503c824', 'bricolage-grotesque-latin.woff2'],
]) {
  const entry = manifest[id];
  const bytes = Buffer.from(entry.data, 'base64');
  const font = entry.compressed ? gunzipSync(bytes) : bytes;
  if (font.subarray(0, 4).toString() !== 'wOF2') throw new Error('Invalid WOFF2 asset');
  const target = path.join(directory, name);
  if (fs.existsSync(target)) throw new Error(`Already exists: ${target}`);
  fs.writeFileSync(target, font);
}
const license = source.slice(source.indexOf('Bricolage Grotesque\n'), source.indexOf('\nInter\n'));
fs.writeFileSync(path.join(directory, 'bricolage-grotesque-LICENSE.txt'), license.trim() + '\n');
