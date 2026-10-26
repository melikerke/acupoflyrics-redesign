import { artistBiographies } from '../data/artistBiographies.js';
import evidence from '../data/searchPriorities.json' with { type: 'json' };
export function biographyFor(artist) {
  const bio = artistBiographies[artist.slug];
  if (!bio) return null;
  const songs = [...artist.posts].sort((a, b) => (evidence.clicks[b.slug] || 0) - (evidence.clicks[a.slug] || 0) || a.slug.localeCompare(b.slug)).slice(0, 3);
  const matched = artist.posts.find(p => (p.spotify?.artist?.name || p.spotify?.artistName || '').toLowerCase() === artist.name.toLowerCase());
  return { ...bio, songs, spotifyUrl: bio.spotifyUrl || matched?.spotify?.artist?.url || matched?.spotify?.artistUrl,
    catalogText: `acupoflyrics arşivinde ${artist.count} çevirisi bulunuyor. ${songs.length === 1 ? 'Arşivdeki çevirisi' : 'Arşivde öne çıkan çevirileri'}:`,
  };
}
export function artistEntity(artist, bio = biographyFor(artist)) {
  return { '@context': 'https://schema.org', '@type': bio?.type || 'MusicGroup',
    name: artist.name, url: `https://www.acupoflyrics.com/artist/${artist.slug}`,
    image: artist.image || artist.cover,
    ...(bio ? { description: bio.text, genre: bio.genre } : {}),
    ...((bio?.spotifyUrl || artist.spotifyUrl) ? { sameAs: [bio?.spotifyUrl || artist.spotifyUrl] } : {}),
  };
}
