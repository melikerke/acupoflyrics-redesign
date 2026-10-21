import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { staticSongAnnotations, staticSongVideoLink } from '../scripts/lib/prerenderContent.js';
import { annotationsFor } from '../src/lib/annotations.js';

const posts = JSON.parse(await readFile(new URL('../src/data/posts.json', import.meta.url), 'utf8'));
const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

test('notes are native disclosures with their text present before any JavaScript runs', () => {
  const html = staticSongAnnotations({ slug: 'fixture', annotations: { 'bir <imge>': 'Bir açıklama & "devamı"', empty: ' ', invalid: null } });
  assert.equal((html.match(/<details\b/g) || []).length, 1);
  assert.ok(html.includes('<summary class="detail-lyric-annot">bir &lt;imge&gt;</summary>'));
  assert.ok(html.includes('<p class="seo-translation-note-text">Bir açıklama &amp; &quot;devamı&quot;</p>'));
  assert.doesNotMatch(html, /<script|\bhidden\b|aria-hidden|onclick|<iframe/);
  assert.equal(staticSongAnnotations({ slug: 'fixture' }), '');
});

test('legacy and post-level notes share the same renderer, with post-level overrides', () => {
  const slug = 'the-weeknd-hurry-up-tomorrow-turkce-ceviri';
  const inherited = annotationsFor(slug);
  const term = Object.keys(inherited)[0];
  const html = staticSongAnnotations({ slug, annotations: { [term]: 'Güncel not', 'yeni not': 'Ek açıklama' } });
  assert.ok(html.includes('Güncel not'));
  assert.ok(!html.includes(escape(inherited[term])));
  for (const key of Object.keys(inherited).slice(1)) assert.ok(html.includes(escape(inherited[key])));
  assert.ok(html.includes('Ek açıklama'));
});

test('YouTube links use both metadata formats and escape text without embedding a player', () => {
  const post = { artist: 'Artist & Friend', song: '<Song>', youtubeUrl: 'https://www.youtube.com/watch?v=S9bCLPwzSC0&t=10' };
  const html = staticSongVideoLink(post);
  assert.ok(html.includes('href="https://www.youtube.com/watch?v=S9bCLPwzSC0&amp;t=10"'));
  assert.ok(html.includes('Artist &amp; Friend — &lt;Song&gt;'));
  assert.ok(html.includes('rel="noopener noreferrer"'));
  assert.doesNotMatch(html, /<iframe|<script/);
  assert.ok(staticSongVideoLink({ ...post, youtubeUrl: undefined, youtube: { url: 'https://youtu.be/S9bCLPwzSC0' } }).includes('href="https://youtu.be/S9bCLPwzSC0"'));
  for (const url of ['javascript:alert(1)', 'data:text/html,test', 'https://youtube.com.evil.example/watch?v=123', 'not a url', undefined]) {
    assert.equal(staticSongVideoLink({ ...post, youtubeUrl: url }), '');
  }
});

test('ALL old and new song pages contain note text and video anchors inside initial main HTML', async () => {
  let notePages = 0;
  let videoPages = 0;
  for (const post of posts) {
    const expectedNotes = staticSongAnnotations(post);
    const expectedVideo = staticSongVideoLink(post);
    if (!expectedNotes && !expectedVideo) continue;
    const html = await readFile(new URL(`../dist/${post.slug}/index.html`, import.meta.url), 'utf8');
    const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/)?.[1] || '';
    assert.ok(main, post.slug);
    if (expectedNotes) {
      assert.ok(main.includes(expectedNotes), `${post.slug}: notes must be real main HTML, not only JSON-LD`);
      const entries = Object.entries({ ...annotationsFor(post.slug), ...(post.annotations || {}) })
        .filter(([term, note]) => term.trim() && typeof note === 'string' && note.trim());
      assert.equal((expectedNotes.match(/class="detail-lyric-annot"/g) || []).length, entries.length, post.slug);
      for (const [term, note] of entries) {
        assert.ok(main.includes(`<summary class="detail-lyric-annot">${escape(term)}</summary>`), post.slug);
        assert.ok(main.includes(`<p class="seo-translation-note-text">${escape(note)}</p>`), post.slug);
      }
      notePages++;
    }
    if (expectedVideo) {
      assert.ok(main.includes(expectedVideo), `${post.slug}: missing YouTube anchor`);
      videoPages++;
    }
  }
  assert.ok(notePages > 200, 'Must cover legacy notes, not just the twelve new songs');
  assert.ok(videoPages > 300, 'Must cover older video metadata too');
});

test('Eminem — Mockingbird has seven unique initial-HTML notes and its exact YouTube URL', async () => {
  const post = posts.find(p => p.slug === 'eminem-mockingbird-turkce-ceviri');
  assert.equal(Object.keys(post.annotations).length, 7);
  const html = await readFile(new URL(`../dist/${post.slug}/index.html`, import.meta.url), 'utf8');
  assert.equal((html.match(/class="detail-lyric-annot"/g) || []).length, 7);
  assert.ok(html.includes('<a href="https://www.youtube.com/watch?v=S9bCLPwzSC0"'));
  assert.ok(html.includes(escape(post.annotations['metanetli ol'])));
});
