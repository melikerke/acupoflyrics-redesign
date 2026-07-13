import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const POST_FILES = ["src/data/posts.json", "data/content/posts.json"];
const ARTIST_FILES = ["src/data/artists.json", "data/content/artists.json"];

const CREDIT_FIXES = new Map([
  ...[
    "chanyeol-clover-turkce-ceviri",
    "chanyeol-im-on-your-side-too-turkce-ceviri",
    "chanyeol-back-again-turkce-ceviri",
    "chanyeol-ease-up-turkce-ceviri",
    "chanyeol-hasta-la-vista-turkce-ceviri",
    "chanyeol-black-out-turkce-ceviri",
  ].map((slug) => [slug, {
    artist: "CHANYEOL",
    categories: ["CHANYEOL", "Black Out", "EXO"],
    category_slugs: ["chanyeol", "black-out", "exo"],
  }]),
  ...[
    "jin-in-longing-turkce-ceviri",
    "jin-until-i-reach-you-turkce-ceviri",
    "jin-another-level-turkce-ceviri",
    "jin-running-wild-turkce-ceviri",
  ].map((slug) => [slug, {
    artist: "JIN",
    categories: ["JIN", "Happy"],
    category_slugs: ["jin", "happy"],
  }]),
  ["jin-wendy-heart-on-the-window-turkce-ceviri", {
    artist: "JIN, WENDY",
    categories: ["JIN", "WENDY", "Happy"],
    category_slugs: ["jin", "wendy", "happy"],
  }],
  ...[
    "felix-unfair-turkce-ceviri",
    "bang-chan-railway-turkce-ceviri",
  ].map((slug) => [slug, {
    artist: "Stray Kids",
    categories: ["Stray Kids", "HOP"],
    category_slugs: ["stray-kids", "hop"],
  }]),
  ["misamo-new-look-turkce-ceviri", {
    artist: "MISAMO",
    categories: ["MISAMO", "HAUTE COUTURE", "TWICE"],
    category_slugs: ["misamo", "haute-couture", "twice"],
  }],
  ["tzuyu-run-away-turkce-ceviri", {
    artist: "TZUYU",
    categories: ["TZUYU", "abouTZU", "TWICE"],
    category_slugs: ["tzuyu", "aboutzu", "twice"],
  }],
]);

const REQUIRED_ARTISTS = [
  {
    slug: "chanyeol",
    name: "CHANYEOL",
    count: 6,
    image: "https://i.scdn.co/image/ab6761610000e5ebad793cef19a94d1a6bf73cd6",
  },
  {
    slug: "wendy",
    name: "WENDY",
    count: 1,
    image: "https://i.scdn.co/image/ab6761610000e5eb9a2756203f547d1a758ede7a",
  },
  {
    slug: "misamo",
    name: "MISAMO",
    count: 1,
    image: "https://i.scdn.co/image/ab6761610000e5eb5177c8768acaa8f5bd1c22d6",
  },
  {
    slug: "tzuyu",
    name: "TZUYU",
    count: 1,
    image: "https://i.scdn.co/image/ab6761610000e5ebe039b9b9ba211f98b42eb0d5",
  },
];

async function updatePosts(rel) {
  const abs = path.join(ROOT, rel);
  const posts = JSON.parse(await readFile(abs, "utf8"));
  let changed = 0;
  const next = posts.map((post) => {
    const fix = CREDIT_FIXES.get(post.slug);
    if (!fix) return post;
    changed += 1;
    return { ...post, ...fix };
  });
  await writeFile(abs, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  return changed;
}

async function updateArtists(rel) {
  const abs = path.join(ROOT, rel);
  const artists = JSON.parse(await readFile(abs, "utf8"));
  const next = [...artists];
  for (const required of REQUIRED_ARTISTS) {
    const index = next.findIndex((artist) => artist.slug === required.slug);
    if (index >= 0) next[index] = { ...next[index], ...required };
    else next.push(required);
  }
  await writeFile(abs, `${JSON.stringify(next, null, 2)}\n`, "utf8");
}

const changed = [];
for (const rel of POST_FILES) changed.push([rel, await updatePosts(rel)]);
for (const rel of ARTIST_FILES) await updateArtists(rel);

console.log(JSON.stringify({ changed, artistsAddedOrUpdated: REQUIRED_ARTISTS.map((a) => a.name) }, null, 2));
