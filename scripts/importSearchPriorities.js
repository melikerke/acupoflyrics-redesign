// Reproducible, read-only GSC CSV input; publishes only aggregate page clicks.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { buildPerformerCatalog, creditsFor } from '../src/lib/artistCatalog.js';
const zip = process.argv[2];
if (!zip) throw new Error('Pass the Search Console CSV export ZIP.');
const posts = JSON.parse(fs.readFileSync('src/data/posts.json', 'utf8'));
const artists = buildPerformerCatalog(JSON.parse(fs.readFileSync('src/data/artists.json', 'utf8')), posts);
const csv = execFileSync('unzip', ['-p', zip, 'Sayfa*'], { encoding: 'utf8' });
const clicks = {};
let unmatchedClicks = 0;
for (const line of csv.trim().split(/\r?\n/).slice(1)) {
  const [url, count] = line.split(',');
  const slug = new URL(url).pathname.replace(/^\/+|\/+$/g, '');
  if (!posts.some(p => p.slug === slug)) { unmatchedClicks += Number(count); continue; }
  clicks[slug] = (clicks[slug] || 0) + Number(count);
}
const ranking = artists.map(a => ({ name: a.name, slug: a.slug,
  clicks: posts.filter(p => creditsFor(p, artists).some(c => c.slug === a.slug)).reduce((s, p) => s + (clicks[p.slug] || 0), 0) }))
  .sort((a, b) => b.clicks - a.clicks || a.slug.localeCompare(b.slug));
fs.writeFileSync('src/data/searchPriorities.json', JSON.stringify({
  source: 'Google Search Console / Web / Pages export', exportedAt: '2026-10-26',
  startDate: '2026-07-27', endDate: '2026-10-24',
  method: 'Canonical song paths; full song clicks credited to each performing artist. Artist sums are not site totals. Unmatched URLs excluded; export limited to 1000 rows.',
  unmatchedClicks, topArtists: ranking.slice(0, 20), clicks,
}, null, 2) + '\n');
console.log(ranking.slice(0, 20));
