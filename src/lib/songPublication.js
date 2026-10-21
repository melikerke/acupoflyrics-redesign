import { languagesFor } from './languages.js';

export function publicationDate(post) {
  return post.updatedAt || post.modified || post.date;
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
    author: { '@type': 'Person', name: 'Melike', url: 'https://www.acupoflyrics.com/hakkimizda' },
    datePublished: post.date,
    dateModified: publicationDate(post),
    translationOfWork: {
      '@type': 'CreativeWork',
      name: `${post.artist} — ${post.song} lyrics`,
      inLanguage: languagesFor(post).original,
    },
  };
}
