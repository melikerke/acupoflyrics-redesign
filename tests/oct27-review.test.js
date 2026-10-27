import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { relatedSongs, recommendationProfile } from '../src/lib/relatedSongs.js';
import { curatedRelatedSongs } from '../src/data/songRecommendationProfiles.js';
import { submittedSongInsightsOct27 } from '../src/data/submittedSongInsightsOct27.js';
import { submittedSongInsights } from '../src/data/submittedSongInsights.js';
import { songInsightUpdates } from '../src/data/songInsightUpdates.js';
import { withSongFaq } from '../src/lib/songFaqSchema.js';
import { editorialFeatures } from '../src/data/editorialFeatures.js';
import { translationMetaTitle, normalizeSeoTitle } from '../src/lib/meta.js';

const read = path => fs.readFileSync(path, 'utf8');
const posts = JSON.parse(read('src/data/posts.json'));
const compact = JSON.parse(read('src/data/postIndex.json'));
const get = (slug, list = posts) => list.find(p => p.slug === slug);
const html = slug => read(`dist/${slug}/index.html`);
const decode = text => text.replaceAll('&quot;', '"').replaceAll('&amp;', '&').replaceAll('&lt;', '<').replaceAll('&gt;', '>');
const visible = text => decode(text.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ''));
const mariah = 'mariah-carey-all-i-want-for-christmas-is-you-turkce-ceviri';

test('Mariah is isolated in both directions, across full and compact catalogs', () => {
  for (const list of [posts, compact]) {
    assert.equal(recommendationProfile(get(mariah, list)).season, 'christmas');
    assert.deepEqual(relatedSongs(get(mariah, list), list).map(p => p.slug), ['wham-last-christmas-turkce-ceviri', 'ariana-grande-santa-tell-me-turkce-ceviri']);
    for (const p of list.filter(p => !recommendationProfile(p).season)) {
      assert(!relatedSongs(p, list).some(item => item.slug === mariah), p.slug);
    }
  }
});

test('reviewed recommendations remain ordered and match the initial HTML', () => {
  for (const [slug, expected] of Object.entries(curatedRelatedSongs)) {
    for (const list of [posts, compact]) assert.deepEqual(relatedSongs(get(slug, list), list).map(p => p.slug), expected);
    const section = html(slug).match(/<h2>Benzer şarkılar<\/h2><ul>([\s\S]*?)<\/ul>/)[1];
    assert.deepEqual([...section.matchAll(/href="\/([^/]+)\/"/g)].map(m => m[1]), expected);
  }
});

test('nine summaries precede lyrics and 27 visible FAQs match JSON-LD exactly', () => {
  assert.equal(Object.keys(submittedSongInsightsOct27).length, 9);
  for (const [slug, insight] of Object.entries(submittedSongInsightsOct27)) {
    const raw = html(slug), page = visible(raw);
    assert.equal(insight.faq.length, 3);
    assert.equal(songInsightUpdates[slug], insight.updatedAt);
    assert(page.indexOf(insight.summary) > page.indexOf('</h1>'));
    assert(page.indexOf(insight.summary) < page.indexOf('class="seo-lyric-label"'));
    assert.equal(page.split(insight.summary).length - 1, 1);
    assert(page.indexOf('Sık sorulan sorular') > page.lastIndexOf('class="seo-lyric-label"'));
    const schemas = [...raw.matchAll(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map(m => JSON.parse(m[1]));
    const graph = schemas.find(s => s['@graph']?.some(x => x['@type'] === 'FAQPage'));
    assert(graph, slug);
    const faq = graph['@graph'].find(s => s['@type'] === 'FAQPage');
    assert.deepEqual(faq.mainEntity.map(x => ({question:x.name, answer:x.acceptedAnswer.text})), insight.faq);
    const recording = graph['@graph'].find(s => s['@type'] === 'MusicRecording');
    assert.equal(recording.subjectOf.author.name, 'Melike Erke');
    assert.deepEqual(withSongFaq(recording, slug), graph);
    for (const q of insight.faq) assert(page.includes(q.question) && page.includes(q.answer));
    assert.doesNotMatch(page, /Ekip notu:|~2\.800|sıra 5–6|Kimin hangi satırı söylediğini çeviri sayfasında işaretledik/);
  }
});

test('Hootie Frutti changes its heading without changing the existing meaning text', () => {
  const slug = 'katseye-hootie-frutti-turkce-ceviri', page = visible(html(slug));
  const insight = submittedSongInsights[slug];
  assert(page.includes('<h2 class="font-serif">Hootie Frutti ne demek?</h2>'));
  assert.equal(page.split(insight.faq[0].answer).length - 1, 1);
  assert.equal(insight.updatedAt, '2026-10-22');
});

test('Jihyo article leads with the solo translation, Thriller is featured, Mariah keeps the exact title phrase', () => {
  const article = editorialFeatures[0];
  const section = article.sections.find(s => s.list?.includes('JIHYO — Killin’ Me Good Türkçe çeviri'));
  assert.equal(section.list[0], 'JIHYO — Killin’ Me Good Türkçe çeviri');
  assert.equal(article.relatedTranslations[0], 'jihyo-killin-me-good-turkce-ceviri');
  assert(visible(html(`pop-gunlugu/${article.slug}`)).includes('href="/jihyo-killin-me-good-turkce-ceviri/"'));
  assert.match(html('linkler'), /class="links-featured"[\s\S]*?Thriller/);
  const title = translationMetaTitle(get(mariah));
  assert.equal(title, 'All I Want for Christmas Is You Sözleri ve Türkçe Çeviri – Mariah Carey');
  assert.equal(normalizeSeoTitle(title), title);
  assert(visible(html(mariah)).includes(`<title>${title}</title>`));
});
