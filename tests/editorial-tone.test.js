import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { editorialFeatures } from '../src/data/editorialFeatures.js';
import { articleSchema } from '../src/lib/articleSchema.js';
import { normalizeSeoTitle } from '../src/lib/meta.js';
import { articleSongSegments, articleLinkHref } from '../src/lib/articleSongLinks.js';
const posts = JSON.parse(fs.readFileSync('src/data/posts.json', 'utf8'));
const decode = text => text.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');

test('new-tone articles retain URLs, summaries, copy, real inline links and metadata in first HTML', () => {
  assert.deepEqual(editorialFeatures.map(a => a.slug), [
    'twice-jihyo-jyp-ayrildi-emithaus',
    '19-26-ekim-2026-haftanin-muzik-gundemi',
    'lisa-press-play-ep-sarkilar-ne-anlatiyor',
  ]);
  for (const article of editorialFeatures) {
    const raw = fs.readFileSync(`dist/pop-gunlugu/${article.slug}/index.html`, 'utf8');
    const page = decode(raw);
    const visible = page.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '').replace(/<[^>]*>/g, '');
    assert.ok(page.includes(`<title>${normalizeSeoTitle(article.seoTitle)}</title>`), article.slug);
    assert.ok(visible.includes(article.dek));
    for (const summary of article.summary) assert.ok(visible.includes(summary), summary);
    assert.doesNotMatch(visible, /Ekip notu:|Semrush|Schema:|14 Temmuz 2026 itibarıyla/);
    for (const section of article.sections) {
      assert.ok(visible.includes(section.heading));
      for (const line of [...section.body, ...(section.list || []), ...(section.afterList || [])]) {
        const segments = articleSongSegments(line, article, posts);
        assert.ok(visible.includes(segments.map(p => p.text).join('')), line);
        for (const part of segments) {
          const href = articleLinkHref(part);
          if (href) assert.ok(page.includes(`href="${href}"`));
        }
      }
      for (const { question, answer } of section.questions || []) {
        assert.ok(visible.includes(question));
        assert.ok(visible.includes(answer));
      }
    }
    for (const link of article.inlineLinks.filter(l => l.href.startsWith('/'))) {
      assert.ok(fs.existsSync(`dist${link.href.replace(/\/$/, '')}/index.html`), link.href);
    }
    for (const source of article.sources) assert.ok(page.includes(source.url));
  }
});

test('Jihyo NewsArticle and FAQ schema agree with the visible questions', () => {
  const article = editorialFeatures[0];
  const schema = articleSchema(article, 'https://www.acupoflyrics.com');
  const [news, faq] = schema['@graph'];
  assert.equal(news['@type'], 'NewsArticle');
  assert.equal(news.author.name, 'Melike Erke');
  assert.equal(news.about[0]['@type'], 'Person');
  assert.equal(news.datePublished, '2026-10-26');
  assert.equal(faq['@type'], 'FAQPage');
  assert.equal(faq.mainEntity.length, 3);
  assert.deepEqual(faq.mainEntity.map(q => ({question:q.name, answer:q.acceptedAnswer.text})), article.sections.flatMap(s => s.questions || []));
});

test('explicit editorial links strip bracket placeholders and reject unsafe URLs', () => {
  const article = editorialFeatures.find(a => a.artistName === 'LISA');
  assert.deepEqual(articleSongSegments('[Sweat Türkçe çevirisi]', article, posts), [{text:'Sweat Türkçe çevirisi', href:'/lisa-sweat-turkce-ceviri/'}]);
  assert.deepEqual(articleSongSegments('unsafe', {inlineLinks:[{label:'unsafe',href:'javascript:alert(1)'}]}, []), [{text:'unsafe'}]);
  const component = fs.readFileSync('src/pages/PopGundemiArticlePage.jsx','utf8');
  assert.doesNotMatch(component, /14 Temmuz 2026 itibarıyla|JYP, görüşmelerin sürdüğünü söylüyor/);
  assert.match(component, /livePanel\?\.items\?\.length > 0/);
});
