import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const posts = JSON.parse(await readFile(new URL('../src/data/posts.json', import.meta.url), 'utf8'));
const expected = [
  ['stromae-papaoutai', 10, 76, 4, 'fr', 'oiKj0Z_Xnjc', '34dx8DACTJsc3rsJdaEIQw'],
  ['charlie-puth-attention', 11, 53, 3, 'en', 'nfs8NYg7yQM', '5cF0dROlMOK5uNZtivgu50'],
  ['tame-impala-let-it-happen', 9, 29, 2, 'en', 'odeHP8N4LKc', '2X485T9Z5Ly0xyaghN73ed'],
  ['sting-shape-of-my-heart', 11, 36, 3, 'en', 'NlwIDxCjL-8', '6CKoWCWAqEVWVjpeoJXyNH'],
  ['wham-last-christmas', 9, 53, 4, 'en', 'E8gmARGvPlI', '2FRnf9qhLbvw8fu4IBXx78'],
  ['michel-fugain-le-big-bazar-une-belle-histoire', 5, 33, 3, 'fr', 'hHiD6ShYCCA', '5oxKrYimzs8AZp8lkoar6V'],
  ['taylor-swift-cardigan', 10, 56, 6, 'en', 'zLSUp53y-HQ', '4R2kfaDFhslZEMJqAFNpdd'],
  ['manu-pilas-bella-ciao', 7, 26, 3, 'it', '4JVaRloezno', '3ISMDCuo2KDOC64nXz0Vah'],
];
const get = prefix => posts.find(p => p.slug === `${prefix}-turkce-ceviri`);
const tr = prefix => get(prefix).blocks.filter(b => !b.original).flatMap(b => b.lines).join('\n');
const escape = s => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

test('eight October 22 translations retain complete paired sections, credits, notes and chosen media', () => {
  for (const [prefix, sections, lines, notes, language, video, track] of expected) {
    const p = get(prefix);
    assert.ok(p, prefix);
    assert.equal(posts.filter(x => x.slug === p.slug).length, 1);
    assert.equal(p.source, 'user-provided');
    assert.equal(p.blocks.length, sections * 2, prefix);
    assert.equal(p.blocks.filter(b => b.original).flatMap(b => b.lines).length, lines, prefix);
    for (let i = 0; i < p.blocks.length; i += 2) {
      assert.equal(p.blocks[i].original, true);
      assert.equal(p.blocks[i + 1].original, false);
      assert.equal(p.blocks[i].label, p.blocks[i + 1].label);
      assert.equal(p.blocks[i].lines.length, p.blocks[i + 1].lines.length, prefix);
    }
    assert.equal(p.artist, p.spotify.artists.map(a => a.name).join(', '));
    assert.equal(p.languages.original, language);
    assert.equal(p.languages.translation, 'tr');
    assert.equal(p.youtubeUrl, `https://www.youtube.com/watch?v=${video}`);
    assert.equal(p.spotify.trackUrl, `https://open.spotify.com/track/${track}`);
    assert.equal(Object.keys(p.annotations).length, notes);
    for (const key of Object.keys(p.annotations)) assert.ok(tr(prefix).toLocaleLowerCase('tr').includes(key.toLocaleLowerCase('tr')), `${prefix}: ${key}`);
    assert.doesNotMatch(tr(prefix), /\|\|\||\*\*|Bu Çeviride Ne Yaptık|Yapıştırılan markdown/);
  }
});

test('requested literal corrections are retained', () => {
  const checks = [
    ['stromae-papaoutai', ['Bunu parmağımızdan mı uyduracağız yani?', 'Sadece çocuk yapanlar mı, yoksa dehalar mı?']],
    ['charlie-puth-attention', ['Adımı karalayıp duruyorsun', 'Seni bir türlü unutamayacağımdan emin olmak istiyorsun']],
    ['tame-impala-let-it-happen', ['Eğer havalanamazsam, başka bir hikâye uydurun', 'anneme üzgün olduğumu söyleyin', 'o ana ve o sese hazırım']],
    ['sting-shape-of-my-heart', ['Karşısında oynayanlar hiç şüphelenmez', 'Sayılar dansı yönetir', 'Taktığım maske tek', 'Ama konuşanlar hiçbir şey bilmez']],
    ['wham-last-christmas', ['Bir kez canın yanınca, ikincisinde temkinli olursun', 'Kalbinde ateş taşıyan bir âşığın yüzü']],
    ['michel-fugain-le-big-bazar-une-belle-histoire', ['Akıntıya kendilerini bırakarak', 'Gökyüzü ellerinin uzanabileceği kadar yakındı']],
    ['taylor-swift-cardigan', ['Tensel oyunlar', 'Beni giydin ve en sevdiğin olduğumu söyledin', 'Ama şimdi kanıyorum', 'Market sırasında gölgelerin peşine düşeceğimi']],
    ['manu-pilas-bella-ciao', ['Ve işgalciyi gördüm', 'Beni yukarıda, dağlarda göm']],
  ];
  for (const [prefix, phrases] of checks) for (const phrase of phrases) assert.ok(tr(prefix).includes(phrase), `${prefix}: ${phrase}`);
  assert.equal((tr('wham-last-christmas').match(/Ama daha ertesi gün, onu başkasına verdin/g) || []).length, 6);
});

test('all eight pages expose every line, note and media link in initial HTML and sitemap', async () => {
  const sitemap = await readFile(new URL('../dist/sitemap-songs.xml', import.meta.url), 'utf8');
  for (const [prefix, , , notes] of expected) {
    const p = get(prefix);
    const html = await readFile(new URL(`../dist/${p.slug}/index.html`, import.meta.url), 'utf8');
    for (const block of p.blocks) for (const line of block.lines) assert.ok(html.includes(escape(line)), `${prefix}: missing line`);
    for (const note of Object.values(p.annotations)) assert.ok(html.includes(escape(note)), `${prefix}: missing note`);
    assert.equal((html.match(/class="detail-lyric-annot"/g) || []).length, notes, prefix);
    assert.ok(html.includes(`href="${p.youtubeUrl}"`), prefix);
    assert.ok(html.includes(p.spotify.trackUrl), prefix);
    assert.ok(sitemap.includes(`<loc>https://www.acupoflyrics.com/${p.slug}/</loc>`), prefix);
  }
});
