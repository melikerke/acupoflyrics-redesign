import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const posts=JSON.parse(await readFile(new URL('../src/data/posts.json',import.meta.url),'utf8'));
const p=posts.find(p=>p.slug==='a2o-lite-a2o-neon-turkce-ceviri');
const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
test('A2O LITE, A2O — NEON keeps the chosen media, full credits, romanization and all sections',()=>{
  assert.ok(p);
  assert.equal(p.artist,'A2O LITE, A2O');
  assert.equal(p.artist,p.spotify.artists.map(a=>a.name).join(', '));
  assert.equal(p.spotify.trackUrl,'https://open.spotify.com/track/5PvLNQRNRj61y3CU4SFIY4');
  assert.equal(p.youtubeUrl,'https://www.youtube.com/watch?v=D968qfUZMUE');
  assert.equal(p.source,'user-provided');
  assert.equal(p.languages.original,'ko');
  assert.equal(p.blocks.length,28);
  assert.equal(p.originalScriptBlocks.length,14);
  assert.equal(p.blocks.filter(b=>b.original).flatMap(b=>b.lines).length,69);
  for(let i=0;i<p.blocks.length;i+=2){
    const o=p.blocks[i],t=p.blocks[i+1];
    assert.equal(o.original,true);assert.equal(t.original,false);
    assert.equal(o.label,t.label);assert.equal(o.lines.length,t.lines.length);
    assert.equal(o.lines.length,p.originalScriptBlocks[i/2].lines.length);
    assert.doesNotMatch(o.lines.join('\n'),/[가-힣]/);
    assert.doesNotMatch(o.label,/\*/);
  }
  assert.equal(p.blocks.at(-1).lines.length,8);
  assert.equal((p.blocks.at(-1).lines.join('\n').toLocaleLowerCase('tr').match(/işte geliyoruz/g)||[]).length,14);
  assert.equal(Object.keys(p.annotations).length,17);
  const tr=p.blocks.filter(b=>!b.original).flatMap(b=>b.lines).join('\n').toLocaleLowerCase('tr');
  for(const key of Object.keys(p.annotations))assert.ok(tr.includes(key.toLocaleLowerCase('tr')),key);
});
test('A2O LITE, A2O — NEON exposes lyrics, all notes and both listening links before JavaScript',async()=>{
  const html=await readFile(new URL(`../dist/${p.slug}/index.html`,import.meta.url),'utf8');
  const sitemap=await readFile(new URL('../dist/sitemap-songs.xml',import.meta.url),'utf8');
  for(const b of p.blocks)for(const line of b.lines)assert.ok(html.includes(escape(line)),line);
  for(const note of Object.values(p.annotations))assert.ok(html.includes(escape(note)),note);
  assert.equal((html.match(/class="detail-lyric-annot"/g)||[]).length,17);
  assert.ok(html.includes(`href="${p.youtubeUrl}"`));assert.ok(html.includes(p.spotify.trackUrl));
  assert.ok(sitemap.includes(`<loc>https://www.acupoflyrics.com/${p.slug}/</loc>`));
});
