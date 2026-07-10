// Vite plugin that serves the project's tiny backend (/api/*) inside both the
// dev server (`npm run dev`) and the preview server (`npm run preview`). This
// keeps the Spotify secret and Genius token in Node and sidesteps browser CORS.

import { fetchTrackBundle, searchTrackBundle } from "./spotify.js";
import { geniusMatch } from "./genius.js";
import { preparePublishRecord, writePublishData } from "./ingest.js";

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => {
      data += c;
      if (data.length > 8_000_000) reject(new Error("İstek gövdesi çok büyük."));
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

function parseRequestJson(raw) {
  const text = String(raw || "").trim();
  if (!text) {
    const error = new Error("Yayın verisi boş geldi. Sayfayı yenileyip tekrar deneyin.");
    error.statusCode = 400;
    throw error;
  }
  try {
    return JSON.parse(text);
  } catch {
    const error = new Error("Yayın verisi geçerli JSON değil. Sayfayı yenileyip tekrar deneyin.");
    error.statusCode = 400;
    throw error;
  }
}

export function apiPlugin(env) {
  const spotify = {
    clientId: env.SPOTIFY_CLIENT_ID,
    clientSecret: env.SPOTIFY_CLIENT_SECRET,
  };
  const genius = {
    clientId: env.GENIUS_CLIENT_ID,
    clientSecret: env.GENIUS_CLIENT_SECRET,
  };

  const handler = async (req, res, next) => {
    let url;
    try {
      url = new URL(req.url, "http://localhost");
    } catch {
      return next();
    }
    if (!url.pathname.startsWith("/api/")) return next();

    try {
      if (url.pathname === "/api/spotify/track") {
        const link = url.searchParams.get("url");
        const data = await fetchTrackBundle(link, spotify);
        return send(res, 200, data);
      }

      if (url.pathname === "/api/spotify/search") {
        const artist = url.searchParams.get("artist") || "";
        const title = url.searchParams.get("title") || "";
        const data = await searchTrackBundle({ artist, title }, spotify);
        return send(res, 200, data);
      }

      if (url.pathname === "/api/genius/match") {
        const artist = url.searchParams.get("artist") || "";
        const title = url.searchParams.get("title") || "";
        const data = await geniusMatch({ artist, title }, genius);
        return send(res, 200, data);
      }

      if (url.pathname === "/api/charts/refresh" && req.method === "POST") {
        const { updateCharts } = await import("./charts.js");
        const result = await updateCharts({ spotify });
        return send(res, 200, result);
      }

      if (url.pathname === "/api/publish" && req.method === "POST") {
        const raw = await readBody(req);
        const record = parseRequestJson(raw);
        const updated = await preparePublishRecord(record);
        res.once("finish", () => {
          setTimeout(() => {
            writePublishData(updated).catch((error) => {
              console.error("Local publish write failed", error);
            });
          }, 5000);
        });
        send(res, 200, updated.result);
        return;
      }

      if (url.pathname === "/api/comments" && req.method === "GET") {
        const { listComments } = await import("./commentsStore.js");
        const comments = await listComments(url.searchParams.get("slug") || "");
        return send(res, 200, { comments });
      }

      if (url.pathname === "/api/comments" && req.method === "POST") {
        const { addComment } = await import("./commentsStore.js");
        const raw = await readBody(req);
        const comment = await addComment(parseRequestJson(raw));
        return send(res, 201, { comment });
      }

      return send(res, 404, { error: "Bilinmeyen uç nokta." });
    } catch (e) {
      // Surface the message to the admin UI so the translator can see what broke.
      return send(res, e.statusCode || 500, { error: e.message || "Sunucu hatası." });
    }
  };

  return {
    name: "acupoflyrics-api",
    configureServer(server) {
      server.middlewares.use(handler);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler);
    },
  };
}
