import { ORIGIN, songPath } from './paths.js';

export const linksHubTitle = 'Bir şarkıyla başla.';
export const linksHubDescription = 'Instagram’dan buraya: haftanın çevirisi, son eklenen şarkılar ve ruh hâline göre keşif. Aradığın sözün Türkçesini bul.';
export const weeklyTranslationSlug = 'amy-winehouse-back-to-black-turkce-ceviri';
export const instagramProfileUrl = 'https://www.instagram.com/acupoflyrics/';

export function linksHubSongs(posts) {
  const latest = [...posts].filter(post => !post.languages?.translation || post.languages.translation === 'tr')
    .sort((a, b) => (Date.parse(b.date) || 0) - (Date.parse(a.date) || 0) || Number(b.id) - Number(a.id)).slice(0, 6);
  return { featured: posts.find(post => post.slug === weeklyTranslationSlug) || latest[0], latest };
}

// UTMs belong on incoming social links, never on internal navigation.
export function instagramCampaignUrl(path = '/linkler', content = 'bio', campaign = 'profile') {
  const url = new URL(path, ORIGIN);
  if (url.origin !== ORIGIN) throw new Error('Campaign URL must stay on this site');
  url.searchParams.set('utm_source', 'instagram');
  url.searchParams.set('utm_medium', 'social');
  url.searchParams.set('utm_campaign', campaign);
  url.searchParams.set('utm_content', content);
  return url.href;
}

export function instagramSongCta(post) {
  return {
    caption: `${post.artist} — ${post.song} tam Türkçe çevirisi ve çevirmen notları sitede. Profildeki bağlantıdan şarkıyı ara.`,
    storyLabel: 'Çeviriyi oku',
    storyUrl: instagramCampaignUrl(songPath(post), `story_${post.slug}`, 'song_translation'),
  };
}
