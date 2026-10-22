import { songRecommendationProfiles, artistDiscoveryProfiles } from '../data/songRecommendationProfiles.js';
import trafficEvidence from '../../reports/site-audit/2026-10-21/content-priorities.json' with { type: 'json' };

const normalize = value => String(value || '').normalize('NFKC').toLowerCase().trim();
const artists = post => new Set(String(post?.artist || '').split(/\s*(?:,|&| feat\.? | ft\.? )\s*/i).map(normalize).filter(Boolean));
const overlap = (a, b) => [...a].filter(value => b.has(value)).length;
// Historical search clicks, NOT page views. Unmeasured pages have no inferred count.
const clicks = new Map(trafficEvidence.rows.map(([slug, count]) => [slug, count]));
const stableTie = value => { let h = 2166136261; for (const c of value) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };

export function recommendationProfile(post) {
  const editorial = songRecommendationProfiles[post?.slug] || {};
  const credits = artists(post);
  const defaults = [...credits].map(name => artistDiscoveryProfiles[name]).filter(Boolean);
  const taggedGenres = editorial.genres || post?.genres;
  const fetchedGenres = post?.spotify?.artistGenres || post?.spotify?.artist?.genres || [];
  return {
    artists: credits,
    genres: new Set((taggedGenres?.length ? taggedGenres : [...fetchedGenres, ...defaults.flatMap(p => p.genres)]).map(normalize)),
    moods: new Set(editorial.moods || post?.moods || []),
    language: editorial.language || post?.languages?.original || defaults.find(p => p.language)?.language || null,
  };
}

export function relatedSongs(post, candidates, limit = 4) {
  if (!post || limit <= 0) return [];
  const source = recommendationProfile(post);
  const ranked = candidates.filter(item => item.slug !== post.slug).map(item => {
    const profile = recommendationProfile(item);
    if (overlap(source.artists, profile.artists)) return null;
    const genreMatches = overlap(source.genres, profile.genres);
    const moodMatches = overlap(source.moods, profile.moods);
    const sameLanguage = Boolean(source.language && source.language === profile.language);
    // A shared automatic mood alone is not sufficient evidence of similarity.
    if (!genreMatches && !sameLanguage) return null;
    const tier = genreMatches ? 2 : 1;
    const score = genreMatches * 10 + moodMatches * 6 + (sameLanguage ? 12 : 0);
    return { item, profile, tier, score, clicks: clicks.get(item.slug) || 0, tie: stableTie(`${post.slug}:${item.slug}`) };
  }).filter(Boolean).sort((a, b) => b.tier - a.tier || (a.tier === 1 ? b.clicks - a.clicks : b.score - a.score) || b.clicks - a.clicks || b.score - a.score || a.tie - b.tie);
  const selected = [], usedArtists = new Set(), usedSlugs = new Set();
  for (const entry of ranked) {
    if (usedSlugs.has(entry.item.slug) || overlap(usedArtists, entry.profile.artists)) continue;
    selected.push(entry.item); usedSlugs.add(entry.item.slug);
    for (const name of entry.profile.artists) usedArtists.add(name);
    if (selected.length === limit) break;
  }
  return selected;
}
