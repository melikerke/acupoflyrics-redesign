// Server-side Genius client. Runs in Node so the access token stays out of the
// browser and so we can fetch the song page for lyrics (the Genius API itself
// does not return lyrics, and both the API and the page block browser CORS).

const API = "https://api.genius.com";
const TOKEN_URL = "https://api.genius.com/oauth/token";

let cachedToken = null; // { value, expiresAt }

// Genius supports the client_credentials grant for app-only (server) access:
// exchange the Client ID + Client Secret for a bearer token used on search/song
// endpoints. (A raw Client ID/Secret is NOT itself a valid bearer token.)
async function getToken(clientId, clientSecret) {
  if (!clientId || !clientSecret) {
    throw new Error(
      "Genius kimlik bilgileri eksik. .env dosyasına GENIUS_CLIENT_ID ve GENIUS_CLIENT_SECRET ekleyin."
    );
  }
  if (cachedToken && cachedToken.expiresAt > Date.now() + 5000) return cachedToken.value;
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Genius token hatası (${res.status}): ${t}`);
  }
  const data = await res.json();
  // client_credentials tokens are long-lived; cache for 50 min as a safety net.
  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + (data.expires_in ? data.expires_in * 1000 : 50 * 60 * 1000),
  };
  return cachedToken.value;
}

async function gget(path, token) {
  const res = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${token}`, "User-Agent": "acupoflyrics/1.0" },
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Genius API hatası (${res.status}): ${t}`);
  }
  return res.json();
}

// Loose normalisation so "ROSÉ" matches "Rose", "Messy (feat. X)" matches
// "Messy", etc. Strips bracketed/parenthetical bits, diacritics and punctuation.
function norm(s) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\(.*?\)|\[.*?\]/g, "")
    .replace(/feat\.?.*$/i, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreHit(hit, nTitle, nArtist) {
  const ht = norm(hit.title);
  const ha = norm(hit.primary_artist?.name);
  let score = 0;
  if (ht === nTitle) score += 3;
  else if (ht.includes(nTitle) || nTitle.includes(ht)) score += 1;
  if (ha === nArtist) score += 2;
  else if (ha.includes(nArtist) || nArtist.includes(ha)) score += 1;
  return score;
}

// Decode the handful of HTML entities Genius actually emits in lyrics.
function decodeEntities(str) {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)));
}

// Extract the inner HTML of every <div data-lyrics-container="true"> by
// balancing <div>/<\/div> from each opening tag — the containers nest other
// divs (annotations), so a non-greedy regex would cut off early.
function extractContainers(html) {
  const out = [];
  const startRe = /<div[^>]*data-lyrics-container="true"[^>]*>/g;
  let m;
  while ((m = startRe.exec(html))) {
    let depth = 1;
    const tagRe = /<\/?div\b[^>]*>/g;
    tagRe.lastIndex = m.index + m[0].length;
    let end = html.length;
    let t;
    while ((t = tagRe.exec(html))) {
      if (t[0].startsWith("</")) {
        depth--;
        if (depth === 0) {
          end = t.index;
          break;
        }
      } else {
        depth++;
      }
    }
    out.push(html.slice(m.index + m[0].length, end));
  }
  return out;
}

// The lyrics container wraps a nested <div data-exclude-from-selection="true">
// holding the contributors/translations header (and other non-lyric UI). Remove
// those balanced subtrees so only the actual lyrics survive.
function removeExcluded(html) {
  let out = html;
  for (;;) {
    const m = /<div[^>]*data-exclude-from-selection="true"[^>]*>/.exec(out);
    if (!m) break;
    let depth = 1;
    const tagRe = /<\/?div\b[^>]*>/g;
    tagRe.lastIndex = m.index + m[0].length;
    let endTagEnd = out.length;
    let t;
    while ((t = tagRe.exec(out))) {
      if (t[0].startsWith("</")) {
        depth--;
        if (depth === 0) {
          endTagEnd = tagRe.lastIndex;
          break;
        }
      } else {
        depth++;
      }
    }
    out = out.slice(0, m.index) + out.slice(endTagEnd);
  }
  return out;
}

async function scrapeLyrics(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });
  if (!res.ok) throw new Error(`Genius sayfası (${res.status})`);
  const html = await res.text();
  const containers = extractContainers(html).map(removeExcluded);
  if (!containers.length) return null;
  let text = containers.join("\n");
  text = text
    .replace(/<br\s*\/?>(\n)?/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "");
  text = decodeEntities(text);
  // Strip Genius's injected "You might also like" promo that sometimes lands
  // mid-lyrics, and a trailing "<count>Embed" footer.
  text = text
    .replace(/You might also like/g, "\n")
    .replace(/\d*Embed\s*$/i, "");
  // Collapse 3+ blank lines, trim trailing spaces per line.
  text = text
    .split("\n")
    .map((l) => l.replace(/\s+$/g, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return text || null;
}

export async function geniusMatch({ artist, title }, { clientId, clientSecret }) {
  if (!title) throw new Error("Genius araması için en azından şarkı adı gerekli.");
  const nTitle = norm(title);
  const nArtist = norm(artist);

  const token = await getToken(clientId, clientSecret);
  const search = await gget(`/search?q=${encodeURIComponent(`${artist || ""} ${title}`.trim())}`, token);
  const hits = (search.response?.hits || [])
    .filter((h) => h.type === "song")
    .map((h) => h.result);

  if (!hits.length) return { matched: false, candidates: [] };

  let best = hits[0];
  let bestScore = -1;
  for (const h of hits) {
    const s = scoreHit(h, nTitle, nArtist);
    if (s > bestScore) {
      bestScore = s;
      best = h;
    }
  }

  // Full song record for the richer metadata (album, release date, description).
  let song = null;
  try {
    const detail = await gget(`/songs/${best.id}`, token);
    song = detail.response?.song || null;
  } catch {
    song = null;
  }

  let lyrics = null;
  let lyricsError = null;
  try {
    lyrics = await scrapeLyrics(best.url);
  } catch (e) {
    lyricsError = e.message;
  }

  // Genius descriptions come as a dom tree; flatten to plain text.
  const description = flattenDom(song?.description?.dom) || null;

  return {
    matched: true,
    score: bestScore,
    song: {
      id: best.id,
      title: best.title,
      fullTitle: best.full_title,
      artist: best.primary_artist?.name || null,
      url: best.url,
      thumbnail: best.song_art_image_thumbnail_url || best.header_image_thumbnail_url || null,
      image: song?.song_art_image_url || best.song_art_image_url || null,
      releaseDate: song?.release_date_for_display || song?.release_date || null,
      album: song?.album?.name || null,
      pageviews: song?.stats?.pageviews ?? null,
    },
    description,
    lyrics,
    lyricsError,
    candidates: hits.slice(0, 6).map((h) => ({
      id: h.id,
      title: h.title,
      artist: h.primary_artist?.name || null,
      url: h.url,
      score: scoreHit(h, nTitle, nArtist),
    })),
  };
}

// Genius descriptions are a recursive { children: [...] } dom; pull the text.
function flattenDom(node) {
  if (!node) return "";
  if (typeof node === "string") return node;
  const children = node.children || [];
  let text = children.map(flattenDom).join("");
  if (node.tag === "p") text += "\n\n";
  return text.replace(/\n{3,}/g, "\n\n").trim();
}
