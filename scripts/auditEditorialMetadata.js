// Read-only inventory: node scripts/auditEditorialMetadata.js
import { readFile } from 'node:fs/promises';
import { translationMetaDescription, translationMetaTitle, isLegacyLyricDescription } from '../src/lib/meta.js';
import { songEditorialDescriptions, songLyricsTitleSlugs } from '../src/data/songEditorialSeo.js';

const posts = JSON.parse(await readFile(new URL('../src/data/posts.json', import.meta.url), 'utf8'));
const selection = JSON.parse(await readFile(new URL('../reports/site-audit/2026-10-21/content-priorities.json', import.meta.url), 'utf8'));
const identify = post => ({ name: `${post.artist} — ${post.song}`, url: `https://www.acupoflyrics.com/${post.slug}/` });
const rawLegacy = posts.filter(post => isLegacyLyricDescription(post.seo?.description));
const effectiveLegacy = posts.filter(post => isLegacyLyricDescription(translationMetaDescription(post)));
console.log(JSON.stringify({
  selectionBasis: selection.source,
  note: 'İlk 50 liste gösterime göredir, tıklamaya göre en çok trafik alan 50 sayfa değildir. Eski ham kayıtlar korunur; yayınlanan açıklamalarda kullanılmaz. Elle yazılmayan sayfalar söz alıntısı yerine genel sayfa açıklaması kullanır.',
  original50: selection.rows.map(([slug, clicks, impressions]) => ({ ...identify(posts.find(post => post.slug === slug)), clicks, impressions })),
  followUp8: [...songLyricsTitleSlugs].map(slug => {
    const post = posts.find(post => post.slug === slug);
    const title = translationMetaTitle(post);
    return { ...identify(post), title, titleLength: title.length, description: translationMetaDescription(post) };
  }),
  handwrittenDescriptionCount: Object.keys(songEditorialDescriptions).length,
  rawLegacyCount: rawLegacy.length,
  rawLegacy: rawLegacy.map(post => ({ ...identify(post), replacement: songEditorialDescriptions[post.slug] ? 'Elle yazılmış açıklama' : 'Genel sayfa açıklaması; özgün editoryal metin henüz yazılmadı' })),
  effectiveLegacyCount: effectiveLegacy.length,
  effectiveLegacy: effectiveLegacy.map(identify),
  verifiedSources: [
    { name: 'LP — Lost on You', url: 'https://archive.wonderlandmagazine.com/2017/03/15/lp/', result: 'İlk yanıtta LP, ayrılmadan önceki döneme ilişkin ayrılık şarkısı olduğunu ve ilişkiyi kurtarma isteğini açıklıyor.' },
    { name: 'Chezile — Beanie', url: 'https://music.apple.com/us/album/beanie-single/1739267342', result: 'Tekli sayfası: November 28, 2023; 1 song.' },
  ],
}, null, 2));
if (effectiveLegacy.length) process.exitCode = 1;
