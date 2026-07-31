import { readFile, writeFile } from "node:fs/promises";
import { geniusMatch } from "../server/genius.js";

const INPUT = "/tmp/acupoflyrics-release-batch-2026-07-31.json";

function parseEnv(text) {
  return Object.fromEntries(text.split(/\r?\n/).map((line) => {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match) return null;
    return [match[1], match[2].replace(/^['\"]|['\"]$/g, "")];
  }).filter(Boolean));
}

const env = parseEnv(await readFile(".env", "utf8"));
const credentials = { clientId: env.GENIUS_CLIENT_ID, clientSecret: env.GENIUS_CLIENT_SECRET };
const data = JSON.parse(await readFile(INPUT, "utf8"));

function cleanTitle(value) {
  return String(value || "")
    .replace(/\s+-\s+from\s+.+$/i, "")
    .replace(/\s+\((?:with|feat\.?)[^)]+\)\s*$/i, "")
    .replace(/\s+feat\.?\s+.+$/i, "")
    .trim();
}

let cursor = 0;
async function worker() {
  while (cursor < data.tracks.length) {
    const index = cursor;
    cursor += 1;
    const track = data.tracks[index];
    const artist = track.artists[0]?.name || "";
    const title = cleanTitle(track.name);
    try {
      const result = await geniusMatch({ artist, title }, credentials);
      const accepted = result.matched && result.score >= 5 && result.lyrics?.trim();
      track.genius = {
        matched: !!accepted,
        score: result.score ?? null,
        song: result.song || null,
        description: result.description || null,
        lyrics: accepted ? result.lyrics.trim() : null,
        candidates: result.candidates || [],
        error: result.lyricsError || null,
      };
      console.log(`${index + 1}/${data.tracks.length} ${artist} — ${title}: ${accepted ? "tam söz" : "eşleşmedi"}`);
    } catch (error) {
      track.genius = { matched: false, error: error.message };
      console.log(`${index + 1}/${data.tracks.length} ${artist} — ${title}: hata`);
    }
  }
}

await Promise.all(Array.from({ length: 3 }, () => worker()));
await writeFile(INPUT, `${JSON.stringify(data, null, 2)}\n`, "utf8");
const found = data.tracks.filter((track) => track.genius?.matched).length;
console.log(JSON.stringify({ tracks: data.tracks.length, geniusLyrics: found, missing: data.tracks.length - found, output: INPUT }, null, 2));
