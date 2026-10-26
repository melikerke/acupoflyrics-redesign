import { songRecommendationProfiles, artistDiscoveryProfiles } from '../data/songRecommendationProfiles.js';
import { relatedSongPins } from '../data/internalLinkPlan.js';
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
  const genres = new Set((taggedGenres?.length ? taggedGenres : [...fetchedGenres, ...defaults.flatMap(p => p.genres)]).map(normalize));
  return {
    artists: credits,
    genres,
    season: normalize(editorial.season || post?.season || (genres.has('christmas-pop') ? 'christmas' : '')),
    moods: new Set(editorial.moods || post?.moods || []),
    language: editorial.language || post?.languages?.original || defaults.find(p => p.language)?.language || null,
  };
}

export function relatedSongs(post, candidates, limit = 4) {
  if (!post || limit <= 0) return [];
  const source = recommendationProfile(post);
  const scored = candidates.filter(item => item.slug !== post.slug).map(item => {
    const profile = recommendationProfile(item);
    if (overlap(source.artists, profile.artists)) return null;
    // Seasonal songs only recommend songs from the same season, in both directions.
    // Apply this before every tier, including the mood-only fallback.
    if (source.season !== profile.season) return null;
    const genreMatches = overlap(source.genres, profile.genres);
    const moodMatches = overlap(source.moods, profile.moods);
    const sameLanguage = Boolean(source.language && source.language === profile.language);
    if (!genreMatches && !sameLanguage && !moodMatches) return null;
    const tier = genreMatches ? 2 : sameLanguage ? 1 : 0;
    const score = genreMatches * 10 + moodMatches * 6 + (sameLanguage ? 12 : 0);
    return { item, profile, tier, score, clicks: clicks.get(item.slug) || 0, tie: stableTie(`${post.slug}:${item.slug}`) };
  }).filter(Boolean);
  // Mood-only results are a last resort, not padding for a short relevant list.
  const direct = scored.filter(entry => entry.tier > 0);
  const ranked = (direct.length ? direct : scored).sort((a, b) => b.tier - a.tier || (a.tier <= 1 ? b.clicks - a.clicks : b.score - a.score) || b.clicks - a.clicks || b.score - a.score || a.tie - b.tie);
  const selected = [], usedArtists = new Set(), usedSlugs = new Set();
  const pinned = candidates.find(item => item.slug === relatedSongPins[post.slug] && item.slug !== post.slug);
  if (pinned) {
    const profile = recommendationProfile(pinned);
    if (profile.season === source.season && !overlap(profile.artists, source.artists)) {
      selected.push(pinned); usedSlugs.add(pinned.slug);
      for (const name of profile.artists) usedArtists.add(name);
    }
  }
  if (selected.length >= limit) return selected.slice(0, limit);
  for (const entry of ranked) {
    if (usedSlugs.has(entry.item.slug) || overlap(usedArtists, entry.profile.artists)) continue;
    selected.push(entry.item); usedSlugs.add(entry.item.slug);
    for (const name of entry.profile.artists) usedArtists.add(name);
    if (selected.length === limit) break;
  }
  return selected;
}
