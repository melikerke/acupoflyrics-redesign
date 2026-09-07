import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { readFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { heroPair } from '../scripts/lib/contentIndexes.js';

test('homepage dependency graph does not load the complete song, artist or article catalogs', async () => {
  const result = await build({ entryPoints: ['src/pages/HomePreview.jsx'], bundle: true, format: 'esm', platform: 'browser', write: false, metafile: true, loader: { '.css': 'empty' }, logLevel: 'silent' });
  const inputs = Object.keys(result.metafile.inputs);
  assert.ok(inputs.some((path) => path.endsWith('homeIndex.json')));
  assert.equal(inputs.filter((path) => /src\/(?:lib\/content\.js|data\/(?:postIndex|artistIndex|popGundemiIndex)\.json)$/.test(path)).length, 0);
});

test('home payload preserves the former shelves and priority hero without the full catalog', async () => {
  const homeText = await readFile('src/data/homeIndex.json', 'utf8');
  const home = JSON.parse(homeText);
  const posts = JSON.parse(await readFile('src/data/posts.json', 'utf8'));
  const first = home.contentPlan.heroPosts[0];
  const expectedHero = posts.slice(0, 12).find((post) => post.slug === 'jennie-fallen-angel-turkce-ceviri') || posts[0];
  assert.equal(first.slug, expectedHero.slug);
  assert.deepEqual(first.heroPair, heroPair(posts.find((post) => post.slug === first.slug)));
  assert.equal(home.contentPlan.heroPosts.length, 5);
  assert.equal(home.contentPlan.latest.length, 8);
  assert.equal(home.albums.length, 8);
  assert.equal(home.collections.length, 12);
  assert.equal(home.dailyFeatures.length, 31);
  assert.equal(home.contentPlan.archiveNewest.length, 6);
  assert.equal(home.contentPlan.archiveUpdated.length, 6);
  assert.deepEqual(Object.keys(home.contentPlan.genreShelves), ['Pop', 'Hip Hop', 'K-pop', 'Rock']);
  assert.ok(gzipSync(homeText).length < 25000, 'Only visible home data belongs in the opening bundle');
  assert.equal(JSON.parse(await readFile('src/data/siteStats.json', 'utf8')).totalPosts, posts.length);
  assert.ok(home.contentPlan.latest.every((post) => !('blocks' in post)));
});

test('first visits fetch nothing; new history stores small cards and old slugs migrate on demand', async () => {
  const oldWindow = globalThis.window;
  const oldFetch = globalThis.fetch;
  const oldCustomEvent = globalThis.CustomEvent;
  const storage = new Map();
  let requests = 0;
  globalThis.window = { localStorage: { getItem: (key) => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) }, dispatchEvent() {} };
  globalThis.CustomEvent ||= class CustomEvent { constructor(type) { this.type = type; } };
  globalThis.fetch = async (url) => {
    requests += 1;
    assert.ok(url.startsWith('/data/cards/'));
    const slug = url.split('/').at(-1).replace('.json', '');
    return { ok: true, json: async () => ({ slug, song: 'Legacy song', artist: 'Artist', cover: '/cover.jpg', year: '2024', readingTime: 3 }) };
  };
  try {
    const history = await import('../src/lib/history.js?home-regression');
    assert.deepEqual(await history.loadHistoryCards(), []);
    assert.equal(requests, 0);
    history.addHistory('new-song', { slug: 'new-song', song: 'New song', artist: 'Artist', cover: '/cover.jpg', date: '2026-09-07', reading_time: 4, blocks: [{ lines: ['Private full lyric data'] }] });
    assert.equal(history.getHistory()[0].song, 'New song');
    assert.ok(!storage.get('apl_history').includes('blocks'));
    await history.loadHistoryCards();
    assert.equal(requests, 0);
    storage.set('apl_history', JSON.stringify(['old-song']));
    assert.deepEqual(history.getHistorySlugs(), ['old-song']);
    assert.deepEqual(history.getHistory(), []);
    const [cards] = await Promise.all([history.loadHistoryCards(), history.loadHistoryCards()]);
    assert.equal(requests, 1);
    assert.equal(cards[0].song, 'Legacy song');
    assert.equal(history.getHistory()[0].slug, 'old-song');
  } finally { globalThis.window = oldWindow; globalThis.fetch = oldFetch; globalThis.CustomEvent = oldCustomEvent; }
});

test('history keeps successive session entries when storage reads work but writes fail', async () => {
  const oldWindow = globalThis.window;
  const oldCustomEvent = globalThis.CustomEvent;
  globalThis.window = { localStorage: { getItem: () => JSON.stringify(['old-song']), setItem() { throw new Error('Quota exceeded'); } }, dispatchEvent() {} };
  globalThis.CustomEvent ||= class CustomEvent { constructor(type) { this.type = type; } };
  try {
    const history = await import('../src/lib/history.js?failed-write-regression');
    const card = (slug) => ({ slug, song: slug, artist: 'Artist', cover: '/cover.jpg', reading_time: 3 });
    history.addHistory('one', card('one'));
    history.addHistory('two', card('two'));
    assert.deepEqual(history.getHistorySlugs(), ['two', 'one', 'old-song']);
    assert.deepEqual(history.getHistory().map((post) => post.slug), ['two', 'one']);
  } finally { globalThis.window = oldWindow; globalThis.CustomEvent = oldCustomEvent; }
});
