import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { annotationsFor } from '../src/lib/annotations.js';

const posts = JSON.parse(fs.readFileSync(new URL('../src/data/posts.json', import.meta.url)));
const expected = [
  {
    "slug": "lisa-tarantino-turkce-ceviri",
    "song": "Tarantino",
    "sections": 10,
    "notes": 8,
    "spotify": "3bgnrHHwyYRtz3ykzAVImy",
    "youtube": "-5ZXrO_lYSA",
    "translationHash": "b538aba1702ada866cced47f088693b6885fe8d27009448f26f6a7fd9218f2e1"
  },
  {
    "slug": "lisa-v12-turkce-ceviri",
    "song": "V12",
    "sections": 7,
    "notes": 20,
    "spotify": "5Uexd0lzW1yRLgjlUqi3Uc",
    "youtube": "mbYFoU3-B7Y",
    "translationHash": "e9a018bd323f60a458d5c1ce5aaa0b275b0dd2cbc857e24a39f7a32896f5151c"
  },
  {
    "slug": "lisa-cobra-turkce-ceviri",
    "song": "Cobra",
    "sections": 8,
    "notes": 15,
    "spotify": "6esE3NNWOh6qiQSo4I62Lv",
    "youtube": "KhoQ6YY4OB8",
    "translationHash": "73c783aa7bf4775be29eff99551498cecef45f6d358da2bd0950644463eb32f2"
  },
  {
    "slug": "lisa-cut-u-off-turkce-ceviri",
    "song": "Cut U Off",
    "sections": 7,
    "notes": 16,
    "spotify": "4NOZnyEKqujVEhHYobZfrk",
    "youtube": "HeRaW85VaLY",
    "translationHash": "84f0dc294c8609d757c7b62cd5213cddd55e9e5eb4506717ec55e9b2e8bc129d"
  },
  {
    "slug": "lisa-sweat-turkce-ceviri",
    "song": "Sweat",
    "sections": 9,
    "notes": 16,
    "spotify": "2dvKssoXPLt3RwTEGCIdGd",
    "youtube": "rvMwVzaxjYU",
    "translationHash": "395e53352f5bd65c87c7da18cd81c272a3e841ae40475fd389de045a68c09a91"
  }
];

for (const item of expected) {
  test(`LISA — ${item.song}: supplied translation, notes and listening links are preserved`, () => {
    const matches = posts.filter(post => post.slug === item.slug);
    assert.equal(matches.length, 1);
    const post = matches[0];
    const translated = post.blocks.filter(block => !block.original).map(block => block.lines);
    assert.equal(translated.length, item.sections);
    // Snapshot of the user-supplied Turkish text, including repeats and punctuation.
    assert.equal(crypto.createHash('sha256').update(JSON.stringify(translated)).digest('hex'), item.translationHash);
    assert.equal(Object.keys(post.annotations).length, item.notes);
    assert.equal(post.spotify.track.id, item.spotify);
    assert.equal(post.spotify.album.name, 'PRESS PLAY');
    assert.equal(post.spotify.album.releaseDate, '2026-10-23');
    assert.ok(post.youtubeUrl.endsWith(item.youtube));
    assert.ok(post.genres.length && post.moods.length);
    const keys = Object.keys({ ...annotationsFor(post.slug), ...post.annotations });
    const reachable = new Set(translated.flat().map(line => keys.find(key => line.toLocaleLowerCase().includes(key.toLocaleLowerCase()))));
    for (const key of Object.keys(post.annotations)) assert.ok(reachable.has(key), `Unreachable note: ${key}`);
    const html = fs.readFileSync(new URL(`../dist/${item.slug}/index.html`, import.meta.url), 'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
    assert.ok(html.includes(`href="https://open.spotify.com/track/${item.spotify}"`));
    assert.ok(html.includes(`href="${post.youtubeUrl}"`));
    assert.equal((html.match(/class="seo-translation-note"/g) || []).length, item.notes);
    assert.ok(html.includes('Melike Erke'));
    const sitemap = fs.readFileSync(new URL('../dist/sitemap-songs.xml', import.meta.url), 'utf8');
    assert.ok(sitemap.includes(`/${item.slug}/</loc>`));
  });
}
