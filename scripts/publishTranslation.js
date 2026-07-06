import { readFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fetchTrackBundle } from "../server/spotify.js";
import { geniusMatch } from "../server/genius.js";
import { publishRecord } from "../server/ingest.js";

function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    const abs = path.join(process.cwd(), file);
    if (!existsSync(abs)) continue;
    const lines = readFileSync(abs, "utf8").split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (!match) continue;
      const [, key, rawValue] = match;
      if (process.env[key]) continue;
      process.env[key] = rawValue.trim().replace(/^["']|["']$/g, "");
    }
  }
}

function parseArgs(argv) {
  const args = { commit: false, push: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--commit") {
      args.commit = true;
    } else if (arg === "--push") {
      args.commit = true;
      args.push = true;
    } else if (arg.startsWith("--")) {
      const key = arg.slice(2);
      args[key] = argv[i + 1];
      i += 1;
    }
  }
  return args;
}

function usage() {
  return [
    "Kullanım:",
    '  npm run publish:translation -- --spotify "SPOTIFY_LINK" --translation "/dosya/ceviri.txt" [--lyrics "/dosya/orijinal.txt"] [--commit] [--push]',
    "",
    "Çeviri dosyası formatı:",
    "  [Verse 1]",
    "  Türkçe satırlar...",
    "  ||| kelime: açıklama",
  ].join("\n");
}

function parseStanzas(text) {
  return (text || "")
    .split(/\n\s*\n/)
    .map((block) => block.split("\n").map((line) => line.trim()).filter(Boolean))
    .filter((lines) => lines.length)
    .map((lines) => {
      const heading = lines[0].match(/^\[(.+)\]$/);
      if (heading) return { section: heading[1], lines: lines.slice(1) };
      return { section: null, lines };
    })
    .filter((stanza) => stanza.section || stanza.lines.length);
}

