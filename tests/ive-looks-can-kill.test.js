import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { songInsights } from '../src/data/songInsights.js';

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const slug = 'ive-looks-can-kill-turkce-ceviri';
const matches = JSON.parse(read('src/data/posts.json')).filter(post => post.slug === slug);
const post = matches[0];
const hash = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');

test('IVE — Looks Can Kill preserves submitted Turkish wording and paired sections', () => {
  assert.equal(matches.length, 1);
  assert.equal(post.blocks.length, 26);
  assert.equal(hash(post.blocks.filter(block => !block.original).map(block => block.lines)), 'fdb5a3a46e8da411ea0a7be1bd8174c6f98aac4fdd40ebe268bb49da9b247af8');
  assert.equal(hash(post.originalScriptBlocks), 'bae0838c716fef24d0cd0573ee6a51b6130f8e594d054746b839653cf50f575e');
  for (let i = 0; i < post.blocks.length; i += 2) {
    assert.equal(post.blocks[i].original, true);
    assert.equal(post.blocks[i + 1].original, false);
    assert.equal(post.blocks[i].label, post.blocks[i + 1].label);
    assert.doesNotMatch(post.blocks[i].lines.join('\n'), /[가-힣]/);
  }
  assert.match(post.blocks[2].lines.join('\n'), /annyeong/);
  assert.match(post.blocks.filter(block => !block.original).flatMap(block => block.lines).join('\n'), /Kelebek gibi süzülür, arı gibi sokar, sonra da veda ederim! Yeah, yeah!/);
});

test('IVE — Looks Can Kill has eighteen reachable notes and album-specific track metadata', () => {
  const keys = Object.keys(post.annotations);
  assert.equal(keys.length, 18);
  const lines = post.blocks.filter(block => !block.original).flatMap(block => block.lines);
  const reachable = new Set(lines.map(line => keys.find(key => line.toLocaleLowerCase().includes(key.toLocaleLowerCase()))));
  for (const key of keys) assert.ok(reachable.has(key), key);
  assert.equal(post.spotify.track.id, '47a5QAoyLzC8MwG49hbo76');
  assert.equal(post.spotify.albumName, 'Looks Can Kill');
  assert.equal(post.spotify.albumType, 'EP');
  assert.equal(post.spotify.releaseDate, '2026-10-26');
  assert.equal(post.youtubeUrl, 'https://www.youtube.com/watch?v=rsNhWkC4neE');
  assert.ok(post.genres.includes('dance-pop') && post.moods.includes('Motivation'));
  assert.equal(songInsights[slug].faq.length, 3);
  assert.match(songInsights[slug].faq[1].answer, /19 Ekim 2026/);
  assert.match(songInsights[slug].faq[1].answer, /26 Ekim 2026/);
  assert.doesNotMatch(JSON.stringify(post.annotations), /google\.com\/s2|images\.openai\.com|\[image\]|\+1/);
});

test('IVE — Looks Can Kill has notes, FAQs, media and catalog links in first HTML', () => {
  const html = read(`dist/${slug}/index.html`).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  assert.equal((html.match(/class="seo-translation-note"/g) || []).length, 18);
  assert.ok(html.includes('https://open.spotify.com/track/47a5QAoyLzC8MwG49hbo76'));
  assert.ok(html.includes('https://www.youtube.com/watch?v=rsNhWkC4neE'));
  assert.ok(html.includes('Şarkı ne anlatıyor?'));
  assert.ok(html.includes('Melike Erke'));
  assert.ok(read('dist/sitemap-songs.xml').includes(`/${slug}/</loc>`));
  assert.ok(read('dist/artist/ive/index.html').includes(slug));
  assert.ok(read('dist/album/ive-looks-can-kill/index.html').includes(slug));
});
