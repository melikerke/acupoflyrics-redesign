import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { popGundemiArticles } from '../src/data/popGundemi.js';
import { journalFor, chartBadge, journalDate, releaseCalendar, spotifyTrackId } from '../src/lib/journal.js';
import { articleSchema } from '../src/lib/articleSchema.js';
import { articleMetaTitle } from '../src/lib/meta.js';

const article = popGundemiArticles.find(a => a.slug === '27-ekim-2-kasim-2026-haftanin-muzik-gundemi');
const journal = journalFor(article);
const posts = JSON.parse(fs.readFileSync('src/data/posts.json', 'utf8'));

test('journal keeps original article text and both old and new anchor targets', () => {
  for (const article of popGundemiArticles) {
    const view = journalFor(article);
    assert.equal(view.stories.length, article.sections?.length || 0);
    assert.equal(new Set(view.stories.map(story => story.id)).size, view.stories.length);
    view.stories.forEach((story, i) => {
      assert.deepEqual(story.body, article.sections[i].body);
      assert.deepEqual(story.table, article.sections[i].table);
      assert.equal(story.legacyId, `bolum-${i + 1}`);
    });
    const targets = new Set([...view.stories.map(s => s.id), ...(view.kpop?.length ? ['kpop'] : [])]);
    for (const item of [...(view.charts || []), ...(view.tldr || [])]) assert.ok(targets.has(item.target), item.target);
  }
});

test('story tools resolve only real translations, source indexes and safe Spotify IDs', () => {
  for (const story of journal.stories) {
    if (story.translationId) {
      const post = posts.find(p => p.slug === story.translationId);
      assert.ok(post);
      assert.ok(fs.existsSync(`public/data/posts/${post.slug}.json`));
      assert.ok(post.blocks.filter(b => !b.original).flatMap(b => b.lines).length >= 2);
    }
    for (const index of story.sourceIndexes) assert.ok(article.sources[index]?.url.startsWith('https://'));
  }
  assert.equal(journal.stories.find(s => s.id === 'lies').translationId, undefined);
  assert.equal(spotifyTrackId({spotify: {trackUrl: 'https://evil.example/track/0SqDNsDiJyvrbXGsIvt0hN'}}), null);
  assert.equal(spotifyTrackId(posts.find(p => p.slug === 'jisoo-addicted-turkce-ceviri')), '0SqDNsDiJyvrbXGsIvt0hN');
  assert.equal(spotifyTrackId(posts.find(p => p.slug === 'tate-mcrae-housewife-turkce-ceviri')), null);
});

test('chart movements derive from data and distinguish chart dates from announcement dates', () => {
  assert.deepEqual(journal.charts.map(chart => chart.rank), [1, 2, 4, 7]);
  assert.equal(chartBadge(journal.charts[0]), '26. hafta zirvede');
  assert.equal(chartBadge(journal.charts.find(chart => chart.target === 'olivia')), '63 → 3 → 7');
  assert.equal(chartBadge(journal.charts.find(chart => chart.target === 'lies')), 'Yeni giriş');
  assert.equal(journal.charts[0].announcedAt, '2026-11-02');
  assert.equal(journal.charts.find(chart => chart.target === 'lies').chartDate, '2026-10-31');
});

test('weekly corrections preserve the official song URL and explicit source attribution', () => {
  const illit = journal.stories.find(story => story.id === 'illit');
  assert.equal(illit.heading, 'ILLIT — You’re Under Arrest');
  assert.equal(illit.translationId, 'illit-youre-under-arrest-turkce-ceviri');
  assert.match(illit.body.join(' '), /Dört şarkılık/);
  assert.doesNotMatch(JSON.stringify(article), /I’ll Arrest You/);
  assert.ok(illit.sourceIndexes.some(index => article.sources[index].url === 'https://weverse.io/illit/media/3-243100410'));
  assert.match(article.sections[0].body.join(' '), /Variety’nin Martin Cid’de aktarılan verilerine göre/);
  assert.match(journal.tldr[4].text, /kostümlerine yönelik eleştiriler/);
  assert.equal(articleMetaTitle(article), article.seoTitle);
  assert.ok(articleMetaTitle(article).length <= 65);
  assert.ok(journal.calendarHref);
  assert.doesNotMatch(JSON.stringify(article.sections), /Kasım 2026 K-pop comeback takvimi/);
});

test('KST release times convert to Turkey and downloadable ICS uses valid UTC instants', () => {
  assert.match(journalDate(journal.kpop[0].releaseAtKST, true), /30 Ekim 02:00/);
  const calendar = releaseCalendar(journal.kpop[0], journal.sourcesCheckedAt);
  assert.ok(calendar.includes('DTSTART:20261029T230000Z\r\n'));
  assert.ok(calendar.includes('DTEND:20261030T000000Z\r\n'));
  assert.ok(calendar.includes('SUMMARY:JISOO — ADDICTED'));
  assert.ok(calendar.endsWith('END:VCALENDAR\r\n'));
  assert.ok(calendar.split('\r\n').every(line => Buffer.byteLength(line) <= 75));
  assert.equal(releaseCalendar({ releaseAtKST: 'not-a-date' }, journal.sourcesCheckedAt), null);
});

test('journal content and song entities are readable in first HTML without Spotify frames', () => {
  const html = fs.readFileSync(`dist/pop-gunlugu/${article.slug}/index.html`, 'utf8');
  assert.match(html, /30 saniyede bu hafta/);
  assert.match(html, /Liste nabzı/);
  for (const story of journal.stories) {
    assert.ok(html.includes(`<article id="${story.id}">`));
    assert.ok(html.includes(`id="${story.legacyId}"`));
  }
  assert.ok(html.includes('id="kpop"'));
  assert.match(html, /<p class="journal-byline"><span>Melike Erke<\/span>/);
  assert.match(html, /Liste tarihi: 31 Ekim/);
  const renderedSchemas = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map(match => JSON.parse(match[1]));
  const nodes = renderedSchemas.flatMap(schema => schema['@graph'] || (Array.isArray(schema) ? schema : [schema]));
  assert.ok(nodes.some(schema => schema['@type'] === 'NewsArticle' && schema.author.name === 'Melike Erke'));
  assert.doesNotMatch(html, /<iframe[^>]+spotify/);
  const schema = articleSchema(article, 'https://www.acupoflyrics.com');
  assert.equal(schema['@type'], 'NewsArticle');
  assert.equal(schema.author.name, 'Melike Erke');
  assert.equal(schema.mentions.length, 7);
  assert.ok(schema.mentions.every(item => item['@type'] === 'MusicRecording' && item.byArtist.length));
});
