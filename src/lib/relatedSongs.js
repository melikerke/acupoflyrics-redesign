const normalize = value => String(value || '').normalize('NFKC').toLowerCase().trim();
const artists = post => new Set(String(post.artist || '').split(/\s*(?:,|&| feat\.? | ft\.? )\s*/i).map(normalize).filter(Boolean));
const genres = post => new Set((post.spotify?.artistGenres || post.spotify?.artist?.genres || []).map(normalize));
const overlap = (a, b) => [...a].filter(value => b.has(value)).length;

// No arbitrary recent-song fallback: an empty list is better than unrelated links.
export function relatedSongs(post, candidates, limit = 4) {
  const sourceArtists = artists(post);
  const sourceGenres = genres(post);
  const sourceMoods = new Set(post.moods || []);
  return candidates.filter(item => item.slug !== post.slug).map(item => {
    const artistMatches = overlap(sourceArtists, artists(item));
    const genreMatches = overlap(sourceGenres, genres(item));
    const moodMatches = overlap(sourceMoods, new Set(item.moods || []));
    const primaryMoodMatch = post.moods?.[0] && post.moods[0] === item.moods?.[0] ? 1 : 0;
    return { item, score: artistMatches * 100 + genreMatches * 10 + moodMatches * 4 + primaryMoodMatch * 3 };
  }).filter(entry => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.item.slug.localeCompare(b.item.slug, 'en'))
    .slice(0, limit).map(entry => entry.item);
}
