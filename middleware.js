import { next } from "@vercel/functions";
import { legacyCategoryRedirects } from "./server/legacyCategoryRedirects.js";
import { legacyPostRedirects } from "./server/legacyPostRedirects.js";

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/:path*",
    "/category/:path*",
    "/tag/:path*",
    "/author/:path*",
    "/:legacySlug",
    "/:legacyPrefix/:legacySlug",
    "/:legacyPrefix/:legacyMiddle/:legacySlug",
    "/:legacyPrefix/:legacyMiddle/:legacyExtra/:legacySlug",
  ],
  runtime: "nodejs",
};

function permanentRedirect(request, destination) {
  const url = new URL(destination, request.url);
  return new Response(null, {
    status: 308,
    headers: {
      Location: url.toString(),
      "Cache-Control": "public, max-age=0, s-maxage=86400",
    },
  });
}

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

const staticLegacyRedirects = {
  "/muzik-listeleri": "/listeler",
  "/sanatcilar": "/discover",
};

export default function middleware(request) {
  const pathname = new URL(request.url).pathname;
  const normalizedPath = pathname.replace(/\/+$/, "") || "/";

  if (staticLegacyRedirects[normalizedPath]) {
    return permanentRedirect(request, staticLegacyRedirects[normalizedPath]);
  }

  const categoryMatch = pathname.match(/^\/category\/([^/]+)\/?$/);
  if (categoryMatch) {
    const slug = decodeURIComponent(categoryMatch[1]).toLowerCase();
    return permanentRedirect(request, legacyCategoryRedirects[slug] || "/discover");
  }
  if (pathname === "/category" || pathname === "/category/") {
    return permanentRedirect(request, "/discover");
  }
  if (pathname.startsWith("/tag/")) {
    return permanentRedirect(request, "/discover");
  }
  if (pathname.startsWith("/author/")) {
    return permanentRedirect(request, "/hakkimizda");
  }

  const deepNestedPostMatch = pathname.match(/^\/(?:[^/]+\/){2,}([^/]+)\/?$/);
  if (deepNestedPostMatch) {
    const slug = decodeURIComponent(deepNestedPostMatch[1]).toLowerCase();
    const destination = legacyPostRedirects[slug];
    if (destination) return permanentRedirect(request, destination);
  }

  const nestedPostMatch = pathname.match(/^\/[^/]+\/([^/]+)\/?$/);
  if (nestedPostMatch) {
    const slug = decodeURIComponent(nestedPostMatch[1]).toLowerCase();
    const destination = legacyPostRedirects[slug];
    if (destination) return permanentRedirect(request, destination);
  }

  const rootPostMatch = pathname.match(/^\/([^/]+)\/?$/);
  if (rootPostMatch) {
    const slug = decodeURIComponent(rootPostMatch[1]).toLowerCase();
    const destination = legacyPostRedirects[slug];
    if (destination && destination !== pathname) return permanentRedirect(request, destination);
  }

  if (pathname === "/api/comments") {
    return next();
  }

  if (!pathname.startsWith("/admin") && !pathname.startsWith("/api/")) {
    return next();
  }

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
