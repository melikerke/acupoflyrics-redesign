import { languagesFor } from './languages.js';

export function publicationDate(post) {
  return isoDate(post.updatedAt) || isoDate(post.modified) || isoDate(post.date);
}

export function isoDate(value) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

export function readablePublicationDate(value) {
  const iso = isoDate(value);
  return iso ? new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Istanbul' }).format(new Date(iso)) : '';
}

export function releaseLabel(post) {
  const type = post.spotify?.album?.album_type || post.spotify?.album?.albumType || post.spotify?.albumType || (post.appleMusicUrl?.includes('-single/') ? 'single' : undefined);
  // A release title alone does not establish whether it is an album or a single.
  return type === 'single' ? 'Single' : type === 'album' ? 'Albüm' : type === 'compilation' ? 'Derleme' : 'Yayın';
}

export function translationSchema(post, url) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    '@id': `${url}#translation`,
    name: `${post.artist} — ${post.song} (${languagesFor(post).translation})`,
    url,
    inLanguage: languagesFor(post).translation,
    author: { '@type': 'Person', name: 'Melike Erke', url: 'https://www.acupoflyrics.com/hakkimizda' },
    datePublished: isoDate(post.date),
    dateModified: publicationDate(post),
    translationOfWork: {
      '@type': 'CreativeWork',
      name: `${post.artist} — ${post.song} lyrics`,
      inLanguage: languagesFor(post).original,
    },
  };
}
