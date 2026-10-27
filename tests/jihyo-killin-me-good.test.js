import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { songInsights } from '../src/data/songInsights.js';

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const slug = 'jihyo-killin-me-good-turkce-ceviri';
const matches = JSON.parse(read('src/data/posts.json')).filter(post => post.slug === slug);
const post = matches[0];
const hash = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');

test('JIHYO — Killin’ Me Good preserves the submitted translation in 12 matched sections', () => {
  assert.equal(matches.length, 1);
  assert.equal(post.blocks.length, 24);
  const translations = post.blocks.filter(block => !block.original).map(block => block.lines);
  assert.equal(hash(translations), 'eaceecb911aec47525ee90a112ce5ddad270dc1b6e8fe56f512bf0cf027404fc');
  assert.equal(hash(post.originalScriptBlocks), 'c9b26e46a82cf4bf10703c63cc49663ea47b0ddb5f7f30b6a4c6f5b8345b56ba');
  for (let i = 0; i < post.blocks.length; i += 2) {
    assert.equal(post.blocks[i].original, true);
    assert.equal(post.blocks[i + 1].original, false);
    assert.equal(post.blocks[i].label, post.blocks[i + 1].label);
    assert.doesNotMatch(post.blocks[i].lines.join('\n'), /[가-힣]/);
  }
  assert.match(post.blocks[2].lines.join('\n'), /cheoeum ibeul daen geu sungan/);
  assert.equal(post.languages.original, 'ko');
});

test('JIHYO — Killin’ Me Good has 21 reachable notes and verified album/media metadata', () => {
  const keys = Object.keys(post.annotations);
  assert.equal(keys.length, 21);
  const lines = post.blocks.filter(block => !block.original).flatMap(block => block.lines);
  const reachable = new Set(lines.map(line => keys.find(key => line.toLocaleLowerCase().includes(key.toLocaleLowerCase()))));
  for (const key of keys) assert.ok(reachable.has(key), key);
  assert.equal(post.spotify.track.id, '4Cyf87ul1le0xTWRFBoYd7');
  assert.equal(post.spotify.albumName, 'ZONE');
  assert.equal(post.spotify.releaseDate, '2023-08-18');
  assert.equal(post.youtubeUrl, 'https://www.youtube.com/watch?v=jyw_vrI4ySg');
  assert.ok(post.genres.includes('r&b') && post.moods.includes('Love'));
  assert.equal(songInsights[slug].faq.length, 3);
  assert.doesNotMatch(JSON.stringify(post.annotations), /google\.com\/s2|images\.openai\.com|\[image\]|\+1/);
});

test('JIHYO — Killin’ Me Good renders notes, summary, sources and media in initial HTML', () => {
  const html = read(`dist/${slug}/index.html`).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  assert.equal((html.match(/class="seo-translation-note"/g) || []).length, 21);
  assert.ok(html.includes('https://open.spotify.com/track/4Cyf87ul1le0xTWRFBoYd7'));
  assert.ok(html.includes('https://www.youtube.com/watch?v=jyw_vrI4ySg'));
  assert.ok(html.includes('Şarkı ne anlatıyor?'));
  assert.ok(html.includes('Melike Erke'));
  assert.ok(html.includes('https://www.elle.com/culture/music/a44841474/jihyo-twice-zone-interview/'));
  assert.ok(read('dist/sitemap-songs.xml').includes(`/${slug}/</loc>`));
  assert.ok(read('dist/artist/jihyo/index.html').includes(slug));
  assert.ok(read('dist/album/jihyo-zone/index.html').includes(slug));
});
