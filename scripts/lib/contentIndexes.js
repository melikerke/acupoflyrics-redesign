export function firstPair(post) {
  let en = "";
  let tr = "";
  for (const block of post.blocks || []) {
    if (block.original && !en) en = block.lines?.[0] || "";
    if (!block.original && !tr) tr = block.lines?.[0] || "";
    if (en && tr) break;
  }
  return { en, tr };
}

function normalizeLyric(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function heroPair(post) {
  const title = normalizeLyric(post.song);
  if (!title) return firstPair(post);

  const blocks = Array.isArray(post.blocks) ? post.blocks : [];
  for (let blockIndex = 0; blockIndex < blocks.length; blockIndex += 1) {
    const original = blocks[blockIndex];
    if (!original?.original) continue;

    const translation = blocks.slice(blockIndex + 1).find((block) => !block.original);
    const originalLines = original.lines || [];
    const translatedLines = translation?.lines || [];
    const lineIndex = originalLines.findIndex((line) => normalizeLyric(line).includes(title));

    if (lineIndex >= 0) {
      return {
        en: originalLines[lineIndex] || "",
        tr: translatedLines[lineIndex] || translatedLines[0] || "",
      };
    }
  }

  return firstPair(post);
}

export function buildArtistIndex(artists, posts) {
  const performers = new Set(posts.flatMap((post) => String(post.artist || "").split(/\s*,\s*/).map((name) => name.trim().toLowerCase()).filter(Boolean)));
  return artists.filter((artist) => performers.has(String(artist.name || "").trim().toLowerCase()))
    .map(({ slug, name, count, image }) => ({ slug, name, count, image }));
}

export function buildArticleIndex(articles) {
  return articles.map((article) => {
    const { slug, title, shortTitle, excerpt, dek, kicker, date, updatedAt, image, imageAlt, accent, readTime, artistName, artistSlug } = article;
    return { slug, title, shortTitle, excerpt, dek, kicker, date, updatedAt, image, imageAlt, accent, readTime, artistName, artistSlug, sourceCount: article.sources?.length || 0 };
  });
}

export function buildArticleSearchIndex(articles) {
  return Object.fromEntries(articles.map((article) => [article.slug, [
    article.title, article.shortTitle, article.artistName, article.kicker,
    article.excerpt, article.dek, ...(article.summary || []),
    ...(article.sections || []).flatMap((section) => [section.heading, ...(section.body || [])]),
  ].filter(Boolean).join(" ")]));
}

export function compactSpotify(spotify = {}) {
  const track = spotify.track || {};
  const artist = spotify.artist || {};
  const album = spotify.album || {};
  const albumArtist = album.artists?.[0] || {};
  return {
    trackUrl: track.url || spotify.trackUrl,
    albumUrl: album.url || spotify.albumUrl,
    artistUrl: artist.url || spotify.artistUrl,
    albumName: album.name || spotify.albumName,
    releaseDate: album.releaseDate || spotify.releaseDate,
    coverUrl: album.cover || spotify.coverUrl,
    duration: track.duration || spotify.duration,
    albumType: album.albumType || spotify.albumType,
    label: album.label || spotify.label,
    trackNumber: track.trackNumber,
    totalTracks: album.totalTracks,
    artistName: artist.name,
    artistImage: artist.image,
    artistGenres: artist.genres,
    albumArtist: albumArtist.name,
  };
}