function normaliseSection(section) {
  return (section || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function parseNoteLine(line) {
  const raw = line.replace(/^\s*\|\|\|\s*/, "").trim();
  const colon = raw.indexOf(":");
  if (colon < 0) return { word: "", text: raw };
  return {
    word: raw.slice(0, colon).trim().replace(/^["“”']+|["“”']+$/g, ""),
    text: raw.slice(colon + 1).trim(),
  };
}

function parseTranslationBlocks(text) {
  const blocks = [];
  let current = null;

  for (const rawLine of (text || "").split("\n")) {
    const line = rawLine.trim();
    const heading = line.match(/^\[(.+?)\]$/);
    if (heading) {
      current = { section: heading[1].trim(), lines: [], notes: [] };
      blocks.push(current);
      continue;
    }
    if (!current) {
      if (!line) continue;
      current = { section: null, lines: [], notes: [] };
      blocks.push(current);
    }
    if (line.startsWith("|||")) {
      current.notes.push(parseNoteLine(line));
    } else {
      current.lines.push(rawLine.replace(/\s+$/g, ""));
    }
  }

  return blocks
    .map((block) => ({
      ...block,
      lines: block.lines.join("\n").trim(),
      notes: block.notes.filter((note) => note.text),
    }))
    .filter((block) => block.section || block.lines || block.notes.length);
}

function buildTranslatedStanzas(originalLyrics, translationText) {
  const originals = parseStanzas(originalLyrics);
  if (!originals.length) throw new Error("Orijinal sözlerde kıta bulunamadı.");

  const translations = parseTranslationBlocks(translationText);
  if (!translations.length) throw new Error("Çeviri dosyasında kıta bulunamadı.");

  const bySection = new Map();
  translations.forEach((block, index) => {
    const key = normaliseSection(block.section);
    if (!bySection.has(key)) bySection.set(key, []);
    bySection.get(key).push(index);
  });

  const used = new Set();
  const stanzas = originals.map((stanza) => {
    const key = normaliseSection(stanza.section);
    let blockIndex = bySection.get(key)?.find((index) => !used.has(index)) ?? -1;
    if (blockIndex < 0) blockIndex = translations.findIndex((_, index) => !used.has(index));
    const block = blockIndex >= 0 ? translations[blockIndex] : null;
    if (blockIndex >= 0) used.add(blockIndex);
    const note = block?.notes?.[0];
    return {
      section: stanza.section || block?.section || null,
      original: stanza.lines,
      translation: block?.lines ? block.lines.split("\n") : [],
      note: note ? { word: note.word || null, text: note.text } : null,
    };
  });

  const missing = stanzas.filter((stanza) => !stanza.translation.length).length;
  if (missing) {
    throw new Error(`${missing} kıtaya çeviri yerleşmedi. Başlıkları veya boş satırları kontrol et.`);
  }

  return {
    stanzas,
    matched: stanzas.length,
    unmatched: translations.length - used.size,
  };
}

function run(command, args, label) {
  console.log(`\n> ${[command, ...args].join(" ")}`);
  const result = spawnSync(command, args, { stdio: "inherit", shell: false });
  if (result.status !== 0) {
    throw new Error(`${label || command} başarısız oldu.`);
  }
}

async function main() {
  loadEnv();
  const args = parseArgs(process.argv.slice(2));
  if (!args.spotify || !args.translation) {
    console.log(usage());
    process.exit(1);
  }

  const spotify = {
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  };
  const genius = {
    clientId: process.env.GENIUS_CLIENT_ID,
    clientSecret: process.env.GENIUS_CLIENT_SECRET,
  };

  console.log("Spotify bilgileri çekiliyor...");
  const bundle = await fetchTrackBundle(args.spotify, spotify);
  console.log(`Spotify: ${bundle.artist?.name} - ${bundle.track?.name}`);

  console.log("Genius eşleşmesi aranıyor...");
  let geniusData = null;
  try {
    geniusData = await geniusMatch({ artist: bundle.artist?.name, title: bundle.track?.name }, genius);
  } catch (error) {
    console.warn(`Genius araması atlandı: ${error.message}`);
  }

  let lyrics = "";
  if (args.lyrics) {
    lyrics = await readFile(args.lyrics, "utf8");
  } else if (geniusData?.lyrics) {
    lyrics = geniusData.lyrics;
  }

  if (!lyrics.trim()) {
    throw new Error(
      "Genius sözleri otomatik çekemedi. Orijinal sözleri bir .txt dosyasına koyup komuta --lyrics dosya.txt ekle."
    );
  }

  const translationText = await readFile(args.translation, "utf8");
  const aligned = buildTranslatedStanzas(lyrics, translationText);
  console.log(`${aligned.matched} kıta eşleşti${aligned.unmatched ? `, ${aligned.unmatched} çeviri bloğu dışarıda kaldı` : ""}.`);

  const record = {
    song: bundle.track?.name || null,
    artist: bundle.artist?.name || null,
    spotify: bundle,
    genius: geniusData?.matched
      ? { url: geniusData.song?.url, songId: geniusData.song?.id, description: geniusData.description }
      : null,
    stanzas: aligned.stanzas,
    youtubeUrl: args.youtube || null,
    translatorNote: null,
    savedAt: new Date().toISOString(),
  };

  const result = await publishRecord(record);
  console.log(`\nYazıldı: ${result.title}`);
  console.log(`URL: /${result.slug}/`);

  if (args.commit) {
    run("npm", ["run", "build"], "build");
    run("git", ["add", "src/data", "data/content", "public/data", "public/sitemap.xml", "public/feed.xml", "public/_redirects"], "git add");
    run("git", ["commit", "-m", `${result.updated ? "Update" : "Add"} ${result.title}`], "git commit");
  }

  if (args.push) {
    run("git", ["push"], "git push");
    console.log("\nGitHub'a gönderildi. Vercel deploy'u otomatik başlayacak.");
  } else if (args.commit) {
    console.log("\nCommit hazır. Canlıya almak için: git push");
  } else {
    console.log("\nDosyalar yazıldı. Kontrol sonrası build/commit/push yapabilirsin.");
  }
}

main().catch((error) => {
  console.error(`\nHata: ${error.message}`);
  process.exit(1);
});
