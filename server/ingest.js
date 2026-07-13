// Converts an admin export record (Spotify + Genius + stanza translations) into
// the site's posts.json shape and writes it into the data files. Runs in Node
// (called from the /api/publish route in apiPlugin.js).

import { promises as fs } from "node:fs";
import path from "node:path";

const FILES = {
  posts: ["src/data/posts.json", "data/content/posts.json"],
  artists: ["src/data/artists.json", "data/content/artists.json"],
};

export function slugify(s) {
  return (s || "")
    .toLowerCase()
    .replace(/ı/g, "i")
    .replace(/İ/g, "i")
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/ö/g, "o")
    .replace(/ş/g, "s")
    .replace(/ü/g, "u")
    .normalize("NFD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function isLegacyWordPressImage(url = "") {
  return /\/wp-content\/uploads\//i.test(url);
}

// Stanzas → alternating original / translation blocks. This matches the
// WordPress import shape and keeps the detail reader split into real sections.
function stanzasToBlocks(stanzas = []) {
  const en = [];
  const tr = [];
  const blocks = [];
  const annotations = {};
  for (const st of stanzas) {
    const o = st.original || [];
    const t = st.translation || [];
    en.push(...o);
    tr.push(...t);
    blocks.push({ original: true, lines: o });
    blocks.push({ original: false, lines: t });
    if (st.note && st.note.text) {
      const word = (st.note.word || "").trim();
      if (word) annotations[word] = st.note.text.trim();
    }
  }
  return { en, tr, blocks, annotations };
}

export function recordToPost(record, existingPosts = []) {
  const sp = record.spotify || {};
  const artistName = record.artist || sp.artist?.name || "Bilinmeyen";
  const song = record.song || sp.track?.name || "Bilinmeyen";
  const albumName = sp.album?.name || null;
  const cover = sp.album?.cover || null;

  const artistSlug = slugify(artistName);
  const albumSlug = albumName ? slugify(albumName) : null;
  const slug = record.slug || slugify(`${artistName} ${song} turkce ceviri`);
  const existing = existingPosts.find((p) => p.slug === slug);

  const { en, tr, blocks, annotations } = stanzasToBlocks(record.stanzas);

  const words = [...en, ...tr].join(" ").split(/\s+/).filter(Boolean).length;
  const reading_time = Math.max(1, Math.round(words / 200));

  const maxId = existingPosts.reduce((m, p) => {
    const n = parseInt(p.id, 10);
    return Number.isNaN(n) ? m : Math.max(m, n);
  }, 0);

  return {
    ...(existing || {}),
    id: String(record.id || existing?.id || maxId + 1),
    title: `${artistName} ${song} Türkçe Çeviri`,
    song,
    slug,
    date: record.date || existing?.date || record.savedAt || new Date().toISOString(),
    artist: artistName,
    // Artist slug first so artistSlugFor() (category_slugs[0]) resolves to the
    // artist, not the album.
    categories: record.categories || [artistName, albumName].filter(Boolean),
    category_slugs: record.category_slugs || [artistSlug, albumSlug].filter(Boolean),
    image: cover || record.image || existing?.image || null,
    cover: cover || record.cover || existing?.cover || null,
    reading_time,
    blocks,
    excerpt: en.find(Boolean) || "",
    // Per-line translator notes, keyed by word → shown on the detail page.
    annotations,
    // General translator note → "Bu çeviride zorlandığım yer" card.
    difficulty_note: record.translatorNote || null,
    // Preserve the full fetched Spotify bundle for the detail page/admin audit,
    // while keeping the old flat fields for components that already read them.
    spotify: {
      ...sp,
      trackUrl: sp.track?.url || null,
      albumUrl: sp.album?.url || null,
      artistUrl: sp.artist?.url || null,
      albumName,
      albumType: sp.album?.albumType || null,
      releaseDate: sp.album?.releaseDate || null,
      duration: sp.track?.duration || null,
      isrc: sp.track?.isrc || null,
      label: sp.album?.label || null,
      coverUrl: cover,
    },
    genius: record.genius ? { ...record.genius } : null,
    youtubeUrl: record.youtubeUrl || null,
    source: existing?.source || "spotify-genius",
  };
}

export function recordToArtist(record) {
  const sp = record.spotify || {};
  const name = record.artist || sp.artist?.name;
  if (!name) return null;
  return { slug: slugify(name), name, count: 1, image: sp.artist?.image || null };
}

export function upsertRecordData(record, posts, artists) {
  const post = recordToPost(record, posts);

  const existingIdx = posts.findIndex((p) => p.slug === post.slug);
  const isNew = existingIdx < 0;
  const nextPosts = [...posts];
  if (isNew) {
    nextPosts.unshift(post);
  } else {
    nextPosts[existingIdx] = post;
  }

  const nextArtists = [...artists];
  const art = recordToArtist(record);
  if (art) {
    const ai = nextArtists.findIndex((a) => a.slug === art.slug);
    if (ai >= 0) {
      const currentImage = nextArtists[ai].image;
      nextArtists[ai] = {
        ...nextArtists[ai],
        count: (nextArtists[ai].count || 0) + (isNew ? 1 : 0),
        image: art.image && (!currentImage || isLegacyWordPressImage(currentImage))
          ? art.image
          : currentImage || art.image,
      };
    } else {
      nextArtists.push(art);
    }
  }

  return {
    posts: nextPosts,
    artists: nextArtists,
    result: { slug: post.slug, id: post.id, title: post.title, updated: !isNew },
  };
}

async function readJson(p) {
  const raw = await fs.readFile(p, "utf8");
  try {
    return JSON.parse(raw);
  } catch {
    const error = new Error("İçerik dosyası şu an okunamadı. Birkaç saniye sonra tekrar deneyin.");
    error.statusCode = 503;
    throw error;
  }
}

async function writeJsonAtomic(abs, json) {
  const tmp = `${abs}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmp, `${json}\n`, "utf8");
  await fs.rename(tmp, abs);
}

async function writeAll(relPaths, data, root) {
  const json = JSON.stringify(data, null, 2);
  for (const rel of relPaths) {
    const abs = path.join(root, rel);
    try {
      await writeJsonAtomic(abs, json);
    } catch {
      /* a mirror file may not exist; ignore */
    }
  }
}

export async function preparePublishRecord(record, root = process.cwd()) {
  if (!record || (!record.spotify && !record.song)) {
    const error = new Error("Geçersiz kayıt: Spotify verisi yok.");
    error.statusCode = 400;
    throw error;
  }
  const postsPath = path.join(root, FILES.posts[0]);
  const artistsPath = path.join(root, FILES.artists[0]);
  const posts = await readJson(postsPath);
  const artists = await readJson(artistsPath);

  const updated = upsertRecordData(record, posts, artists);

  return updated;
}

export async function writePublishData(updated, root = process.cwd()) {
  await writeAll(FILES.posts, updated.posts, root);
  await writeAll(FILES.artists, updated.artists, root);
}

export async function publishRecord(record, root = process.cwd()) {
  const updated = await preparePublishRecord(record, root);
  await writePublishData(updated, root);
  return updated.result;
}
