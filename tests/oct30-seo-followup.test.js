import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import posts from '../src/data/posts.json' with { type: 'json' };
import index from '../src/data/postIndex.json' with { type: 'json' };
import { catalogTranslationTitle, normalizeSeoTitle } from '../src/lib/meta.js';
import { relatedSongs } from '../src/lib/relatedSongs.js';

test('long title fallback always preserves Sözleri ve Türkçe Çeviri', () => {
  for (const post of [
    ...posts.filter(p => /gracie-abrams-here-you-come|mariah-carey-all-i-want/.test(p.slug)),
    { song: 'A very long new song title that exceeds the preferred title budget', artist: 'First Artist, Second Artist, Third Artist' },
  ]) {
    const title = catalogTranslationTitle(post);
    assert.ok(title.includes(' Sözleri ve Türkçe Çeviri – '));
    assert.ok(!title.includes('Sözleri, Türkçe Çeviri'));
    assert.equal(normalizeSeoTitle(title), title);
    assert.ok(title.startsWith(post.song));
  }
});

const expected = {
  'ariana-grande-petal-turkce-ceviri': ['gracie-abrams-here-you-come-there-you-go-turkce-ceviri', 'billie-eilish-wildflower-turkce-ceviri', 'sabrina-carpenter-please-please-please-turkce-ceviri', 'olivia-rodrigo-the-cure-turkce-ceviri'],
  'jisoo-addicted-turkce-ceviri': ['katseye-unloveu-turkce-ceviri', 'aespa-whiplash-turkce-ceviri', 'lisa-cobra-turkce-ceviri', 'blackpink-me-and-my-turkce-ceviri'],
};

test('reviewed recommendations survive candidate ordering and match initial HTML', async () => {
  for (const [slug, slugs] of Object.entries(expected)) {
    const post = index.find(p => p.slug === slug);
    assert.ok(post);
    for (const candidates of [index, [...index].reverse()]) {
      assert.deepEqual(relatedSongs(post, candidates).map(p => p.slug), slugs);
    }
    const html = await readFile(new URL(`../dist/${slug}/index.html`, import.meta.url), 'utf8');
    const section = html.match(/<h2>Benzer şarkılar<\/h2><ul>([\s\S]*?)<\/ul>/)?.[1];
    assert.ok(section);
    assert.deepEqual([...section.matchAll(/href="([^"]+)"/g)].map(m => m[1]), slugs.map(s => `/${s}/`));
  }
});

test('Gracie single release metadata is retained', () => {
  const post = posts.find(p => p.slug === 'gracie-abrams-here-you-come-there-you-go-turkce-ceviri');
  assert.equal(post.spotify.albumType.toLowerCase(), 'single');
  assert.equal(post.spotify.releaseDate, '2026-10-29');
});
