import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import middleware from '../middleware.js';

test('SaWaDiKa joins PRESS PLAY without changing lyrics or annotations', () => {
  const posts = JSON.parse(fs.readFileSync(new URL('../src/data/posts.json', import.meta.url)));
  const post = posts.find(post => post.slug === 'lisa-sawadika-turkce-ceviri');
  assert.equal(crypto.createHash('sha256').update(JSON.stringify([post.blocks, post.annotations, post.difficulty_note])).digest('hex'), '8e85691586312867ca65cbc51b6b35905b933667d0413c424deebb1e4c444672');
  assert.equal(post.spotify.albumName, 'PRESS PLAY');
  assert.equal(post.spotify.track.id, '0UECk3l1544vRUzYoZO5gI');
  assert.equal(post.spotify.album.name, post.spotify.albumName);
  assert.deepEqual(post.categories, ['LISA', 'PRESS PLAY']);
  assert.equal(posts.filter(post => post.artist === 'LISA' && post.spotify?.albumName === 'PRESS PLAY').length, 6);
  const html = fs.readFileSync(new URL('../dist/album/lisa-press-play/index.html', import.meta.url), 'utf8');
  assert.ok(html.includes('/lisa-sawadika-turkce-ceviri/'));
});

test('old SaWaDiKa album URLs permanently redirect to PRESS PLAY', async () => {
  for (const suffix of ['', '/']) {
    const response = await middleware(new Request(`https://www.acupoflyrics.com/album/lisa-sawadika${suffix}`));
    assert.equal(response.status, 308);
    assert.equal(response.headers.get('location'), 'https://www.acupoflyrics.com/album/lisa-press-play');
  }
  const redirects = fs.readFileSync(new URL('../dist/_redirects', import.meta.url), 'utf8');
  assert.ok(redirects.includes('/album/lisa-sawadika /album/lisa-press-play 301'));
});
