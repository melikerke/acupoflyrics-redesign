export function credentials() {
  return {
    spotify: {
      clientId: process.env.SPOTIFY_CLIENT_ID,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    },
    genius: {
      clientId: process.env.GENIUS_CLIENT_ID,
      clientSecret: process.env.GENIUS_CLIENT_SECRET,
    },
  };
}

export function sendJson(res, statusCode, body) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

export function method(req) {
  return String(req.method || "GET").toUpperCase();
}

export function requestUrl(req) {
  return new URL(req.url || "/", `https://${req.headers?.host || "acupoflyrics.local"}`);
}

export function assertMethod(req, allowed) {
  const current = method(req);
  if (!allowed.includes(current)) {
    const error = new Error(`Bu endpoint ${current} kabul etmiyor.`);
    error.statusCode = 405;
    throw error;
  }
}

export async function readJsonBody(req) {
  if (Object.prototype.hasOwnProperty.call(req, "body") && req.body != null) {
    if (typeof req.body === "string" || Buffer.isBuffer(req.body)) {
      const rawBody = String(req.body).trim();
      if (!rawBody) {
        const error = new Error("Yayın verisi boş geldi. Sayfayı yenileyip tekrar deneyin.");
        error.statusCode = 400;
        throw error;
      }
      try {
        return JSON.parse(rawBody);
      } catch {
        const error = new Error("Yayın verisi geçerli JSON değil. Sayfayı yenileyip tekrar deneyin.");
        error.statusCode = 400;
        throw error;
      }
    }
    return req.body;
  }
  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) {
    const error = new Error("Yayın verisi boş geldi. Sayfayı yenileyip tekrar deneyin.");
    error.statusCode = 400;
    throw error;
  }
  try {
    return JSON.parse(raw);
  } catch {
    const error = new Error("Yayın verisi geçerli JSON değil. Sayfayı yenileyip tekrar deneyin.");
    error.statusCode = 400;
    throw error;
  }
}

export function serverlessWriteError() {
  return {
    error:
      "Vercel canlı ortamı dosyaya kalıcı yazamaz. Yayınlamak için Vercel Environment Variables içine GITHUB_TOKEN eklememiz gerekiyor.",
  };
}
