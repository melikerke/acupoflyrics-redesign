import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { relatedSongs } from '../src/lib/relatedSongs.js';
import { moodLandingPages, breakupSongSlugs } from '../src/data/moodLandingPages.js';
import { moodCollectionFor, postsForMoodCollection } from '../src/lib/moodCollections.js';
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
    assert.ok(html.includes('"@type":"CollectionPage"'));
    assert.ok(sitemap.includes(`https://www.acupoflyrics.com/mood/${mood.slug}</loc>`));
    assert.doesNotMatch(html, /name="robots" content="noindex/);
    for (const post of members) assert.ok(html.includes(`href="/${post.slug}/"`));
    if (mood.alias) {
      assert.equal(moodPath(mood.alias), `/mood/${mood.slug}`);
      assert.equal(moodCollectionFor(mood.alias), mood);
      assert.ok(redirects.includes(`/mood/${mood.alias} /mood/${mood.slug} 301`));
      assert.ok((await read(`dist/mood/${mood.alias}/index.html`)).includes(`<link rel="canonical" href="https://www.acupoflyrics.com/mood/${mood.slug}"`));
      assert.ok(!sitemap.includes(`/mood/${mood.alias}</loc>`));
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
  for (const mood of moodLandingPages) assert.ok(html.includes(`href="/mood/${mood.slug}"`));
  assert.match(html, /id="links-hub-styles"/);
  assert.ok((await read('dist/sitemap-pages.xml')).includes('https://www.acupoflyrics.com/linkler</loc>'));
  assert.doesNotMatch(html, /utm_source=/);
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
