import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { relatedSongs, recommendationProfile } from '../src/lib/relatedSongs.js';

const index=JSON.parse(await readFile(new URL('../src/data/postIndex.json',import.meta.url),'utf8'));
const get=prefix=>index.find(p=>p.slug===`${prefix}-turkce-ceviri`);

test('season restrictions are symmetric and survive every fallback',()=>{
  const normal={slug:'normal',artist:'Normal',genres:['dance-pop'],moods:['Sad'],languages:{original:'en'}};
  const christmas={slug:'christmas',artist:'Christmas',genres:['christmas-pop','dance-pop'],moods:['Sad'],languages:{original:'en'}};
  const otherChristmas={...christmas,slug:'other-christmas',artist:'Other Christmas'};
  const otherSeason={...normal,slug:'halloween',artist:'Halloween',season:'halloween'};
  assert.deepEqual(relatedSongs(normal,[christmas,otherSeason]),[]);
  assert.deepEqual(relatedSongs(christmas,[normal,otherSeason,otherChristmas]),[otherChristmas]);
  const moodOnly={slug:'mood-only',artist:'Folk',genres:['folk'],moods:['Sad'],languages:{original:'it'}};
  assert.deepEqual(relatedSongs(moodOnly,[christmas]),[]);
  assert.deepEqual(relatedSongs(christmas,[moodOnly]),[]);
});

test('mood fallback uses measured search clicks, excludes self and shared artists, stays deterministic',()=>{
  const source={slug:'source',artist:'Singer',genres:['folk'],moods:['Sad'],languages:{original:'it'}};
  const candidates=[source,
    {slug:'collaboration',artist:'Singer, Guest',moods:['Sad']},
    {slug:'aaa',artist:'Unmeasured',moods:['Sad']},
    {slug:'gims-est-ce-que-tu-maimes-turkce-ceviri',artist:'GIMS',moods:['Sad']},
    {slug:'indila-tourner-dans-le-vide-turkce-ceviri',artist:'Indila',moods:['Sad']},
    {slug:'duplicate-artist',artist:'Indila',moods:['Sad']},
    {slug:'different-mood',artist:'Party',moods:['Party']},
  ];
  const result=relatedSongs(source,candidates);
  assert.deepEqual(result.map(p=>p.slug),['indila-tourner-dans-le-vide-turkce-ceviri','gims-est-ce-que-tu-maimes-turkce-ceviri','aaa']);
  assert.deepEqual(relatedSongs(source,[...candidates].reverse()),result);
  const direct={slug:'direct',artist:'Folk singer',genres:['folk']};
  assert.deepEqual(relatedSongs(source,[...candidates,direct]),[direct]);
});

test('actual pages keep recommendations without leaking seasonal songs into nonseasonal pages',()=>{
  const bella=get('manu-pilas-bella-ciao');
  const result=relatedSongs(bella,index);
  assert.equal(result.length,4);
  const moods=recommendationProfile(bella).moods;
  assert.ok(result.every(p=>[...recommendationProfile(p).moods].some(m=>moods.has(m))));
  for(const prefix of ['charlie-puth-attention','tame-impala-let-it-happen','manu-pilas-bella-ciao']){
    const selected=relatedSongs(get(prefix),index);
    assert.ok(selected.length>0,prefix);
    assert.ok(selected.every(p=>!recommendationProfile(p).season),prefix);
  }
  const seasonal=relatedSongs(get('wham-last-christmas'),index);
  assert.equal(seasonal.length,2);
  assert.ok(seasonal.every(p=>recommendationProfile(p).season==='christmas'));
});

test('initial HTML uses the same recommendation list as the browser',async()=>{
  for(const prefix of ['manu-pilas-bella-ciao','charlie-puth-attention','tame-impala-let-it-happen','wham-last-christmas']){
    const p=get(prefix), expected=relatedSongs(p,index).map(p=>`/${p.slug}/`);
    const html=await readFile(new URL(`../dist/${p.slug}/index.html`,import.meta.url),'utf8');
    const section=html.match(/<h2>Benzer şarkılar<\/h2><ul>([\s\S]*?)<\/ul>/)?.[1];
    assert.ok(section,prefix);
    const links=[...section.matchAll(/href="([^"]+)"/g)].map(m=>m[1]);
    assert.deepEqual(links,expected,prefix);
  }
});
