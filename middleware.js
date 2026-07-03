import { next } from "@vercel/functions";

export const config = {
  matcher: ["/admin/:path*", "/api/:path*"],
  runtime: "nodejs",
};

function unauthorized() {
  return new Response("Authentication required.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="acupoflyrics admin", charset="UTF-8"',
      "Cache-Control": "no-store",
    },
  });
}

function readBasicAuth(request) {
  const header = request.headers.get("authorization") || "";
  const [scheme, encoded] = header.split(" ");
  if (scheme !== "Basic" || !encoded) return null;

  try {
    const decoded = Buffer.from(encoded, "base64").toString("utf8");
    const separator = decoded.indexOf(":");
    if (separator < 0) return null;
    return {
      username: decoded.slice(0, separator),
      password: decoded.slice(separator + 1),
    };
  } catch {
    return null;
  }
}

export default function middleware(request) {
  const expectedUsername = process.env.ADMIN_USER || "melike";
  const expectedPassword = process.env.ADMIN_PASSWORD;

  if (!expectedPassword) {
    return new Response("Admin password is not configured.", {
      status: 500,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const auth = readBasicAuth(request);
  if (auth?.username === expectedUsername && auth.password === expectedPassword) {
    return next();
  }

  return unauthorized();
}
