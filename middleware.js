import { next } from "@vercel/functions";
import { legacyAlbumRedirects } from "./server/legacyAlbumRedirects.js";
import { legacyCategoryRedirects } from "./server/legacyCategoryRedirects.js";
import { legacyCategoryPathRedirects } from "./server/legacyCategoryPathRedirects.js";
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
};

const canonicalPrefixes = new Set([
  "admin",
  "album",
  "albumler",
  "api",
  "artist",
  "assets",
  "collection",
  "ceviri",
  "data",
  "discover",
  "genre",
  "gizlilik",
  "hakkimizda",
  "iletisim",
  "listeler",
  "mood",
  "pop-gunlugu",
  "sanatcilar",
  "sanatci",
  "sarkilar",
  "search",
  "song",
]);

function gone() {
  return new Response("Bu eski arşiv adresi artık kullanılmıyor.", {
    status: 410,
    headers: { "Cache-Control": "public, max-age=0, s-maxage=86400" },
  });
}

export default function middleware(request) {
  const pathname = new URL(request.url).pathname;
  const normalizedPath = pathname.replace(/\/+$/, "") || "/";

  if (staticLegacyRedirects[normalizedPath]) {
    return permanentRedirect(request, staticLegacyRedirects[normalizedPath]);
  }

  const albumMatch = pathname.match(/^\/album\/([^/]+)\/?$/);
  if (albumMatch) {
    const legacyAlbumSlug = decodeURIComponent(albumMatch[1]).toLowerCase();
    const destination = legacyAlbumRedirects[legacyAlbumSlug];
    if (destination) return permanentRedirect(request, destination);
  }

  const exactCategoryDestination = legacyCategoryPathRedirects[normalizedPath.toLowerCase()];
  if (exactCategoryDestination) {
    return permanentRedirect(request, exactCategoryDestination);
  }

  const categoryMatch = pathname.match(/^\/category\/([^/]+)\/?$/);
  if (categoryMatch) {
    const slug = decodeURIComponent(categoryMatch[1]).toLowerCase();
    const destination = legacyCategoryRedirects[slug];
    return destination ? permanentRedirect(request, destination) : gone();
  }
  if (pathname === "/category" || pathname === "/category/") {
    return permanentRedirect(request, "/discover");
  }
  if (pathname.startsWith("/category/")) return gone();
  if (pathname.startsWith("/tag/")) {
    return gone();
  }
  if (pathname.startsWith("/author/")) {
    return permanentRedirect(request, "/hakkimizda");
  }

  const firstSegment = normalizedPath.split("/").filter(Boolean)[0]?.toLowerCase();
  if (!canonicalPrefixes.has(firstSegment)) {
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
