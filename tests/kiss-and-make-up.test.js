import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { songInsights } from '../src/data/songInsights.js';

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const slug = 'dua-lipa-blackpink-kiss-and-make-up-turkce-ceviri';
const matches = JSON.parse(read('src/data/posts.json')).filter(p => p.slug === slug);
const post = matches[0];

test('user submission retains ten bilingual sections and supplied vocal credits', () => {
  assert.equal(matches.length, 1);
  assert.equal(post.blocks.length, 20);
  assert.equal(crypto.createHash('sha256').update(JSON.stringify(post.blocks)).digest('hex'), 'f77ee6450f0aad86eaab8388f55e38b96d024ad4576893055ff8e9c1a683c405');
  for (let i = 0; i < post.blocks.length; i += 2) {
    assert.equal(post.blocks[i].original, true);
    assert.equal(post.blocks[i + 1].original, false);
    assert.equal(post.blocks[i].label, post.blocks[i + 1].label);
    assert.equal(post.blocks[i].lines.length, post.blocks[i + 1].lines.length);
  }
  const original = post.blocks.filter(b => b.original).flatMap(b => b.lines).join('\n');
  assert.doesNotMatch(original, /[가-힣]/u);
  assert.match(original, /ajik neoreul mot tteonago/);
  assert.match(original, /\[Jisoo\]/);
});

test('ten notes are reachable and verified metadata includes both artists', () => {
  assert.equal(Object.keys(post.annotations).length, 10);
  const translated = post.blocks.filter(b => !b.original).flatMap(b => b.lines);
  for (const key of Object.keys(post.annotations)) assert.ok(translated.some(line => line.includes(key)), key);
  assert.doesNotMatch(JSON.stringify(post), /google\.com\/s2|images\.openai\.com|\[image\]|&#x20;/);
  assert.equal(post.artist, 'Dua Lipa & BLACKPINK');
  assert.deepEqual(post.spotify.artists.map(a => a.name), ['Dua Lipa', 'BLACKPINK']);
  assert.equal(post.spotify.track.id, '7jr3iPu4O4bTCVwLMbdU2i');
  assert.equal(post.spotify.releaseDate, '2018-10-19');
  assert.equal(post.spotify.albumName, 'Dua Lipa (Complete Edition)');
  assert.equal(post.youtubeUrl, 'https://www.youtube.com/watch?v=AX3Bsiq-13k');
  assert.ok(post.genres.length && post.moods.length);
  assert.ok(!songInsights[slug], 'No unsolicited introduction or FAQ');
});

test('built page includes notes, media, author, music schema and both artist catalogs', () => {
  const html = read(`dist/${slug}/index.html`);
  assert.equal((html.match(/class="seo-translation-note"/g) || []).length, 10);
  assert.ok(html.includes(post.youtubeUrl));
  assert.ok(html.includes(post.spotify.track.url));
  assert.ok(html.includes('Melike Erke'));
  assert.ok(html.includes('MusicRecording'));
  assert.ok(read('dist/sitemap-songs.xml').includes(`/${slug}/</loc>`));
  for (const artist of ['dua-lipa', 'blackpink']) assert.ok(read(`dist/artist/${artist}/index.html`).includes(slug));
});
