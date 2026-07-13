// Single source of truth for every internal route.
//
// The whole point of this module: a card NEVER links to "the first song" of a
// collection/album/mood/genre again. Each content type resolves to its own
// dedicated destination. Import from here instead of hand-writing template
// strings so the information architecture stays honest.

const slugOf = (v) => (typeof v === "string" ? v : v?.slug);

// Songs keep the established canonical pretty URL (`/<slug>/`) — the
// public/_redirects file already 301s every legacy /ceviri/<slug> here, and the
// sitemap uses it. `/song/:slug` is registered as a working alias in App.jsx.
export const songPath = (postOrSlug) => {
  const slug = slugOf(postOrSlug);
  return slug ? `/${slug}/` : "/";
};

export const artistPath = (artistOrSlug) => `/artist/${slugOf(artistOrSlug)}`;
export const albumPath = (albumOrSlug) => `/album/${slugOf(albumOrSlug)}`;
export const collectionPath = (collectionOrSlug) => `/collection/${slugOf(collectionOrSlug)}`;
export const moodPath = (moodOrSlug) => `/mood/${slugOf(moodOrSlug)}`;
export const genrePath = (genreOrSlug) => `/genre/${slugOf(genreOrSlug)}`;

export const discoverPath = () => "/discover";
export const searchPath = (q) => (q ? `/search?q=${encodeURIComponent(q)}` : "/search");

export const ORIGIN = "https://www.acupoflyrics.com";
export const canonical = (path) => `${ORIGIN}${path}`;
