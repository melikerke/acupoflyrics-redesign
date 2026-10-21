import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { translationMetaTitle } from '../src/lib/meta.js';

const posts = JSON.parse(await readFile(new URL('../src/data/posts.json', import.meta.url), 'utf8'));
const expected = [
  ['cardi-b-bodak-yellow', 6, 62, 'PEGccV-NOm8', '6KBYefIoo7KydImq1uUQlL'],
  ['arctic-monkeys-i-wanna-be-yours', 7, 44, 'nyuo9-OjNNg', '5XeFesFbtLpXzIVDNQP22n'],
  ['the-neighbourhood-sweater-weather', 9, 52, 'GCdwKhTtNNw', '2QjOHCTQ1Jl3zawyYOpxh6'],
  ['tom-odell-another-love', 10, 47, 'MwpMEbgC7DA', '3JvKfv6T31zO0ini8iNItO'],
  ['lana-del-rey-summertime-sadness', 13, 53, 'nVjsGKrE6E8', '3BJe4B8zGnqEdQPMvfVjuS'],
  ['adele-set-fire-to-the-rain', 9, 59, 'uJdu4Lfy8aI', '3di5hcvxxciiqwMH1jarhY'],
  ['billie-eilish-khalid-lovely', 7, 28, 'V1Pl8CzNzCw', '0u2P5u6lvoDfwTYjAADbn4'],
  ['eminem-mockingbird', 6, 91, 'S9bCLPwzSC0', '561jH07mF1jHuk7KlaeF0s'],
  ['cardi-b-up', 12, 61, 'rCiBgLOcuKU', '1XXimziG1uhM0eDNCZCrUl'],
  ['lana-del-rey-young-and-beautiful', 9, 34, 'o_1aF54DO60', '2nMeu6UenVvwUktBCpLMK9'],
  ['indila-derniere-danse', 6, 40, 'K5KAc5CoCuk', '65uoaqX5qcjXZRheAj1qQT'],
  ['cigarettes-after-sex-apocalypse', 8, 29, 'sElE_BfQ67s', '1oAwsWBovWRIp7qLMGPIet'],
];
const get = prefix => posts.find(p => p.slug === `${prefix}-turkce-ceviri`);
const translated = prefix => get(prefix).blocks.filter(b => !b.original).flatMap(b => b.lines).join('\n');
const escape = s => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

test('twelve submitted translations preserve sections, source lines, full credits and verified media', () => {
  for (const [prefix, sections, count, youtube, spotify] of expected) {
    const p = get(prefix);
    assert.ok(p, prefix);
    assert.equal(posts.filter(x => x.slug === p.slug).length, 1);
    assert.equal(p.source, 'user-provided');
    assert.equal(p.blocks.length, sections * 2, prefix);
    assert.equal(p.blocks.filter(b => b.original).flatMap(b => b.lines).length, count, prefix);
    for (let i = 0; i < p.blocks.length; i += 2) {
      assert.equal(p.blocks[i].original, true);
      assert.equal(p.blocks[i + 1].original, false);
      assert.equal(p.blocks[i].label, p.blocks[i + 1].label);
      assert.ok(p.blocks[i + 1].lines.length);
    }
    assert.equal(p.youtubeUrl, `https://www.youtube.com/watch?v=${youtube}`);
    assert.equal(p.spotify.trackUrl, `https://open.spotify.com/track/${spotify}`);
    assert.equal(p.artist, p.spotify.artists.map(a => a.name).join(', '));
    assert.equal(p.languages.original, prefix.startsWith('indila-') ? 'fr' : 'en');
    assert.equal(p.languages.translation, 'tr');
    assert.ok(Object.keys(p.annotations).length >= 3);
    const text = translated(prefix).toLocaleLowerCase('tr');
    for (const key of Object.keys(p.annotations)) assert.ok(text.includes(key.toLocaleLowerCase('tr')), `${prefix}: unlinked note ${key}`);
    assert.doesNotMatch(text, /\|\|\||\*\*|bu çeviride ne yaptık|profesyonel çeviriyi hazırladım/);
  }
});

