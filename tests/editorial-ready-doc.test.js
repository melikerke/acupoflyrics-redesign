import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { editorialFeatures } from '../src/data/editorialFeatures.js';
import { popGundemiArticles } from '../src/data/popGundemi.js';
import { articleSchema } from '../src/lib/articleSchema.js';

const slugs = ['27-ekim-2-kasim-2026-haftanin-muzik-gundemi', 'kasim-2026-kpop-comeback-takvimi', 'choosin-texas-neden-rekor-kirdi'];
const articles = slugs.map(slug => editorialFeatures.find(a => a.slug === slug));

test('only the three ready document articles are integrated, without placeholders or draft pages', () => {
  for (const [i, article] of articles.entries()) {
    assert.ok(article, slugs[i]);
    assert.equal(popGundemiArticles.filter(a => a.slug === slugs[i]).length, 1);
    assert.doesNotMatch(JSON.stringify(article), /İÇ LİNK|DOLDUR|GÜNCELLE|Editör notu|yayına girmez|\[ADAYLAR\]/);
    const schema = articleSchema(article, 'https://www.acupoflyrics.com');
    assert.equal(schema.author.name, 'Melike Erke');
    assert.equal(schema.datePublished, '2026-11-03');
    const page = fs.readFileSync(`dist/pop-gunlugu/${article.slug}/index.html`, 'utf8');
    assert.ok(page.includes(article.dek.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll("'", '&#39;')));
    for (const link of article.inlineLinks.filter(l => l.href.startsWith('/'))) {
      assert.ok(fs.existsSync(`dist${link.href.replace(/\/$/, '')}/index.html`), link.href);
    }
    assert.ok(fs.readFileSync('dist/sitemap-news.xml', 'utf8').includes(`/pop-gunlugu/${article.slug}`));
  }
  assert.ok(!popGundemiArticles.some(a => ['grammy-2027-adaylari', 'mama-2026-kazananlari'].includes(a.slug)));
});

test('the supplied calendar and record tables remain complete and are available in first HTML', () => {
  for (const [article, count] of [[articles[1], 24], [articles[2], 7]]) {
    const table = article.sections.find(s => s.table).table;
    assert.equal(table.rows.length, count);
    assert.ok(table.rows.every(row => row.length === table.columns.length));
    const page = fs.readFileSync(`dist/pop-gunlugu/${article.slug}/index.html`, 'utf8');
    const markup = page.match(/<table class="pop-story-table">[\s\S]*?<\/table>/)?.[0];
    assert.ok(markup);
    assert.equal((markup.match(/<tr>/g) || []).length, count + 1);
    assert.ok(markup.includes('scope="col"'));
    assert.ok(page.includes('role="region"'));
    assert.ok(page.includes('tabindex="0"'));
  }
  const calendar = articles[1].sections.find(s => s.table).table;
  assert.ok(calendar.rows.some(row => row[3] === 'NAYEON — BABY ANGEL' && row[0] === '20 Kasım' && row[4] === '08.00'));
  assert.ok(calendar.rows.some(row => row[3] === 'ENHYPEN — I Want You'));
  assert.ok(articles[1].sections.some(s => s.afterTable?.some(t => t.includes('23 Kasım'))));
});

test('document narrative, interpretation labels and cross-links are retained', () => {
  assert.ok(articles[0].sections.some(s => s.body.some(t => t.includes('22,9 milyon'))));
  assert.ok(articles[0].sections.some(s => s.body.some(t => t.includes('7. sıraya geriledi'))));
  assert.ok(articles[2].sections.some(s => s.body.includes('Bu bölüm bizim yorumumuz; dayandığımız verileri her maddede belirttik.')));
  assert.ok(articles[0].inlineLinks.some(l => l.href === `/pop-gunlugu/${slugs[1]}`));
  assert.ok(articles[0].inlineLinks.some(l => l.href === `/pop-gunlugu/${slugs[2]}`));
  assert.ok(articles[1].inlineLinks.some(l => l.href === `/pop-gunlugu/${slugs[0]}`));
  assert.ok(articles[2].inlineLinks.some(l => l.href === `/pop-gunlugu/${slugs[0]}`));
});
