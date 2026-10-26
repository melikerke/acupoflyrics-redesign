// Shared by the app, index generation and prerender: categories are not credits.
const nonPerformers = new Set(['paw patrol', 'arcane', 'f1 the album', 'jjk (with yuki chiba)']);
const ensembles = new Set(['Michel Fugain & Le Big Bazar']);
export const artistAliases = {
  'olivia-rodrigo-feat-chappell-roan': 'olivia-rodrigo',
  'aespa-feat-ty-dolla-ign': 'aespa',
  'mariah-carey-feat-rochelle-jordan': 'mariah-carey',
  'baby-shark-boy-feat-joohoney': 'baby-shark-boy',
  'dolly-parton-kenny-rogers': 'dolly-parton',
  'post-malone-swae-lee': 'post-malone',
  'dayoung-jay-park': 'dayoung',
  'paw-patrol': 'ava-max',
  'arcane': 'stromae',
  'f1-the-album': 'rose',
  'jjk-with-yuki-chiba': 'mgk',
  'ade-la': 'adela',
};
export const artistKey = value => String(value || '').trim().toLowerCase();
export function artistSlug(value) {
  return artistKey(value).replace(/ı/g, 'i').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
export function performerNamesFor(post) {
  const raw = String(post?.artist || '').trim();
  return [...new Set((ensembles.has(raw) ? [raw] : raw.split(/\s*(?:,|\bfeat\.?\s|\bft\.?\s|\s&\s)\s*/i))
    .map(name => name.trim()).filter(name => name && !nonPerformers.has(artistKey(name))))];
}
export function buildPerformerCatalog(metadata, posts) {
  const result = new Map();
  for (const post of posts) for (const name of performerNamesFor(post)) {
    const key = artistKey(name);
    if (!result.has(key)) {
      const matches = metadata.filter(a => artistKey(a.name) === key);
      const meta = matches.find(a => post.category_slugs?.includes(a.slug)) || matches[0];
      const category = post.categories?.findIndex(c => artistKey(c) === key) ?? -1;
      const rawSlug = meta?.slug || post.category_slugs?.[category] || artistSlug(name);
      const spotify = post.spotify?.artist;
      const matchesSpotify = artistKey(spotify?.name || post.spotify?.artistName) === key;
      result.set(key, { name: meta?.name || name, slug: artistAliases[rawSlug] || rawSlug,
        image: meta?.image || (matchesSpotify ? spotify?.image || post.spotify?.artistImage : null) || post.cover,
        count: 0 });
    }
    result.get(key).count++;
  }
  return [...result.values()];
}
export function creditsFor(post, catalog) {
  return performerNamesFor(post).map(name => catalog.find(a => artistKey(a.name) === artistKey(name)) || { name, slug: artistSlug(name) });
}
