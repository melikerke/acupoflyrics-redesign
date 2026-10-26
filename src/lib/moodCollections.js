import { MOOD_NAMES, moodsForPost } from './moodClassifier.js';
import { moodPins } from '../data/internalLinkPlan.js';
import { moodDescriptions } from './collectionDescriptions.js';
import { moodLandingPages, moodLandingFor, moodAliases, breakupSongSlugs } from '../data/moodLandingPages.js';
import trafficEvidence from '../../reports/site-audit/2026-10-21/content-priorities.json' with { type: 'json' };

export const MOOD_PAGE_SIZE = 48;
const searchClicks = new Map(trafficEvidence.rows.map(([slug, clicks]) => [slug, clicks]));
export const moodPagePath = (mood, page = 1) => `/mood/${mood.slug}${page > 1 ? `/page/${page}` : ''}`;
export const moodPageTitle = (mood, page = 1) => `Yabancı ${mood.name} ve Türkçe Çevirileri${page > 1 ? ` — Sayfa ${page}` : ' | acupoflyrics'}`;
export function popularMoodPosts(posts, mood) {
  const pins = moodPins[mood?.key] || [];
  return [...posts].sort((a, b) => Number(pins.includes(b.slug)) - Number(pins.includes(a.slug)) || (searchClicks.get(b.slug) || 0) - (searchClicks.get(a.slug) || 0)
    || `${a.artist} — ${a.song}`.localeCompare(`${b.artist} — ${b.song}`, 'tr') || a.slug.localeCompare(b.slug));
}
export function moodPage(items, requestedPage = 1) {
  const pageCount = Math.max(1, Math.ceil(items.length / MOOD_PAGE_SIZE));
  const page = Number(requestedPage);
  const valid = Number.isInteger(page) && page >= 1 && page <= pageCount;
  const start = valid ? (page - 1) * MOOD_PAGE_SIZE : 0;
  return { page, pageCount, valid, start, items: valid ? items.slice(start, start + MOOD_PAGE_SIZE) : [] };
}

export const moodCollections = [...MOOD_NAMES, 'Breakup'].map(key => moodLandingFor(key) || {
  key, name: key, slug: key.toLowerCase(), description: moodDescriptions[key],
});

export function moodCollectionFor(slug) {
  return slug && moodCollections.find(mood => mood.slug === slug || moodAliases(mood).includes(slug));
}

export function postsForMoodCollection(mood, posts) {
  if (!mood) return [];
  return posts.filter(post => (moodPins[mood.key] || []).includes(post.slug) || (mood.key === 'Breakup'
    ? breakupSongSlugs.has(post.slug) || post.themes?.includes('breakup')
    : moodsForPost(post).includes(mood.key)));
}

export { moodLandingPages };
