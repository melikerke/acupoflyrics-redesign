// CLI: npm run update:charts
// Fetches the automatable charts and rewrites src/data/musicLists.json.
// Reads Spotify credentials from .env (same keys the admin backend uses).

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { updateCharts } from "../server/charts.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function loadEnv() {
  const text = await readFile(path.join(ROOT, ".env"), "utf8").catch(() => "");
  const env = {};
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const i = trimmed.indexOf("=");
    env[trimmed.slice(0, i).trim()] = trimmed.slice(i + 1).trim();
  }
  return env;
}

const env = await loadEnv();
const result = await updateCharts({
  spotify: { clientId: env.SPOTIFY_CLIENT_ID, clientSecret: env.SPOTIFY_CLIENT_SECRET },
});

console.log(`Müzik listeleri güncellemesi — ${result.updated}`);
for (const list of result.lists) {
  console.log(list.ok ? `  ✓ ${list.name}: ${list.count} şarkı` : `  ✗ ${list.name}: ${list.error}`);
}
if (!result.changed) {
  console.log("Hiçbir liste güncellenemedi; mevcut veriler korundu.");
  process.exitCode = 1;
}
