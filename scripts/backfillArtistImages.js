import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadEnv } from "vite";
import { spotifyApiGet } from "../server/spotify.js";

const ROOT = process.cwd();
const ARTIST_FILES = ["src/data/artists.json", "data/content/artists.json"];
const POSTS_PATH = "src/data/posts.json";
const env = loadEnv("development", ROOT, "");
const dryRun = process.argv.includes("--dry-run");

// These WordPress categories are album/soundtrack names, not performers.
// Their post metadata must be corrected separately instead of inventing an
// artist portrait for them.
const NON_ARTIST_CATEGORIES = new Set([
  "black out",
  "happy",
  "hop",
  "haute couture",
  "aboutzu",
]);

function normalize(value = "") {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, "")
    .toLowerCase();
}

function isLegacyWordPressImage(url = "") {
  return /\/wp-content\/uploads\//i.test(url);
}

function largestImage(images = []) {
  return [...images].sort((a, b) => (b.width || 0) - (a.width || 0))[0]?.url || null;
}

async function searchArtist(name) {
  const data = await spotifyApiGet(
    `/search?type=artist&limit=10&q=${encodeURIComponent(name)}`,
    { clientId: env.SPOTIFY_CLIENT_ID, clientSecret: env.SPOTIFY_CLIENT_SECRET },
  );
  const exact = (data.artists?.items || []).find(
    (artist) => normalize(artist.name) === normalize(name),
  );
  if (!exact) return null;
  const image = largestImage(exact.images);
  return image ? { name: exact.name, image } : null;
}

async function main() {
  const posts = JSON.parse(await readFile(path.join(ROOT, POSTS_PATH), "utf8"));
  const primaryArtistImages = new Map();
  for (const post of posts) {
    const name = String(post.spotify?.artist?.name || "").trim().toLowerCase();
    const image = post.spotify?.artist?.image;
    if (name && image && !primaryArtistImages.has(name)) primaryArtistImages.set(name, image);
  }

  const performerNames = new Set(
    posts.flatMap((post) => String(post.artist || "")
      .split(/\s*,\s*/)
      .map((name) => name.trim().toLowerCase())
      .filter(Boolean)),
  );

  const sourceArtists = JSON.parse(
    await readFile(path.join(ROOT, ARTIST_FILES[0]), "utf8"),
  );
  const replacements = new Map();
  const unresolved = [];
  const skippedCategories = [];

  for (const artist of sourceArtists) {
    const key = String(artist.name || "").trim().toLowerCase();
    if (!performerNames.has(key) || !isLegacyWordPressImage(artist.image)) continue;
    if (NON_ARTIST_CATEGORIES.has(key)) {
      skippedCategories.push(artist.name);
      continue;
    }

    const existingSpotifyImage = primaryArtistImages.get(key);
    if (existingSpotifyImage) {
      replacements.set(key, existingSpotifyImage);
      continue;
    }

    try {
      const match = await searchArtist(artist.name);
      if (match) {
        replacements.set(key, match.image);
        console.log(`Spotify: ${artist.name} -> ${match.name}`);
      } else {
        unresolved.push(artist.name);
      }
    } catch (error) {
      unresolved.push(`${artist.name} (${error.message})`);
    }
  }

  if (!dryRun) {
    for (const rel of ARTIST_FILES) {
      const abs = path.join(ROOT, rel);
      const artists = JSON.parse(await readFile(abs, "utf8"));
      const next = artists.map((artist) => {
        const image = replacements.get(String(artist.name || "").trim().toLowerCase());
        return image ? { ...artist, image } : artist;
      });
      await writeFile(abs, `${JSON.stringify(next, null, 2)}\n`, "utf8");
    }
  }

  console.log(JSON.stringify({
    replaced: replacements.size,
    unresolved,
    skippedNonArtists: [...new Set(skippedCategories)],
    dryRun,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
