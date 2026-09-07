import { fitSeoTitle, sanitizeSeoDescription } from "../../src/lib/meta.js";

export const SPANISH_SOURCE_SLUGS = [
  "rose-bruno-mars-apt-turkce-ceviri", "huntr-x-golden-turkce-ceviri",
  "lady-gaga-bruno-mars-die-with-a-smile-turkce-ceviri", "billie-eilish-birds-of-a-feather-turkce-ceviri",
  "alex-warren-ordinary-turkce-ceviri", "billie-eilish-wildflower-turkce-ceviri",
  "jimin-who-turkce-ceviri", "jennie-like-jennie-turkce-ceviri",
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
    return {
      ...translation, slug, sourceSlug, locale: "es", path: `/es/${slug}`, sourcePath: `/${sourceSlug}/`,
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
