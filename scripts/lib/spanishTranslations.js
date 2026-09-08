import { fitSeoTitle, sanitizeSeoDescription } from "../../src/lib/meta.js";

export const SPANISH_SOURCE_SLUGS = [
  "rose-bruno-mars-apt-turkce-ceviri", "huntr-x-golden-turkce-ceviri",
  "lady-gaga-bruno-mars-die-with-a-smile-turkce-ceviri", "billie-eilish-birds-of-a-feather-turkce-ceviri",
  "alex-warren-ordinary-turkce-ceviri", "billie-eilish-wildflower-turkce-ceviri",
  "jimin-who-turkce-ceviri", "jennie-like-jennie-turkce-ceviri",
];

// Section boundaries reviewed against the existing originals. Translation
// line counts differ, so never zip the two languages line by line.
const ORIGINAL_SECTION_LENGTHS = [
  [3, 8, 5, 4, 8, 4, 4, 8, 10, 4, 16],
  [8, 4, 8, 4, 4, 8, 4],
  [0, 4, 4, 8, 0, 4, 4, 8, 4, 10, 2],
  [0, 8, 4, 3, 4, 8, 4, 4, 3],
  [6, 3, 8, 6, 1, 8, 4, 8],
  [6, 6, 3, 1, 6, 3, 3, 4, 2, 3],
  [4, 4, 3, 4, 4, 3, 8, 4, 8],
  [1, 5, 10, 3, 12, 14, 4],
];

// Only Markdown presentation markers are removed. Every lyric line, repeat,
// accent and section credit stays exactly as submitted by the editor.
export function parseSpanishSubmission(text) {
  const songs = [];
  let song, section;
  for (const raw of text.replace(/\r\n/g, "\n").split("\n")) {
    const line = raw.replace(/\\$/, "").trim();
    if (!line) continue;
    const heading = line.match(/^\*\*(.+?) — (.+?)\*\*$/);
    if (heading) {
      song = { song: heading[1], artist: heading[2], sections: [] };
      songs.push(song); section = null; continue;
    }
    if (!song) throw new Error("Translation text precedes its song heading");
    const credit = line.match(/^\*(Voces: .+)\*$/);
    if (credit && !section) { song.vocals = credit[1]; continue; }
    const label = line.match(/^\[(.+)\]$/);
    if (label) { section = { label: label[1], lines: [] }; song.sections.push(section); continue; }
    if (!section) throw new Error(`Missing section heading for ${song.song}`);
    section.lines.push(line);
  }
  if (songs.some((item) => !item.sections.length || item.sections.some((part) => !part.lines.length))) throw new Error("Empty translation section");
  return songs;
}

export function buildSpanishTranslations(text, posts) {
  const submitted = parseSpanishSubmission(text);
  if (submitted.length !== SPANISH_SOURCE_SLUGS.length) throw new Error("Expected the eight supplied translations");
  return submitted.map((translation, index) => {
    const sourceSlug = SPANISH_SOURCE_SLUGS[index];
    const source = posts.find((item) => item.slug === sourceSlug);
    if (!source || source.song.toLowerCase() !== translation.song.toLowerCase()) throw new Error(`Translation/source mismatch: ${translation.song}`);
    const slug = sourceSlug.replace(/-turkce-ceviri$/, "");
    const lines = translation.sections.flatMap((part) => part.lines);
    const originals = source.blocks.filter((block) => block.original).flatMap((block) => block.lines);
    const lengths = ORIGINAL_SECTION_LENGTHS[index];
    if (lengths.length !== translation.sections.length || lengths.reduce((sum, n) => sum + n, 0) !== originals.length) throw new Error(`Original section mapping needs review: ${translation.song}`);
    let offset = 0;
    const sections = translation.sections.map((section, part) => {
      const original = originals.slice(offset, offset + lengths[part]);
      offset += lengths[part];
      return { ...section, original };
    });
    return {
      ...translation, sections, slug, sourceSlug, locale: "es", path: `/es/${slug}`, sourcePath: `/${sourceSlug}/`,
      sourceMetadata: { spotify: source.spotify || null, youtubeUrl: source.youtubeUrl || source.youtube?.url || "", youtubeEmbedDisabled: Boolean(source.youtubeEmbedDisabled), songwriters: source.songwriters || source.composers || source.credits?.songwriters || source.credits?.composers || "" },
      cover: source.cover, album: source.spotify?.album?.name || source.spotify?.albumName || source.categories?.[1] || "",
      spotifyUrl: source.spotify?.track?.url || source.spotify?.trackUrl || "",
      releaseDate: source.spotify?.album?.releaseDate || source.spotify?.releaseDate || "",
      translationDate: "2026-09-07", readingMinutes: Math.max(1, Math.ceil(lines.join(" ").split(/\s+/).length / 200)),
      lineCount: lines.length, excerpt: lines[0],
      title: fitSeoTitle([`${translation.song} — ${translation.artist}: letra en español`, `${translation.song}: traducción al español | acupoflyrics`]),
      description: sanitizeSeoDescription(`Lee la traducción al español de ${translation.song}, de ${translation.artist}, organizada por versos y estribillos. Disponible también en turco.`),
    };
  });
}
