// Automatic chart updates for /listeler (src/data/musicLists.json).
//
// Sources:
//   billboard-hot-100 / billboard-200 → billboard.com HTML (parsed, no key)
//   apple-music-top-100              → Apple Marketing Tools RSS (no key)
//   circle-chart                     → Circle Chart page JSON (no key)
//   spotify-global-50                → Spotify Web API playlist, falls back to public chart HTML
//
// Every fetcher fails gracefully: a list keeps its previous entries when its
// source can't be reached, and the summary explains what happened.

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { searchTrackMeta, spotifyApiGet } from "./spotify.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA_FILE = path.join(ROOT, "src/data/musicLists.json");
const LIMIT = 10;
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const SPOTIFY_GLOBAL_TOP_50 = "37i9dQZEVXbMDoHDwVN2tF";
const APPLE_GLOBAL_TOP_100 = "https://music.apple.com/us/playlist/top-100-global/pl.d25f5d1181894928af76c85c967f8f31";
const CIRCLE = "https://circlechart.kr";
const FETCH_TIMEOUT_MS = 15000;

function decodeEntities(value) {
  return String(value)
    .replace(/&amp;/g, "&")
    .replace(/&quot;|&#8220;|&#8221;/g, '"')
    .replace(/&#0?39;|&#8217;|&apos;/g, "'")
    .replace(/&#8211;/g, "–")
    .replace(/\s+/g, " ")
    .trim();
}

function stripTags(value) {
  return decodeEntities(String(value).replace(/<[^>]+>/g, " "));
}

async function fetchWithTimeout(url, options = {}, timeoutMs = FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (error?.name === "AbortError") throw new Error(`${url} zaman aşımına uğradı`);
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function withTimeout(promise, label, timeoutMs = FETCH_TIMEOUT_MS) {
  let timeout;
  const timer = new Promise((_, reject) => {
    timeout = setTimeout(() => reject(new Error(`${label} zaman aşımına uğradı`)), timeoutMs);
  });
  try {
    return await Promise.race([promise, timer]);
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchJson(url, options) {
  const res = await fetchWithTimeout(url, options);
  if (!res.ok) throw new Error(`${url} ${res.status}`);
  return res.json();
}

async function postCircle(pathname, data, referer) {
  return fetchJson(`${CIRCLE}${pathname}`, {
    method: "POST",
    headers: {
      "User-Agent": UA,
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      "X-Requested-With": "XMLHttpRequest",
      Referer: referer,
    },
    body: new URLSearchParams(data),
  });
}

async function fetchBillboard(chart) {
  const res = await fetchWithTimeout(`https://www.billboard.com/charts/${chart}/`, {
    headers: { "User-Agent": UA, Accept: "text/html" },
  });
  if (!res.ok) throw new Error(`billboard.com ${res.status}`);
  const html = await res.text();
  // Billboard reuses `title-of-a-story` inside detail/credits blocks, so parse
  // by chart row first and then take the first song title + artist in that row.
  const rowRe = /<div class="o-chart-results-list-row-container">([\s\S]*?)(?=<div class="o-chart-results-list-row-container">|<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<footer)/g;
  const entries = [];
  let match;
  while ((match = rowRe.exec(html)) && entries.length < LIMIT) {
    const row = match[1];
    const title = row.match(/<h3[^>]*id="title-of-a-story"[^>]*>\s*([\s\S]*?)\s*<\/h3>/);
    const artist = row.match(/<span[^>]*class="[^"]*c-label\s+a-no-trucate[^"]*"[^>]*>\s*([\s\S]*?)\s*<\/span>/);
    if (!title || !artist) continue;
    entries.push({
      rank: entries.length + 1,
      title: stripTags(title[1]),
      artist: stripTags(artist[1]),
    });
  }
  if (entries.length < LIMIT) {
    throw new Error(`sayfa yapısı çözümlenemedi (${entries.length}/${LIMIT} satır) — Billboard markup değişmiş olabilir`);
  }
  const sourceDate = html.match(/id="chart-date-picker"\s+data-date="(\d{4}-\d{2}-\d{2})"/)?.[1] || null;
  return { entries, updated: sourceDate };
}

async function fetchAppleGlobalMostPlayed() {
  const res = await fetchWithTimeout(APPLE_GLOBAL_TOP_100, {
    headers: { "User-Agent": UA, Accept: "text/html" },
  });
  if (!res.ok) throw new Error(`Apple Music Global ${res.status}`);
  const html = await res.text();
  const serializedText = html.match(
    /<script[^>]*id=["']serialized-server-data["'][^>]*>([\s\S]*?)<\/script>/i,
  )?.[1];
  if (!serializedText) throw new Error("Apple Music Global sayfa verisi bulunamadı");

  let serialized;
  try {
    serialized = JSON.parse(serializedText);
  } catch {
    throw new Error("Apple Music Global sayfa verisi çözümlenemedi");
  }
  const sections = serialized?.data?.[0]?.data?.sections || [];
  const trackSection = sections.find((section) => (
    Array.isArray(section?.items)
    && section.items.some((item) => item?.contentDescriptor?.kind === "song" && item?.rankingText)
  ));
  const results = (trackSection?.items || []).filter((item) => (
    item?.contentDescriptor?.kind === "song" && item?.title
  ));
  if (results.length < LIMIT) {
    throw new Error(`Apple Music Global boş/eksik döndü (${results.length}/${LIMIT})`);
  }
  const sourceDate = html.match(/"datePublished":"([^"]+)"/)?.[1] || null;
  return {
    updated: sourceDate ? new Date(sourceDate).toISOString().slice(0, 10) : null,
    entries: results.slice(0, LIMIT).map((song, index) => ({
      rank: Number(song.rankingText) || index + 1,
      title: song.title,
      artist: song.artistName || song.subtitleLinks?.map((link) => link.title).filter(Boolean).join(" & ") || "",
    })),
  };
}

async function fetchCircleGlobalKpop() {
  const referer = `${CIRCLE}/page_chart/global.circle?termGbn=day`;
  const defaults = await postCircle(
    "/data/api/chart_func/global/default_value",
    { termGbn: "day" },
    referer,
  );
  const yyyymmdd = defaults?.List?.[0]?.YYYYMMDD;
  if (!yyyymmdd) throw new Error("Circle Chart varsayılan tarihi alınamadı");

  const data = await postCircle("/data/api/chart/global", { termGbn: "day", yyyymmdd }, referer);
  const rows = Object.values(data?.List || {})
    .sort((a, b) => Number(a.Rank) - Number(b.Rank))
    .slice(0, LIMIT);

  if (rows.length < LIMIT) throw new Error(`Circle Chart boş/eksik döndü (${rows.length}/${LIMIT})`);
  return {
    updated: `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`,
    entries: rows.map((row, index) => ({
      rank: Number(row.Rank) || index + 1,
      title: decodeEntities(row.Title),
      artist: decodeEntities(row.Artist),
    })),
  };
}

function parseKworbTitle(raw) {
  const text = stripTags(raw);
  const [artistPart, ...titleParts] = text.split(" - ");
  const titleWithFeature = titleParts.join(" - ");
  const feature = titleWithFeature.match(/\s+\((?:w\/|with)\s+(.+?)\)$/i);
  const title = feature ? titleWithFeature.slice(0, feature.index).trim() : titleWithFeature.trim();
  const artist = feature ? `${artistPart.trim()} & ${feature[1].trim()}` : artistPart.trim();
  return { title, artist };
}

function trackKey(entry) {
  return `${entry.artist || ""}\u0000${entry.title || ""}`
    .normalize("NFKC")
    .toLocaleLowerCase("en-US")
    .replace(/\s+/g, " ")
    .trim();
}

function currentSiteDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

async function fetchSpotifyGlobalFallback() {
  const res = await fetchWithTimeout("https://kworb.net/spotify/country/global_daily.html", {
    headers: { "User-Agent": UA, Accept: "text/html" },
  });
  if (!res.ok) throw new Error(`Kworb Spotify ${res.status}`);
  const html = await res.text();
  const rowRe = /<tr[^>]*>\s*<td[^>]*>\s*(\d+)\s*<\/td>[\s\S]*?<td[^>]*class="text mp"[^>]*>\s*<div>([\s\S]*?)<\/div>/g;
  const entries = [];
  let match;
  while ((match = rowRe.exec(html)) && entries.length < LIMIT) {
    const parsed = parseKworbTitle(match[2]);
    if (parsed.title && parsed.artist) {
      entries.push({
        rank: Number(match[1]) || entries.length + 1,
        title: parsed.title,
        artist: parsed.artist,
      });
    }
  }
  if (entries.length < LIMIT) throw new Error(`Spotify fallback çözümlenemedi (${entries.length}/${LIMIT})`);
  const sourceDate = html.match(/Spotify Daily Chart - Global - (\d{4})\/(\d{2})\/(\d{2})/i);
  return {
    updated: sourceDate ? `${sourceDate[1]}-${sourceDate[2]}-${sourceDate[3]}` : null,
    entries,
  };
}

async function fetchSpotifyGlobal(spotifyCreds) {
  try {
    const data = await withTimeout(
      spotifyApiGet(
        `/playlists/${SPOTIFY_GLOBAL_TOP_50}/tracks?limit=${LIMIT}&fields=items(track(name,artists(name),album(name,images,external_urls),external_urls))`,
        spotifyCreds,
      ),
      "Spotify Global Top 50",
    );
    const items = (data?.items || []).filter((item) => item?.track?.name);
    if (!items.length) throw new Error("Spotify listesi boş döndü");
    return items.slice(0, LIMIT).map((item, index) => ({
      rank: index + 1,
      title: item.track.name,
      artist: item.track.artists.map((a) => a.name).join(" & "),
      cover: item.track.album?.images?.slice().sort((a, b) => (b.width || 0) - (a.width || 0))[0]?.url || null,
      spotifyUrl: item.track.external_urls?.spotify || null,
      album: item.track.album?.name || null,
      albumUrl: item.track.album?.external_urls?.spotify || null,
    }));
  } catch (e) {
    return fetchSpotifyGlobalFallback();
  }
}

async function enrichEntriesWithSpotify(entries, spotifyCreds) {
  if (!spotifyCreds?.clientId || !spotifyCreds?.clientSecret) return entries;
  const enriched = [];
  for (const entry of entries) {
    if (entry.cover) {
      enriched.push(entry);
      continue;
    }
    try {
      const match = await withTimeout(
        searchTrackMeta(
          { artist: entry.artist, title: entry.title },
          { clientId: spotifyCreds.clientId, clientSecret: spotifyCreds.clientSecret },
        ),
        `Spotify metadata: ${entry.artist} - ${entry.title}`,
      );
      enriched.push(
        match.matched
          ? {
              ...entry,
              cover: match.cover,
              spotifyUrl: match.spotifyUrl,
              album: match.album,
              albumUrl: match.albumUrl,
            }
          : entry,
      );
    } catch {
      enriched.push(entry);
    }
  }
  return enriched;
}

// Fetch every automatable list and rewrite musicLists.json.
// Returns { updated, lists: [{ id, name, ok, count?, error? }] }.
export async function updateCharts({ spotify, write = true } = {}) {
  const store = JSON.parse(await readFile(DATA_FILE, "utf8"));
  const updateDate = currentSiteDate();
  const previousStoreUpdated = store.updated;
  for (const list of store.lists) {
    // Older data only had one global date. Keep it as the starting point so a
    // failed source never appears to have been refreshed with another list.
    list.updated ||= previousStoreUpdated;
  }

  const fetchers = {
    "billboard-hot-100": () => fetchBillboard("hot-100"),
    "billboard-200": () => fetchBillboard("billboard-200"),
    "circle-chart": () => fetchCircleGlobalKpop(),
    "apple-music-top-100": () => fetchAppleGlobalMostPlayed(),
    "spotify-global-50": () => fetchSpotifyGlobal(spotify),
  };

  const summary = [];
  let changed = false;

  for (const list of store.lists) {
    const fetcher = fetchers[list.id];
    if (!fetcher) {
      summary.push({ id: list.id, name: list.name, ok: false, error: "Elle güncellenir (otomatik kaynak yok)." });
      continue;
    }
    try {
      const previousByTrack = new Map(list.entries.map((entry) => [trackKey(entry), entry]));
      const fetched = await withTimeout(fetcher(), list.name);
      const entries = Array.isArray(fetched) ? fetched : fetched?.entries;
      if (!Array.isArray(entries) || entries.length < LIMIT) {
        throw new Error(`kaynak boş/eksik döndü (${entries?.length || 0}/${LIMIT})`);
      }
      const enrichedEntries = await enrichEntriesWithSpotify(entries, spotify);
      list.entries = enrichedEntries.map((entry) => {
        const previous = previousByTrack.get(trackKey(entry));
        return previous ? { ...previous, ...entry } : entry;
      });
      list.updated = (!Array.isArray(fetched) && fetched.updated) || updateDate;
      changed = true;
      summary.push({
        id: list.id,
        name: list.name,
        ok: true,
        count: list.entries.length,
        covers: list.entries.filter((entry) => entry.cover).length,
        updated: list.updated,
      });
    } catch (e) {
      summary.push({ id: list.id, name: list.name, ok: false, error: e.message || "bilinmeyen hata" });
    }
  }

  if (changed) {
    store.updated = updateDate;
    if (write) {
      await writeFile(DATA_FILE, `${JSON.stringify(store, null, 2)}\n`, "utf8");
    }
  }

  return { updated: store.updated, changed, lists: summary };
}
