import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { songInsights } from '../src/data/songInsights.js';
import { songEditorialDescriptions, songLyricsTitleSlugs } from '../src/data/songEditorialSeo.js';
import { translationMetaTitle, translationMetaDescription, normalizeSeoTitle, isLegacyLyricDescription, catalogTranslationDescription, usesCatalogTitle, catalogTranslationTitle } from '../src/lib/meta.js';
import { publicationDate } from '../src/lib/songPublication.js';
import { staticSongInsight } from '../scripts/lib/prerenderContent.js';

const posts = JSON.parse(await readFile(new URL('../src/data/posts.json', import.meta.url), 'utf8'));
const priorities = JSON.parse(await readFile(new URL('../reports/site-audit/2026-10-21/content-priorities.json', import.meta.url), 'utf8'));
const escapeHtml = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

test('50 evidence-selected pages receive complete editorial metadata', () => {
  assert.equal(priorities.rows.length, 50);
  assert.equal(new Set(priorities.rows.map(row => row[0])).size, 50);
  for (const [slug] of priorities.rows) {
    const post = posts.find(post => post.slug === slug);
    assert.ok(post, slug);
    assert.ok(songEditorialDescriptions[slug], slug);
    const title = translationMetaTitle(post);
    assert.ok(title.startsWith(`${post.artist} – `) || ((usesCatalogTitle(post) || songLyricsTitleSlugs.has(slug)) && title.startsWith(`${post.song} Sözleri`)), slug);
    const longCredit = slug === 'the-weeknd-jennie-lily-rose-depp-one-of-the-girls-turkce-ceviri';
    assert.ok(title.includes(longCredit ? 'Çeviri' : 'Türkçe Çeviri'), slug);
    if (usesCatalogTitle(post)) assert.equal(title, catalogTranslationTitle(post));
    else assert.ok(title.length <= (songLyricsTitleSlugs.has(slug) ? 85 : 65), `${slug}: ${title.length}`);
    assert.equal(normalizeSeoTitle(title), title);
    const description = translationMetaDescription(post);
    assert.ok(description.length >= 140 && description.length <= 155, `${slug}: ${description.length}`);
    assert.ok(!description.includes('…'), slug);
    assert.ok(publicationDate(post) >= '2026-10-21T00:00:00.000Z');
  }
});

test('all legacy Turkish titles use catalog spelling and the requested ordering in built HTML', async () => {
  const legacy = posts.filter(usesCatalogTitle);
  assert.ok(legacy.length >= 271);
  for (const post of legacy) {
    const full = `${post.artist} – ${post.song} Türkçe Çeviri, Sözleri ve Anlamı`;
    const expected = full.length <= 60 ? full : `${post.song} Sözleri ve Türkçe Çeviri – ${post.artist}`;
    assert.equal(translationMetaTitle(post), expected);
    assert.equal(normalizeSeoTitle(expected), expected);
    const html = await readFile(new URL(`../dist/${post.slug}/index.html`, import.meta.url), 'utf8');
    assert.ok(html.includes(`<title>${escapeHtml(expected)}</title>`), post.slug);
  }
  assert.equal(translationMetaTitle(posts.find(p => p.slug === 'linkin-park-numb-turkce-ceviri')), 'Linkin Park – Numb Türkçe Çeviri, Sözleri ve Anlamı');
  assert.equal(translationMetaTitle(posts.find(p => p.slug === 'bts-cypher-pt1-turkce-ceviri')), 'BTS – Cypher Pt.1 Türkçe Çeviri, Sözleri ve Anlamı');
  assert.equal(usesCatalogTitle({ artist: 'Test', song: 'Test', languages: { original: 'tr', translation: 'en' } }), false);
});

test('eight follow-up pages retain full credits, Sözleri and handwritten descriptions', () => {
  for (const slug of songLyricsTitleSlugs) {
    const post = posts.find(post => post.slug === slug);
    const title = translationMetaTitle(post);
    if (title.length > 60) {
      assert.equal(title, `${post.song} Sözleri ve Türkçe Çeviri – ${post.artist}`);
    } else {
      assert.ok(title.startsWith(`${post.artist} – ${post.song} `));
      assert.ok(title.includes('Türkçe Çeviri, Sözleri'));
    }
    assert.equal(normalizeSeoTitle(title), title);
    assert.ok(title.length <= 85);
    if (title.length > 60) assert.ok(!title.includes('ve Anlamı'));
    assert.equal(translationMetaDescription(post), songEditorialDescriptions[slug]);
    assert.ok(songEditorialDescriptions[slug].length <= 152);
  }
});

test('catalog descriptions use release metadata, not article dates or imaginary notes', () => {
  const post = { artist: 'Sanatçı', song: 'Şarkı', date: '2026-10-21', spotify: { albumName: 'Albüm Adı', releaseDate: '2020-06-01', albumType: 'Album' } };
  const description = catalogTranslationDescription(post);
  assert.ok(description.includes('Albüm: Albüm Adı (2020).'));
  assert.ok(!description.includes('2026'));
  assert.ok(!description.includes('notlarını'));
  assert.ok(catalogTranslationDescription({ ...post, annotations: { term: 'Açıklama' } }).includes('notlarını'));
  assert.ok(catalogTranslationDescription({ ...post, spotify: { albumName: 'Tekli Adı', albumType: 'Single' } }).includes('Tekli: Tekli Adı.'));
  assert.ok(!catalogTranslationDescription({ ...post, spotify: {} }).includes('2026'));
  for (const item of posts) assert.ok(catalogTranslationDescription(item).length <= 152, item.slug);
});

test('legacy lyric-excerpt descriptions are never emitted', () => {
  assert.ok(isLegacyLyricDescription('Sanatçı Türkçe Çeviri | sözler'));
  for (const post of posts) assert.ok(!isLegacyLyricDescription(translationMetaDescription(post)), post.slug);
  const sample = { artist: 'Örnek', song: 'Test', slug: 'test', seo: { description: 'Örnek Test Türkçe Çeviri | ' + 'söz '.repeat(40) } };
  assert.ok(!translationMetaDescription(sample).includes('söz söz'));
});

test('seven insight sections have three FAQs, sources and identical initial HTML content', async () => {
  assert.equal(Object.keys(songInsights).length, 7);
  for (const [slug, insight] of Object.entries(songInsights)) {
    assert.equal(insight.faq.length, 3, slug);
    assert.ok(insight.summary.length > 150);
    assert.ok(insight.sources.length);
    for (const source of insight.sources) assert.equal(new URL(source.url).protocol, 'https:');
    const html = await readFile(new URL(`../dist/${slug}/index.html`, import.meta.url), 'utf8');
    assert.ok(html.includes(staticSongInsight(slug)), slug);
    for (const faq of insight.faq) {
      assert.ok(html.includes(escapeHtml(faq.question)), slug);
      assert.ok(html.includes(escapeHtml(faq.answer)), slug);
    }
    assert.ok(html.indexOf('Şarkı ne anlatıyor?') > html.lastIndexOf('class="seo-lyric-label"'));
  }
  assert.equal(staticSongInsight('no-editorial-content'), '');
});

test('all edited title and description values survive prerendering without truncation', async () => {
  for (const slug of Object.keys(songEditorialDescriptions)) {
    const post = posts.find(post => post.slug === slug);
    const html = await readFile(new URL(`../dist/${slug}/index.html`, import.meta.url), 'utf8');
    assert.ok(html.includes(`<title>${escapeHtml(translationMetaTitle(post))}</title>`), slug);
    assert.ok(html.includes(`name="description" content="${escapeHtml(translationMetaDescription(post))}"`), slug);
  }
});
