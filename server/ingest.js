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

// Stanzas → two index-aligned blocks (all EN lines / all TR lines). Each stanza
// is padded to its own max length so the line-by-line reader keeps EN↔TR pairs
// aligned even when a stanza's translation has a different line count.
function stanzasToBlocks(stanzas = []) {
  const en = [];
  const tr = [];
  const annotations = {};
  for (const st of stanzas) {
    const o = st.original || [];
    const t = st.translation || [];
    const n = Math.max(o.length, t.length);
    for (let i = 0; i < n; i++) {
      en.push(o[i] || "");
      tr.push(t[i] || "");
    }
    if (st.note && st.note.text) {
      const word = (st.note.word || "").trim();
      if (word) annotations[word] = st.note.text.trim();
    }
  }
  return { en, tr, annotations };
}

export function recordToPost(record, existingPosts = []) {
  const sp = record.spotify || {};
  const artistName = record.artist || sp.artist?.name || "Bilinmeyen";
  const song = record.song || sp.track?.name || "Bilinmeyen";
  const albumName = sp.album?.name || null;
  const cover = sp.album?.cover || null;

  const artistSlug = slugify(artistName);
  const albumSlug = albumName ? slugify(albumName) : null;
  const slug = slugify(`${artistName} ${song} turkce ceviri`);

  const { en, tr, annotations } = stanzasToBlocks(record.stanzas);

  const words = [...en, ...tr].join(" ").split(/\s+/).filter(Boolean).length;
  const reading_time = Math.max(1, Math.round(words / 200));

  const maxId = existingPosts.reduce((m, p) => {
    const n = parseInt(p.id, 10);
    return Number.isNaN(n) ? m : Math.max(m, n);
  }, 0);

  return {
    id: String(maxId + 1),
    title: `${artistName} ${song} Türkçe Çeviri`,
    song,
    slug,
    date: record.savedAt || new Date().toISOString(),
    artist: artistName,
    // Artist slug first so artistSlugFor() (category_slugs[0]) resolves to the
    // artist, not the album.
    categories: [artistName, albumName].filter(Boolean),
    category_slugs: [artistSlug, albumSlug].filter(Boolean),
    image: cover,
    cover,
    reading_time,
    blocks: [
      { original: true, lines: en },
      { original: false, lines: tr },
    ],
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
    source: "spotify-genius",
  };
}

export function recordToArtist(record) {
  const sp = record.spotify || {};
  const name = record.artist || sp.artist?.name;
  if (!name) return null;
  return { slug: slugify(name), name, count: 1, image: sp.artist?.image || null };
}

async function readJson(p) {
  return JSON.parse(await fs.readFile(p, "utf8"));
}

async function writeAll(relPaths, data, root) {
  const json = JSON.stringify(data, null, 2);
  for (const rel of relPaths) {
    const abs = path.join(root, rel);
    try {
      await fs.writeFile(abs, json);
    } catch {
      /* a mirror file may not exist; ignore */
    }
  }
}

export async function publishRecord(record, root = process.cwd()) {
  if (!record || (!record.spotify && !record.song)) {
    throw new Error("Geçersiz kayıt: Spotify verisi yok.");
  }
  const postsPath = path.join(root, FILES.posts[0]);
  const artistsPath = path.join(root, FILES.artists[0]);
  const posts = await readJson(postsPath);
  const artists = await readJson(artistsPath);

  const post = recordToPost(record, posts);

  // Replace an existing entry with the same slug, else add as newest.
  const existingIdx = posts.findIndex((p) => p.slug === post.slug);
  const isNew = existingIdx < 0;
  if (!isNew) posts.splice(existingIdx, 1);
  posts.unshift(post);

  const art = recordToArtist(record);
  if (art) {
    const ai = artists.findIndex((a) => a.slug === art.slug);
    if (ai >= 0) {
      artists[ai] = {
        ...artists[ai],
        count: (artists[ai].count || 0) + (isNew ? 1 : 0),
        image: artists[ai].image || art.image,
      };
    } else {
      artists.push(art);
    }
  }

  await writeAll(FILES.posts, posts, root);
  await writeAll(FILES.artists, artists, root);

  return { slug: post.slug, id: post.id, title: post.title, updated: !isNew };
}
