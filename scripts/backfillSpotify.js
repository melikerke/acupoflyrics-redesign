import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadEnv } from "vite";
import { searchTrackMeta } from "../server/spotify.js";

const ROOT = process.cwd();
const POST_FILES = ["src/data/posts.json", "data/content/posts.json"];
const env = loadEnv("development", ROOT, "");
const force = process.argv.includes("--force");
const dryRun = process.argv.includes("--dry-run");
const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
const limit = limitArg ? Number(limitArg.split("=")[1]) : Infinity;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function flatSpotifyMeta(meta) {
  return {
    track: {
      id: meta.id,
      name: meta.title,
      url: meta.spotifyUrl,
    },
    artist: { name: meta.artist },
    album: {
      name: meta.album,
      url: meta.albumUrl,
      cover: meta.cover,
    },
    trackUrl: meta.spotifyUrl,
    albumUrl: meta.albumUrl,
    albumName: meta.album,
    coverUrl: meta.cover,
    fetchedAt: new Date().toISOString(),
  };
}

async function main() {
  const postsPath = path.join(ROOT, POST_FILES[0]);
  const posts = JSON.parse(await readFile(postsPath, "utf8"));
  let attempted = 0;
  let matched = 0;
  let skipped = 0;

  const nextPosts = [];
  for (const post of posts) {
    if (attempted >= limit) {
      nextPosts.push(post);
      continue;
    }
    if (!force && post.spotify?.track?.id) {
      skipped += 1;
      nextPosts.push(post);
      continue;
    }

    attempted += 1;
    try {
      const result = await searchTrackMeta(
        { artist: post.artist, title: post.song },
        { clientId: env.SPOTIFY_CLIENT_ID, clientSecret: env.SPOTIFY_CLIENT_SECRET }
      );
      if (!result.matched) {
        console.log(`skip: ${post.artist} - ${post.song}`);
        nextPosts.push(post);
        await sleep(700);
        continue;
      }

      matched += 1;
      const spotify = flatSpotifyMeta(result);
      const cover = spotify.album?.cover || post.cover || post.image;
      nextPosts.push({
        ...post,
        image: cover,
        cover,
        spotify,
        source: post.source || "wordpress-spotify",
      });
      console.log(`match: ${post.artist} - ${post.song} -> ${result.title}`);
    } catch (error) {
      console.log(`error: ${post.artist} - ${post.song}: ${error.message}`);
      nextPosts.push(post);
    }
    await sleep(700);
  }

  if (!dryRun) {
    const json = JSON.stringify(nextPosts, null, 2);
    for (const rel of POST_FILES) {
      await writeFile(path.join(ROOT, rel), json, "utf8");
    }
  }

  console.log(JSON.stringify({ attempted, matched, skipped, dryRun }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
