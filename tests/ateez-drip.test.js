import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const posts = JSON.parse(read('src/data/posts.json'));
const matches = posts.filter(post => post.slug === 'ateez-drip-turkce-ceviri');
const post = matches[0];
const hash = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');

test('ATEEZ — Drip preserves lyric text in ten matched sections without speaker names', () => {
  assert.equal(matches.length, 1);
  const translated = post.blocks.filter(block => !block.original).map(block => block.lines);
  assert.equal(translated.length, 10);
  assert.equal(hash(translated), 'f72d254fc89a05a27a3b907b7a166894b6579ad6c5387d15d4c912dfbd865f28');
  assert.equal(hash(post.originalScriptBlocks), 'fec20103054ee038f2b1bfb49b556a64be3796b6c0535882c6060e05ca164d88');
  for (let i = 0; i < post.blocks.length; i += 2) {
    const original = post.blocks[i];
    const translation = post.blocks[i + 1];
    assert.equal(original.original, true);
    assert.equal(translation.original, false);
    assert.equal(original.label, translation.label);
    for (const block of [original, translation]) {
      assert.doesNotMatch(block.label, /Seonghwa|Yeosang|Wooyoung|Jongho|Mingi|San|Yunho|Hongjoong/);
      assert.ok(block.lines.every(line => line.trim() && !/^\[.*\]$/.test(line)));
    }
  }
  assert.equal(post.originalScriptBlocks.length, 10);
  const romanized = post.blocks.filter(block => block.original).flatMap(block => block.lines).join('\n');
  assert.doesNotMatch(romanized, /[가-힣]/);
  assert.match(romanized, /ne namjawaneun dareuji/);
  assert.match(romanized, /jusigeuro, Buffett/);
  assert.equal(post.languages.original, 'ko');
});

test('ATEEZ — Drip has 22 reachable notes and correct music metadata', () => {
  const keys = Object.keys(post.annotations);
  assert.equal(keys.length, 22);
  const lines = post.blocks.filter(block => !block.original).flatMap(block => block.lines);
  const reachable = new Set(lines.map(line => keys.find(key => line.toLocaleLowerCase().includes(key.toLocaleLowerCase()))));
  for (const key of keys) assert.ok(reachable.has(key), key);
  assert.equal(post.spotify.track.id, '5JaMKAodzzLdFM2ARRTXb9');
  assert.equal(post.spotify.albumName, 'Drip');
  assert.equal(post.spotify.releaseDate, '2026-10-23');
  assert.equal(post.youtubeUrl, 'https://www.youtube.com/watch?v=iqQWCYMlMw0');
  assert.ok(post.genres.includes('k-pop') && post.moods.includes('Motivation'));
});

test('ATEEZ — Drip exposes notes and listening links in first HTML and sitemap', () => {
  const html = read('dist/ateez-drip-turkce-ceviri/index.html').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  assert.equal((html.match(/class="seo-translation-note"/g) || []).length, 22);
  assert.ok(html.includes('href="https://open.spotify.com/track/5JaMKAodzzLdFM2ARRTXb9"'));
  assert.ok(html.includes('href="https://www.youtube.com/watch?v=iqQWCYMlMw0"'));
  assert.ok(html.includes('Cash is cowing'));
  assert.ok(html.includes('Melike Erke'));
  assert.ok(read('dist/sitemap-songs.xml').includes('/ateez-drip-turkce-ceviri/</loc>'));
});