test('requested wording corrections remain in the published Turkish blocks', () => {
  const checks = [
    ['arctic-monkeys-i-wanna-be-yours', ['Kararı sen ver, bebeğim', 'saç sabitleyici losyonun', 'Pasifik Okyanusu'], ['Raconu', 'jolen', 'Büyük Okyanus']],
    ['the-neighbourhood-sweater-weather', ['Ne gömlek var ne bluz', 'kol açıklıklarında', 'Parmağımı diline koyuyorum'], ['Üstümüzde hiçbir şey yok', 'kazağımın sıcaklığı']],
    ['tom-odell-another-love', ['Gecelerimi paylaşacak hâlim kalmadı', 'Kelimeler hep kazanır ama biliyorum, ben kaybedeceğim.'], ['Tükendim', 'çok fena olacağım']],
    ['lana-del-rey-summertime-sadness', ['Topuklularımı çıkardım', 'saatte 99 mil', 'sürmeye devam edeceğim'], ['fırlatıp attım', '(hayata)']],
    ['adele-set-fire-to-the-rain', ['Yüzüne dokunurken yağmurun boşalışını izledim.', 'Ayaklarına düşmeden', 'ikimizi alevlerin içine attım'], ['ateşin', 'kapanmadan']],
    ['billie-eilish-khalid-lovely', ['Zamanın dışına doğru yürüyorum', 'dışarıda korkumla savaşamıyorum', 'Hep zihnimde'], ['yetişemiyorum', 'dar alan']],
    ['eminem-mockingbird', ['annen bir bağımlılık geliştirdi', 'kulağa hoş geliyor, değil mi?', 'mockingbird'], ['ağırlığı', 'alaycı kuş']],
    ['cardi-b-up', ['Mesele açıldıysa', 'yalan dili', 'lafımı koyarım', 'sırayla benimle sikişmelerine', 'Yüz yoksa dava da yok'], ['zirvede kalırız', 'her şeyi yaşardım']],
    ['lana-del-rey-young-and-beautiful', ['Pastam da oldu artık', 'meleklerin ruhuna kanal', 'Şovunda benim için çalardın'], ['Tüm arzularıma', 'çalışın']],
    ['indila-derniere-danse', ['kuruntuluyum', 'Göğü, gündüzü, geceyi', 'Sıra bana mı geldi?', 'haksızlıklarının bedelini'], ['tuhafım', 'günah']],
    ['cigarettes-after-sex-apocalypse', ['İçinde müzik var', 'Kollarına sardığın sevgililerin alınlarına öpücükler', 'Çık ortaya ve bana musallat ol', 'Kendini kötü hissettiğinde'], ['Ruhunda o melodi', 'hayaletin']],
  ];
  for (const [prefix, yes, no] of checks) {
    const text = translated(prefix);
    for (const phrase of yes) assert.ok(text.includes(phrase), `${prefix}: missing ${phrase}`);
    for (const phrase of no) assert.ok(!text.includes(phrase), `${prefix}: stale ${phrase}`);
  }
  assert.equal(get('arctic-monkeys-i-wanna-be-yours').blocks.filter(b => !b.original && b.label === 'Chorus')[1].lines.length, 10);
  assert.equal(get('eminem-mockingbird').blocks.filter(b => !b.original && b.label === 'Chorus')[1].lines.length, 8);
  assert.equal(get('cardi-b-up').blocks.filter(b => !b.original && b.label === 'Chorus').length, 3);
});

test('new pages include every supplied line and note in initial HTML and enter the song sitemap', async () => {
  const sitemap = await readFile(new URL('../dist/sitemap-songs.xml', import.meta.url), 'utf8');
  for (const [prefix] of expected) {
    const p = get(prefix);
    const html = await readFile(new URL(`../dist/${p.slug}/index.html`, import.meta.url), 'utf8');
    assert.ok(html.includes(`<title>${escape(translationMetaTitle(p))}</title>`), prefix);
    assert.ok(html.includes(`https://www.acupoflyrics.com/${p.slug}/`));
    for (const b of p.blocks) for (const line of b.lines) assert.ok(html.includes(escape(line)), `${prefix}: missing line`);
    for (const note of Object.values(p.annotations)) assert.ok(html.includes(escape(note)), `${prefix}: missing note`);
    assert.ok(sitemap.includes(`<loc>https://www.acupoflyrics.com/${p.slug}/</loc>`));
  }
});
