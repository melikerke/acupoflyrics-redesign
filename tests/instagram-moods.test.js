import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { relatedSongs } from '../src/lib/relatedSongs.js';
import { moodLandingPages, moodAliases, breakupSongSlugs } from '../src/data/moodLandingPages.js';
import { moodCollectionFor, postsForMoodCollection, popularMoodPosts, moodPage, moodPagePath, moodPageTitle, MOOD_PAGE_SIZE } from '../src/lib/moodCollections.js';
import middleware from '../middleware.js';
import { moodPath } from '../src/lib/paths.js';
import { linksHubSongs, instagramCampaignUrl, instagramSongCta } from '../src/lib/linksHub.js';
const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const posts = JSON.parse(await read('src/data/posts.json'));
const index = JSON.parse(await read('src/data/postIndex.json'));
const amy = posts.find(post => post.slug === 'amy-winehouse-back-to-black-turkce-ceviri');

test('soul recommendations prefer Adele and Lana, identical in full and compact catalogs', () => {
  const result = relatedSongs(amy, posts);
  assert.ok(result.some(post => post.artist === 'Adele'));
  assert.ok(result.some(post => post.artist === 'Lana Del Rey'));
  assert.equal(result.length, 4);
  assert.ok(result.every(post => !/Travis Scott|JENNIE|Wham!/.test(post.artist)));
  assert.deepEqual(result.map(post => post.slug), relatedSongs(index.find(post => post.slug === amy.slug), index).map(post => post.slug));
});

