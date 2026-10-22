import { MOOD_NAMES, moodsForPost } from './moodClassifier.js';
import { moodDescriptions } from './collectionDescriptions.js';
import { moodLandingPages, moodLandingFor, breakupSongSlugs } from '../data/moodLandingPages.js';

export const moodCollections = [...MOOD_NAMES, 'Breakup'].map(key => moodLandingFor(key) || {
  key, name: key, slug: key.toLowerCase(), description: moodDescriptions[key],
});

export function moodCollectionFor(slug) {
  return slug && moodCollections.find(mood => mood.slug === slug || mood.alias === slug);
}

export function postsForMoodCollection(mood, posts) {
  if (!mood) return [];
  return posts.filter(post => mood.key === 'Breakup'
    ? breakupSongSlugs.has(post.slug) || post.themes?.includes('breakup')
    : moodsForPost(post).includes(mood.key));
}

export { moodLandingPages };
