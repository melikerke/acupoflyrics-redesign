import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { build } from 'esbuild';
import { buildPerformerCatalog, creditsFor, performerNamesFor, artistAliases } from '../src/lib/artistCatalog.js';
import { biographyFor } from '../src/lib/artistBiography.js';
import evidence from '../src/data/searchPriorities.json' with { type: 'json' };
import { relatedSongs } from '../src/lib/relatedSongs.js';
import { popularSongSlugs, moodPins, relatedSongPins } from '../src/data/internalLinkPlan.js';
import { moodCollections, postsForMoodCollection, popularMoodPosts } from '../src/lib/moodCollections.js';
import { editorialFeatures, translationQueue } from '../src/data/editorialFeatures.js';
import { articleAliases } from '../src/data/articleAliases.js';
import middleware from '../middleware.js';
const posts = JSON.parse(fs.readFileSync('src/data/posts.json'));
const artists = buildPerformerCatalog(JSON.parse(fs.readFileSync('src/data/artists.json')), posts);
const html = path => fs.readFileSync(`dist/${path ? `${path}/` : ''}index.html`, 'utf8');
const decode = s => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const ld = h => [...h.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map(m => JSON.parse(m[1]));

test('20 GSC-selected artists have 80–120 word bios, real song links and entity schemas in initial HTML', () => {
  assert.equal(evidence.topArtists.length, 20);
  for (const selected of evidence.topArtists) {
    const artist = artists.find(a => a.slug === selected.slug);
    artist.posts = posts.filter(p => creditsFor(p, artists).some(a => a.slug === artist.slug));
    const bio = biographyFor(artist);
    assert.ok(bio, selected.slug);
    const wordCount = `${bio.text} ${bio.catalogText} ${bio.songs.map(p => `${p.artist} — ${p.song} Türkçe çeviri`).join(', ')}`.split(/\s+/).length;
    assert.ok(wordCount >= 80 && wordCount <= 120, `${artist.name}: ${wordCount}`);
    assert.equal(bio.songs.length, Math.min(artist.count, 3));
    const page = html(`artist/${artist.slug}`);
    assert.ok(page.indexOf('artist-biography') < page.indexOf('<h2>Şarkılar</h2>'));
    assert.ok(decode(page).includes(bio.text));
    assert.ok(decode(page).includes(`<title>${artist.name} Şarkı Sözleri ve Türkçe Çevirileri | acupoflyrics</title>`));
    for (const p of bio.songs) assert.ok(page.includes(`href="/${p.slug}/"`));
    const entity = ld(page).find(e => e['@type'] === bio.type && e.name === artist.name);
    assert.ok(entity, artist.name);
    assert.deepEqual(entity.genre, bio.genre);
    assert.match(entity.sameAs[0], /^https:\/\/open.spotify.com\/artist\/[a-zA-Z0-9]+$/);
  }
});

test('collaborations have separate catalogs; aliases return 301 and never enter artist sitemap', () => {
  const sitemap = fs.readFileSync('dist/sitemap-artists.xml', 'utf8');
  for (const [alias, target] of Object.entries(artistAliases)) {
    const res = middleware(new Request(`https://www.acupoflyrics.com/artist/${alias}/?utm_source=test`));
    assert.equal(res.status, 301);
    assert.equal(new URL(res.headers.get('location')).pathname, `/artist/${target}`);
    assert.equal(new URL(res.headers.get('location')).searchParams.get('utm_source'), 'test');
    assert.ok(!sitemap.includes(`/artist/${alias}</loc>`));
    assert.ok(artists.some(a => a.slug === target), target);
  }
  assert.ok(artists.every(a => a.slug && !/\bfeat\b|paw-patrol|arcane|f1-the-album|jjk-with-yuki-chiba|ade-la/.test(a.slug)));
  for (const p of posts.filter(p => /feat\.|Dolly Parton &|Post Malone &|DAYOUNG &/.test(p.artist))) {
    const credits = creditsFor(p, artists);
    assert.ok(credits.length >= 2, p.artist);
    for (const c of credits) assert.ok(html(`artist/${c.slug}`).includes(`href="/${p.slug}/"`));
  }
  assert.deepEqual(performerNamesFor({artist: 'Future Artist feat. Guest Artist'}), ['Future Artist', 'Guest Artist']);
  assert.deepEqual(performerNamesFor({artist: 'Michel Fugain & Le Big Bazar'}), ['Michel Fugain & Le Big Bazar']);
});

test('home, moods and contextual recommendations expose the editorial links', async () => {
  const home = html('');
  assert.ok(home.includes('Çok okunanlar'));
  for (const slug of popularSongSlugs) assert.ok(home.includes(`href="/${slug}/"`));
  // Runtime mood data retains the key, so hydration cannot undo the SSR pin.
  const bundled = await build({entryPoints:['src/lib/content.js'],bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent'});
  const content = await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString('base64')}`);
  for (const [key, pins] of Object.entries(moodPins)) {
    const mood = moodCollections.find(m => m.key === key);
    const expected = popularMoodPosts(postsForMoodCollection(mood, posts), mood);
    const runtime = content.getMood(mood.slug);
    assert.equal(runtime.key, key);
    assert.deepEqual(popularMoodPosts(runtime.items, runtime).map(p => p.slug), expected.map(p => p.slug));
    for (const slug of pins) assert.ok(expected.slice(0,5).some(p => p.slug === slug));
    const links = [...html(`mood/${mood.slug}`).matchAll(/href="(\/[^"/]+\/)"/g)].map(m => m[1]);
    assert.ok(links.slice(0,5).includes(`/${pins[0]}/`));
  }
  for (const [source,target] of Object.entries(relatedSongPins)) {
    const p = posts.find(p => p.slug === source);
    assert.ok(p, source);
    assert.equal(relatedSongs(p, posts)[0]?.slug, target);
    const section = html(source).match(/<section class="seo-related"><h2>Benzer şarkılar<\/h2>([\s\S]*?)<\/section>/)?.[1];
    assert.ok(section?.includes(`href="/${target}/"`));
    assert.ok(section.includes('Türkçe çeviri'));
  }
});

test('new editorial features preserve sources, translation links and Melike Erke Article authorship', () => {
  for (const article of editorialFeatures) {
    const page = html(`pop-gunlugu/${article.slug}`);
    const schema = ld(page).find(e => e['@type'] === 'Article');
    assert.equal(schema.author.name, 'Melike Erke');
    assert.equal(schema.author['@type'], 'Person');
    assert.equal(schema.datePublished, article.date);
    assert.equal(schema.dateModified, article.updatedAt);
    for (const slug of article.relatedTranslations) {
      assert.ok(posts.some(p => p.slug === slug), slug);
      assert.ok(page.includes(`href="/${slug}/"`));
    }
    assert.ok(article.sources.every(s => s.url.startsWith('https://')));
  }
  for (const [alias,target] of Object.entries(articleAliases)) {
    const res = middleware(new Request(`https://www.acupoflyrics.com/pop-gunlugu/${alias}`));
    assert.equal(res.status,301);
    assert.ok(res.headers.get('location').endsWith(target));
    assert.ok(html(`pop-gunlugu/${target}`).includes('10 Eylül–26 Ekim'));
  }
  assert.deepEqual(translationQueue.map(p => p.artist), ['Clean Bandit x TÄRA', 'RIIZE']);
});