test('Turkish mood landing pages share membership and keep legacy aliases canonical', async () => {
  const sitemap = await read('dist/sitemap-pages.xml');
  const redirects = await read('dist/_redirects');
  for (const mood of moodLandingPages) {
    const members = postsForMoodCollection(mood, posts);
    assert.ok(members.length > 0);
    assert.deepEqual(members.map(post => post.slug), postsForMoodCollection(mood, index).map(post => post.slug));
    const html = await read(`dist/mood/${mood.slug}/index.html`);
    assert.ok(html.includes(`<h1>${mood.name}</h1>`));
    assert.match(html, /<title>Yabancı /);
    assert.ok(html.match(/<title>(.*?)<\/title>/)[1].includes(`${mood.name} ve Türkçe Çevirileri`));
    assert.ok(!html.includes('<h1>Yabancı '));
    assert.ok(html.includes('"@type":"CollectionPage"'));
    assert.ok(sitemap.includes(`https://www.acupoflyrics.com/mood/${mood.slug}</loc>`));
    assert.doesNotMatch(html, /name="robots" content="noindex/);
    const ordered = popularMoodPosts(members, mood);
    const found = [];
    assert.ok(!html.includes('Şarkılar Şarkıları'));
    assert.equal(moodPageTitle(mood).match(/Şarkılar(?:ı)?/g)?.length, 1);
    for (let page = 1; page <= moodPage(ordered).pageCount; page++) {
      const part = moodPage(ordered, page);
      const pageHtml = await read(`dist${moodPagePath(mood, page)}/index.html`);
      assert.doesNotMatch(pageHtml, /Search Console|Ölçümü olmayanlar|toplam okunma sayısı/);
      const pageTitle = pageHtml.match(/<title>(.*?)<\/title>/)[1];
      assert.ok(pageTitle.startsWith(`Yabancı ${mood.name} ve Türkçe Çevirileri`));
      assert.ok(!pageTitle.includes('…'));
      if (page > 1) assert.ok(pageTitle.endsWith(`— Sayfa ${page}`));
      const actual = [...pageHtml.matchAll(/<a\b[^>]*href="(\/[^"/]+\/)"/g)].map(match => match[1]);
      assert.deepEqual(actual, part.items.map(post => `/${post.slug}/`));
      found.push(...actual);
      assert.ok(actual.length <= MOOD_PAGE_SIZE);
      if (page > 1) {
        assert.match(pageHtml, /name="robots" content="noindex, follow"/);
        assert.ok(!sitemap.includes(`${moodPagePath(mood, page)}</loc>`));
      }
    }
    assert.equal(new Set(found).size, members.length);
    for (const alias of moodAliases(mood)) {
      assert.equal(moodPath(alias), `/mood/${mood.slug}`);
      assert.equal(moodCollectionFor(alias), mood);
      assert.ok(redirects.includes(`/mood/${alias} /mood/${mood.slug} 301`));
      assert.ok((await read(`dist/mood/${alias}/index.html`)).includes(`<link rel="canonical" href="https://www.acupoflyrics.com/mood/${mood.slug}"`));
      assert.ok(!sitemap.includes(`/mood/${alias}</loc>`));
      const response = middleware(new Request(`https://www.acupoflyrics.com/mood/${alias}/?utm_source=instagram`));
      assert.equal(response.status, 301);
      assert.equal(new URL(response.headers.get('location')).pathname, `/mood/${mood.slug}`);
      assert.equal(new URL(response.headers.get('location')).searchParams.get('utm_source'), 'instagram');
      const paged = middleware(new Request(`https://www.acupoflyrics.com/mood/${alias}/page/2`));
      assert.equal(paged.status, 301);
      assert.equal(new URL(paged.headers.get('location')).pathname, `/mood/${mood.slug}/page/2`);
      const firstPage = middleware(new Request(`https://www.acupoflyrics.com/mood/${alias}/page/1`));
      assert.equal(firstPage.status, 301);
      assert.equal(new URL(firstPage.headers.get('location')).pathname, `/mood/${mood.slug}`);
    }
  }
  assert.equal(moodCollectionFor(undefined), undefined);
  for (const slug of breakupSongSlugs) assert.ok(posts.some(post => post.slug === slug), slug);
  const breakup = postsForMoodCollection(moodCollectionFor('ayrilik-sarkilari'), posts);
  assert.ok(!breakup.some(post => /papaoutai|fein/.test(post.slug)));
  assert.equal(postsForMoodCollection(moodCollectionFor('ayrilik-sarkilari'), [{ slug: 'new-song', themes: ['breakup'] }]).length, 1);
});

test('Instagram hub exposes feature, six latest songs, search and moods before JS', async () => {
  const { featured, latest } = linksHubSongs(posts);
  assert.equal(featured.slug, amy.slug);
  assert.equal(latest.length, 6);
  assert.deepEqual(linksHubSongs(index).latest.map(post => post.slug), latest.map(post => post.slug));
  const html = await read('dist/linkler/index.html');
  assert.match(html, /<form action="\/search" method="get" role="search"/);
  assert.match(html, /name="q" type="search"/);
  assert.match(html, /Haftanın çevirisi/);
  for (const post of [featured, ...latest]) assert.ok(html.includes(`href="/${post.slug}/"`));
  for (const mood of moodLandingPages.slice(0, 3)) assert.ok(html.includes(`href="/mood/${mood.slug}"`));
  assert.match(html, /id="links-hub-styles"/);
  assert.ok((await read('dist/sitemap-pages.xml')).includes('https://www.acupoflyrics.com/linkler</loc>'));
  assert.doesNotMatch(html, /utm_source=/);
});

test('mood pagination, measured ranking and reviewed breakup coverage have safe boundaries', () => {
  assert.equal(moodLandingPages.length, 11);
  for (const [oldSlug, slug, name] of [
    ['iyi-hissettiren-sarkilar', 'rahatlatan-sarkilar', 'Rahatlatan Şarkılar'],
    ['karanlik-atmosferli-sarkilar', 'karanlik-sarkilar', 'Karanlık Şarkılar'],
    ['hayallere-daldiran-sarkilar', 'hayal-sarkilari', 'Hayal Şarkıları'],
  ]) {
    assert.equal(moodCollectionFor(oldSlug).slug, slug);
    assert.equal(moodCollectionFor(slug).name, name);
  }
  assert.match(moodCollectionFor('rahatlatan-sarkilar').description, /^Zor bir günün ardından/);
  assert.match(moodCollectionFor('rahatlatan-sarkilar').description, /yalnızca sakin tempolu parçalardan oluşmaz/);
  for (const mood of moodLandingPages) assert.ok(mood.description.split(/[.!?]\s/).length >= 2);
  const songs = [{ slug: 'unknown-z', artist: 'Z', song: 'Z' }, { slug: 'tame-impala-loser-turkce-ceviri', artist: 'Tame Impala', song: 'Loser' }, { slug: 'unknown-a', artist: 'A', song: 'A' }];
  assert.deepEqual(popularMoodPosts(songs).map(x => x.slug), ['tame-impala-loser-turkce-ceviri', 'unknown-a', 'unknown-z']);
  assert.equal(songs[0].slug, 'unknown-z');
  for (const page of [0, -1, 1.5, 'no', 99]) assert.equal(moodPage(songs, page).valid, false);
  assert.equal(moodPage(songs, 1).items.length, 3);
  for (const slug of ['lp-lost-on-you-turkce-ceviri', 'tom-odell-another-love-turkce-ceviri', 'lord-huron-the-night-we-met-turkce-ceviri']) assert.ok(breakupSongSlugs.has(slug));
  assert.equal(breakupSongSlugs.size, 20);
});

test('incoming Instagram CTAs have distinct tracking without changing canonical paths', () => {
  const profile = new URL(instagramCampaignUrl());
  assert.equal(profile.pathname, '/linkler');
  assert.equal(profile.searchParams.get('utm_source'), 'instagram');
  assert.equal(profile.searchParams.get('utm_content'), 'bio');
  const cta = instagramSongCta(amy);
  assert.ok(cta.caption.includes('Amy Winehouse — Back to Black'));
  const story = new URL(cta.storyUrl);
  assert.equal(story.pathname, `/${amy.slug}/`);
  assert.equal(story.searchParams.get('utm_campaign'), 'song_translation');
  assert.throws(() => instagramCampaignUrl('https://example.com/'));
});
