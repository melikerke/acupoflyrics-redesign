import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const posts = JSON.parse(await readFile(new URL('../src/data/posts.json', import.meta.url), 'utf8'));
const expected = [
  ['tommy-cash-espresso-macchiato', 10, 41, 6, '5MS_Fczs_98', '4f5sxA4nQywcBlU05Ixdc7'],
  ['travis-scott-playboi-carti-fein', 9, 55, 15, 'B9synWjqBn8', '42VsgItocQwOQC3XWZ8JNA'],
  ['amy-winehouse-back-to-black', 6, 43, 6, 'TJAfLE39ZZ8', '3FAclTFfvUuQYnEsptbK8w'],
];
const get = prefix => posts.find(p => p.slug === `${prefix}-turkce-ceviri`);
const translated = p => p.blocks.filter(b => !b.original).flatMap(b => b.lines).join('\n');
const escape = s => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

test('three extra translations retain all paired lines, complete artist credits, discovery tags and notes', () => {
  for (const [prefix, sections, lines, notes, video, track] of expected) {
    const p = get(prefix);
    assert.ok(p, prefix);
    assert.equal(posts.filter(x => x.slug === p.slug).length, 1);
    assert.equal(p.blocks.length, sections * 2);
    assert.equal(p.blocks.filter(b => b.original).flatMap(b => b.lines).length, lines);
    for (let i = 0; i < p.blocks.length; i += 2) {
      assert.equal(p.blocks[i].original, true);
      assert.equal(p.blocks[i + 1].original, false);
      assert.equal(p.blocks[i].label, p.blocks[i + 1].label);
      assert.equal(p.blocks[i].lines.length, p.blocks[i + 1].lines.length);
    }
    assert.equal(p.artist, p.spotify.artists.map(a => a.name).join(', '));
    assert.equal(p.source, 'user-provided');
    assert.equal(p.languages.original, 'en');
    assert.equal(p.languages.translation, 'tr');
    assert.ok(p.genres.length && p.moods.length);
    assert.equal(p.youtubeUrl, `https://www.youtube.com/watch?v=${video}`);
    assert.equal(p.spotify.trackUrl, `https://open.spotify.com/track/${track}`);
    assert.equal(Object.keys(p.annotations).length, notes);
    for (const key of Object.keys(p.annotations)) assert.ok(translated(p).toLocaleLowerCase('tr').includes(key.toLocaleLowerCase('tr')), key);
    assert.doesNotMatch(translated(p), /\|\|\||\*\*|Bu Çeviride Ne Yaptık|Yapıştırılan markdown/);
  }
});

test('requested corrections and every chant repeat survive without unsupported extra meaning', () => {
  const tommy = translated(get(expected[0][0]));
  assert.equal((tommy.match(/corneo/g) || []).length, 2);
  assert.ok(tommy.includes('Stres yok, stres yok, depresyona gerek yok'));
  assert.doesNotMatch(tommy, /en güzelinden|kornet|elmas|kıvama/i);
  const travis = get(expected[1][0]);
  const original = travis.blocks.filter(b => b.original).flatMap(b => b.lines).join('\n');
  assert.equal((original.match(/FE!N/g) || []).length, 69);
  assert.equal((translated(travis).match(/MÜPTELA/g) || []).length, 69);
  assert.ok(translated(travis).includes('Seni şu anki hâlinle tanıştıran benim'));
  assert.ok(translated(travis).includes('O ile yatmaya çalışıyor'));
  assert.doesNotMatch(translated(travis), /OxyContin|buraları biz çekiyoruz|öldürülüp/);
  const amy = translated(get(expected[2][0]));
  assert.equal((amy.match(/Ben yüz kez öldüm/g) || []).length, 5);
  assert.equal((amy.match(/Biz sadece sözlerle vedalaştık/g) || []).length, 5);
  assert.equal((amy.match(/Karanlık|karanlık/g) || []).length, 7);
  assert.ok(amy.includes('Ben bize dönüyorum'));
  assert.ok(amy.includes('Bir boru gibi'));
  assert.doesNotMatch(amy, /kara sevda|binlerce|yüzlerce|güya|pipo/i);
});

test('three pages expose every line, clickable note, YouTube and Spotify link in initial HTML and sitemap', async () => {
  const sitemap = await readFile(new URL('../dist/sitemap-songs.xml', import.meta.url), 'utf8');
  for (const [prefix, , , notes] of expected) {
    const p = get(prefix);
    const html = await readFile(new URL(`../dist/${p.slug}/index.html`, import.meta.url), 'utf8');
    for (const b of p.blocks) for (const line of b.lines) assert.ok(html.includes(escape(line)), `${prefix}: ${line}`);
    for (const note of Object.values(p.annotations)) assert.ok(html.includes(escape(note)), prefix);
    assert.equal((html.match(/class="detail-lyric-annot"/g) || []).length, notes);
    assert.ok(html.includes(`href="${p.youtubeUrl}"`));
    assert.ok(html.includes(`href="${p.spotify.trackUrl}"`));
    assert.ok(sitemap.includes(`<loc>https://www.acupoflyrics.com/${p.slug}/</loc>`));
  }
});
