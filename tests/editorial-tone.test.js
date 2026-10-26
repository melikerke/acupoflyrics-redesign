import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { popGundemiArticles } from '../src/data/popGundemi.js';
import { editorialFeatures } from '../src/data/editorialFeatures.js';
import { articleSchema } from '../src/lib/articleSchema.js';
import { articleMetaTitle, normalizeSeoTitle } from '../src/lib/meta.js';
import { articleSongSegments, articleLinkHref } from '../src/lib/articleSongLinks.js';
const posts = JSON.parse(fs.readFileSync('src/data/posts.json', 'utf8'));

test('all editorial titles preserve the brand within the title budget', () => {
  for (const article of popGundemiArticles) {
    const title = articleMetaTitle(article);
    assert.ok(title.endsWith(' | acupoflyrics'), article.slug);
    assert.ok(title.length <= 65, `${article.slug}: ${title}`);
    assert.equal(normalizeSeoTitle(title), title);
    const page = decode(fs.readFileSync(`dist/pop-gunlugu/${article.slug}/index.html`, 'utf8'));
    assert.ok(page.includes(`<title>${title}</title>`), article.slug);
  }
});

test('related song cards preserve the original artist name casing', () => {
  const css = fs.readFileSync('src/popGundemiArticle.css', 'utf8');
  const rule = css.match(/\.pop-story-related-card small\s*\{([^}]+)\}/);
  assert.ok(rule);
  assert.match(rule[1], /text-transform:\s*none/);
});

test('July archive has a dated update before the old summary and both articles cross-link', () => {
  const old = popGundemiArticles.find(a => a.slug === 'twice-jyp-sozlesme-yenileme-iddialari');
  const news = editorialFeatures[0];
  assert.equal(old.date, '2026-07-14');
  assert.equal(old.updatedAt, '2026-10-26');
  // Preserve the historical body, especially the other members' unconfirmed reports.
  assert.equal(createHash('sha256').update(JSON.stringify(old.sections)).digest('hex'), '84ff91286372707d721be3406302ae7eab03d35627a48948bd77459f6ea18a41');
  const page = decode(fs.readFileSync(`dist/pop-gunlugu/${old.slug}/index.html`, 'utf8'));
  const visible = page.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '');
  assert.ok(visible.includes(old.updateNotice.text));
  assert.ok(visible.includes(old.updateNotice.archiveNote));
  assert.ok(visible.indexOf(old.updateNotice.label) < visible.indexOf(old.summaryTitle));
  assert.ok(visible.includes(`href="/pop-gunlugu/${news.slug}"`));
  const newPage = fs.readFileSync(`dist/pop-gunlugu/${news.slug}/index.html`, 'utf8');
  assert.ok(newPage.includes(`href="/pop-gunlugu/${old.slug}"`));
});
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
    assert.ok(page.includes(`<title>${articleMetaTitle(article)}</title>`), article.slug);
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
