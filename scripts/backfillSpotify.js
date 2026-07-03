import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadEnv } from "vite";
import { searchTrackBundle } from "../server/spotify.js";

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

function flatSpotify(bundle) {
  const cover = bundle.album?.cover || null;
  return {
    ...bundle,
    trackUrl: bundle.track?.url || null,
    albumUrl: bundle.album?.url || null,
    artistUrl: bundle.artist?.url || null,
    albumName: bundle.album?.name || null,
    albumType: bundle.album?.albumType || null,
    releaseDate: bundle.album?.releaseDate || null,
    duration: bundle.track?.duration || null,
    isrc: bundle.track?.isrc || null,
    label: bundle.album?.label || null,
    coverUrl: cover,
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
      const result = await searchTrackBundle(
        { artist: post.artist, title: post.song },
        { clientId: env.SPOTIFY_CLIENT_ID, clientSecret: env.SPOTIFY_CLIENT_SECRET }
      );
      if (!result.matched) {
        console.log(`skip: ${post.artist} - ${post.song}`);
        nextPosts.push(post);
        await sleep(90);
        continue;
      }

      matched += 1;
      const spotify = flatSpotify(result.bundle);
      const cover = spotify.album?.cover || post.cover || post.image;
      nextPosts.push({
        ...post,
        image: cover,
        cover,
        spotify,
        source: post.source || "wordpress-spotify",
      });
      console.log(`match: ${post.artist} - ${post.song} -> ${result.bundle.track.name}`);
    } catch (error) {
      console.log(`error: ${post.artist} - ${post.song}: ${error.message}`);
      nextPosts.push(post);
    }
    await sleep(90);
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
