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
  if (req.body) {
    return typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  }
  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

export function serverlessWriteError() {
  return {
    error:
      "Vercel canlı ortamı veri çekebilir; ancak dosyaya kalıcı yazamaz. Kalıcı yayın için GitHub commit veya CMS bağlantısı kurmamız gerekiyor.",
  };
}
