import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {relatedSongs, recommendationProfile} from '../src/lib/relatedSongs.js';
import {songRecommendationProfiles} from '../src/data/songRecommendationProfiles.js';
import {songInsights} from '../src/data/songInsights.js';
import {staticSongSpotifyLink,staticSongInsight} from '../scripts/lib/prerenderContent.js';
import {compactSpotify} from '../scripts/lib/contentIndexes.js';
const posts=JSON.parse(await readFile(new URL('../src/data/posts.json',import.meta.url),'utf8'));
const index=JSON.parse(await readFile(new URL('../src/data/postIndex.json',import.meta.url),'utf8'));
const byPrefix=prefix=>index.find(p=>p.slug===`${prefix}-turkce-ceviri`);

test('same artist including collaborative credits is always excluded, artists are diverse',()=>{
  const source={slug:'source',artist:'A, B',genres:['dance-pop'],moods:['Party'],languages:{original:'ko'}};
  const candidates=[
    {slug:'same',artist:'A',genres:['dance-pop']},
    {slug:'collaboration',artist:'C feat. B',genres:['dance-pop']},
    {slug:'one',artist:'D',genres:['dance-pop'],moods:['Party']},
    {slug:'two',artist:'D',genres:['dance-pop']},
    {slug:'three',artist:'E',genres:['dance-pop']},
    {slug:'mood-only',artist:'F',moods:['Party']},
  ];
  const result=relatedSongs(source,candidates);
  assert.deepEqual(result.map(p=>p.slug),['one','three']);
  assert.deepEqual(relatedSongs(source,[...candidates].reverse()),result);
  assert.deepEqual(relatedSongs(undefined,candidates),[]);
  assert.deepEqual(relatedSongs(source,candidates,0),[]);
});

test('language fallback uses recorded search clicks, never a fabricated popularity number',()=>{
  const source={slug:'source',artist:'Other',languages:{original:'fr'}};
  const candidates=[
    {slug:'aaa',artist:'A',languages:{original:'fr'}},
    {slug:'gims-est-ce-que-tu-maimes-turkce-ceviri',artist:'GIMS',languages:{original:'fr'}},
    {slug:'indila-tourner-dans-le-vide-turkce-ceviri',artist:'Indila',languages:{original:'fr'}},
    {slug:'wrong-language',artist:'B',languages:{original:'en'},views:99999999},
  ];
  assert.deepEqual(relatedSongs(source,candidates).map(p=>p.slug),['indila-tourner-dans-le-vide-turkce-ceviri','gims-est-ce-que-tu-maimes-turkce-ceviri','aaa']);
});

test('new editorial tags reach compact indexes and full/compact recommendation results agree',()=>{
  for(const [slug,profile] of Object.entries(songRecommendationProfiles)){
    const p=index.find(p=>p.slug===slug);assert.ok(p,slug);
    assert.deepEqual(p.genres,profile.genres,slug);assert.deepEqual(p.moods,profile.moods,slug);
    const full=posts.find(p=>p.slug===slug);
    assert.deepEqual(recommendationProfile(full),recommendationProfile({...full,spotify:compactSpotify(full.spotify)}));
  }
  const french=relatedSongs(byPrefix('stromae-papaoutai'),index);
  assert.equal(french.length,4);
  assert.ok(french.every(p=>recommendationProfile(p).language==='fr'));
  const neon=relatedSongs(byPrefix('a2o-lite-a2o-neon'),index);
  assert.ok(neon.some(p=>/aespa/i.test(p.artist)));
  assert.ok(neon.every(p=>!/^ADÉLA$|Arca|Ari Lennox/.test(p.artist)));
  const christmas=relatedSongs(byPrefix('wham-last-christmas'),index);
  assert.ok(christmas.slice(0,2).every(p=>recommendationProfile(p).genres.has('christmas-pop')));
});

test('Spotify emits a real safe anchor, not just a URL inside JSON-LD',()=>{
  const p={artist:'A & B',song:'<Test>',spotify:{trackUrl:'https://open.spotify.com/track/123abc'}};
  assert.ok(staticSongSpotifyLink(p).includes('<a href="https://open.spotify.com/track/123abc"'));
  assert.ok(staticSongSpotifyLink(p).includes('A &amp; B — &lt;Test&gt;'));
  for(const url of ['javascript:alert(1)','https://open.spotify.com.evil.test/track/123','https://open.spotify.com/artist/123'])assert.equal(staticSongSpotifyLink({...p,spotify:{trackUrl:url}}),'');
});

test('ALL Spotify tracks appear as anchors in initial main HTML',async()=>{
  let count=0;
  for(const p of posts){
    const expected=staticSongSpotifyLink(p);if(!expected)continue;
    const html=await readFile(new URL(`../dist/${p.slug}/index.html`,import.meta.url),'utf8');
    const main=html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/)?.[1]||'';
    assert.ok(main.includes(expected),p.slug);count++;
  }
  assert.ok(count>500);
});

test('four new insights have three FAQs, sources and their own visible update date below lyrics',async()=>{
  for(const prefix of ['stromae-papaoutai','sting-shape-of-my-heart','tame-impala-let-it-happen','charlie-puth-attention']){
    const slug=`${prefix}-turkce-ceviri`, insight=songInsights[slug];
    assert.equal(insight.faq.length,3);assert.equal(insight.updatedAt,'2026-10-22');assert.ok(insight.sources.length);
    const html=await readFile(new URL(`../dist/${slug}/index.html`,import.meta.url),'utf8');
    assert.ok(html.includes(staticSongInsight(slug)));assert.ok(staticSongInsight(slug).includes('22 Ekim 2026'));
    assert.ok(html.indexOf('Şarkı ne anlatıyor?')>html.lastIndexOf('seo-lyric-label'));
  }
});
