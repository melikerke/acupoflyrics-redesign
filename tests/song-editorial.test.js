import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { songInsights } from '../src/data/songInsights.js';
import { submittedSongInsights } from '../src/data/submittedSongInsights.js';
import { submittedSongInsightsOct27 } from '../src/data/submittedSongInsightsOct27.js';
import { meaningHeadings } from '../src/lib/songInsightPresentation.js';
import { songInsightUpdates } from '../src/data/songInsightUpdates.js';
import { songEditorialDescriptions, songLyricsTitleSlugs } from '../src/data/songEditorialSeo.js';
import { translationMetaTitle, translationMetaDescription, normalizeSeoTitle, isLegacyLyricDescription, catalogTranslationDescription, usesCatalogTitle, catalogTranslationTitle, catalogTitleIdentity } from '../src/lib/meta.js';
import { publicationDate } from '../src/lib/songPublication.js';
import { staticSongInsight } from '../scripts/lib/prerenderContent.js';

const posts = JSON.parse(await readFile(new URL('../src/data/posts.json', import.meta.url), 'utf8'));
const priorities = JSON.parse(await readFile(new URL('../reports/site-audit/2026-10-21/content-priorities.json', import.meta.url), 'utf8'));
const escapeHtml = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

test('ten document imports have synchronized dates and no unpublished editor instructions', () => {
  assert.equal(Object.keys(submittedSongInsights).length, 10);
  assert.deepEqual(Object.keys(songInsightUpdates).sort(), Object.keys({ ...submittedSongInsights, ...submittedSongInsightsOct27 }).sort());
  for (const [slug, insight] of Object.entries(submittedSongInsights)) {
    const post = posts.find(item => item.slug === slug);
    assert.ok(post, slug);
    assert.equal(songInsightUpdates[slug], insight.updatedAt);
    assert.ok(publicationDate(post) >= `${insight.updatedAt}T00:00:00.000Z`);
    assert.ok(!/Ekip:|teyit edin|Search Console|Yapıştırılan markdown/.test(JSON.stringify(insight)), slug);
  }
});

test('50 evidence-selected pages receive complete editorial metadata', () => {
  assert.equal(priorities.rows.length, 50);
  assert.equal(new Set(priorities.rows.map(row => row[0])).size, 50);
  for (const [slug] of priorities.rows) {
    const post = posts.find(post => post.slug === slug);
    assert.ok(post, slug);
    assert.ok(songEditorialDescriptions[slug], slug);
    const title = translationMetaTitle(post);
    assert.ok(title.includes(catalogTitleIdentity(post).song), slug);
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

test('ALL Turkish titles use the template in built HTML, regardless of old description format', async () => {
  const legacy = posts.filter(usesCatalogTitle);
  assert.equal(legacy.length, posts.length - 3, 'All pages except the three English translations must be covered');
  const unique = new Set();
  for (const post of legacy) {
    const expected = catalogTranslationTitle(post);
    assert.equal(translationMetaTitle(post), expected);
    assert.ok(expected.includes('Sözleri') && expected.includes('Türkçe Çeviri'));
    assert.ok(!expected.includes('|'));
    assert.ok(!unique.has(expected), `Duplicate title: ${expected}`);
    unique.add(expected);
    const { song, artists } = catalogTitleIdentity(post);
    if (expected.length > 60) assert.ok(expected.startsWith(`${song} Sözleri`), post.slug);
    if (artists.length > 2) {
      assert.ok(expected.includes('vd.'), post.slug);
      assert.ok(!expected.includes(artists.slice(0, 3).join(', ')), post.slug);
    }
    assert.equal(normalizeSeoTitle(expected), expected);
    const html = await readFile(new URL(`../dist/${post.slug}/index.html`, import.meta.url), 'utf8');
    assert.ok(html.includes(`<title>${escapeHtml(expected)}</title>`), post.slug);
  }
  assert.equal(translationMetaTitle(posts.find(p => p.slug === 'linkin-park-numb-turkce-ceviri')), 'Linkin Park – Numb Türkçe Çeviri, Sözleri ve Anlamı');
  assert.equal(translationMetaTitle(posts.find(p => p.slug === 'bts-cypher-pt1-turkce-ceviri')), 'BTS – Cypher Pt.1 Türkçe Çeviri, Sözleri ve Anlamı');
  assert.equal(usesCatalogTitle({ artist: 'Test', song: 'Test', languages: { original: 'tr', translation: 'en' } }), false);
});

test('eight follow-up pages retain Sözleri and handwritten descriptions', () => {
  for (const slug of songLyricsTitleSlugs) {
    const post = posts.find(post => post.slug === slug);
    const title = translationMetaTitle(post);
    assert.equal(title, catalogTranslationTitle(post));
    assert.equal(normalizeSeoTitle(title), title);
    assert.ok(title.length <= 85);
    if (title.length > 60) assert.ok(!title.includes('ve Anlamı'));
    assert.equal(translationMetaDescription(post), songEditorialDescriptions[slug]);
    assert.ok(songEditorialDescriptions[slug].length <= 152);
  }
});

test('title cleanup preserves version identity and the three English pages', () => {
  const titleFor = slug => translationMetaTitle(posts.find(post => post.slug === slug));
  assert.ok(titleFor('tyla-sean-paul-push-2-start-turkce-ceviri').includes('Sean Paul'));
  assert.ok(titleFor('tyla-sean-paul-push-2-start-turkce-ceviri').includes('Remix'));
  assert.notEqual(titleFor('tyla-push-2-start-turkce-ceviri'), titleFor('tyla-sean-paul-push-2-start-turkce-ceviri'));
  assert.ok(titleFor('tate-mcrae-its-ok-im-ok-turkce-ceviri').includes('Tate McRae'));
  for (const slug of ['rose-messy-turkce-ceviri', 'taylor-swift-right-where-you-left-me-turkce-ceviri', 'katseye-ft-yeonjun-touch-turkce-ceviri']) {
    assert.ok(!/From F1|bonus track|ft\. YEONJUN/i.test(titleFor(slug)));
  }
  assert.equal(titleFor('crush-benim-olsana-english-translation'), 'CRUSH Benim Olsana English Translation');
  assert.equal(titleFor('motive-yin-yang-english-translation'), 'Motive – YIN YANG English Translation');
  assert.equal(titleFor('radikal-korkmam-ben-english-translation'), 'Radikal KORKMAM BEN English Translation');
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

test('all insight sections have three FAQs, sources and identical initial HTML content', async () => {
  assert.equal(Object.keys(songInsights).length, 38);
  for (const [slug, insight] of Object.entries(songInsights)) {
    assert.equal(insight.faq.length, 3, slug);
    assert.ok(insight.summary.length > 150);
    assert.ok(insight.sources.length);
    for (const source of insight.sources) assert.equal(new URL(source.url).protocol, 'https:');
    const html = await readFile(new URL(`../dist/${slug}/index.html`, import.meta.url), 'utf8');
    assert.ok(html.includes(staticSongInsight(slug)), slug);
    for (const faq of insight.faq) {
      assert.ok(html.includes(escapeHtml(faq === insight.faq[0] && meaningHeadings[slug] ? meaningHeadings[slug] : faq.question)), slug);
      assert.ok(html.includes(escapeHtml(faq.answer)), slug);
    }
    assert.ok(html.indexOf('class="song-insight"') > html.lastIndexOf('class="seo-lyric-label"'));
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
