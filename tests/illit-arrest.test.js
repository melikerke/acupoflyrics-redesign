import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { songInsights } from '../src/data/songInsights.js';
import { translationQueue } from '../src/data/editorialFeatures.js';

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const slug = 'illit-youre-under-arrest-turkce-ceviri';
const posts = JSON.parse(read('src/data/posts.json'));
const matches = posts.filter(post => post.slug === slug);
const post = matches[0];
const hash = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');

test('ILLIT — You’re Under Arrest preserves all submitted Turkish sections and Korean source', () => {
  assert.equal(matches.length, 1);
  assert.equal(post.blocks.length, 22);
  assert.equal(hash(post.blocks.filter(block => !block.original).map(block => block.lines)), 'f9f57595828c8a725698c5e20023a7bdaf40dc909f9c47418d0da06dca35b30d');
  assert.equal(hash(post.originalScriptBlocks), 'bc6a457c20ee68bcaaea4c9ca90ca9c34bdcc5333fb267dacb53ebf6c20c51bd');
  for (let i = 0; i < post.blocks.length; i += 2) {
    assert.equal(post.blocks[i].original, true);
    assert.equal(post.blocks[i + 1].original, false);
    assert.equal(post.blocks[i].label, post.blocks[i + 1].label);
    assert.doesNotMatch(post.blocks[i].lines.join('\n'), /[가-힣]/);
  }
  assert.match(post.blocks[0].lines.join('\n'), /saekki songarak geon yaksogeun an haetjiman/);
});

test('ILLIT — You’re Under Arrest has ten reachable notes, official title and media', () => {
  const keys = Object.keys(post.annotations);
  assert.equal(keys.length, 10);
  const lines = post.blocks.filter(block => !block.original).flatMap(block => block.lines);
  const reachable = new Set(lines.map(line => keys.find(key => line.toLocaleLowerCase().includes(key.toLocaleLowerCase()))));
  for (const key of keys) assert.ok(reachable.has(key), key);
  assert.equal(post.song, 'You’re Under Arrest');
  assert.equal(post.spotify.track.id, '0pMoUGdpD8nupNP1mSdZUn');
  assert.equal(post.spotify.albumName, 'BREAK EVEN');
  assert.equal(post.spotify.releaseDate, '2026-10-26');
  assert.equal(post.youtubeUrl, 'https://www.youtube.com/watch?v=V2V9-9VhYJo');
  assert.ok(post.genres.includes('electropop') && post.moods.includes('Breakup'));
  assert.equal(songInsights[slug].faq.length, 3);
  assert.ok(songInsights[slug].faq[0].question.includes('I’ll Arrest You'));
  assert.ok(!translationQueue.some(item => item.artist === 'ILLIT' && /Arrest/.test(item.song)));
  assert.doesNotMatch(JSON.stringify(post.annotations), /google\.com\/s2|images\.openai\.com|\[image\]|\+1/);
});

test('ILLIT — You’re Under Arrest has notes, FAQs, media and catalog links in first HTML', () => {
  const html = read(`dist/${slug}/index.html`).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  assert.equal((html.match(/class="seo-translation-note"/g) || []).length, 10);
  assert.ok(html.includes('https://open.spotify.com/track/0pMoUGdpD8nupNP1mSdZUn'));
  assert.ok(html.includes('https://www.youtube.com/watch?v=V2V9-9VhYJo'));
  assert.ok(html.includes('Şarkı ne anlatıyor?'));
  assert.ok(html.includes('Melike Erke'));
  assert.ok(read('dist/sitemap-songs.xml').includes(`/${slug}/</loc>`));
  assert.ok(read('dist/artist/illit/index.html').includes(slug));
  assert.ok(read('dist/album/illit-break-even/index.html').includes(slug));
});
