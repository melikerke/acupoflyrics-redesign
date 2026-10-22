export const moodLandingPages = [
  { key: 'Sad', slug: 'huzunlu-sarkilar', alias: 'sad', name: 'Hüzünlü Şarkılar', description: 'Özlem, kayıp ve içe dönüş üzerine şarkılar. Hüzünlü şarkı sözlerini Türkçe çevirileri ve çevirmen notlarıyla oku; anlatıcının duygusuna kendi hızında yaklaş.' },
  { key: 'Love', slug: 'ask-sarkilari', alias: 'love', name: 'Aşk Şarkıları', description: 'İlk yakınlaşmadan uzun süren bağlılığa, aşkın farklı hâllerini anlatan şarkılar. Orijinal sözleri ve Türkçe çevirileri birlikte okuyarak sevginin farklı dillerde nasıl söylendiğini keşfet.' },
  { key: 'Breakup', slug: 'ayrilik-sarkilari', name: 'Ayrılık Şarkıları', description: 'Vedalar, kırılan güven ve bir ilişkiden sonra yoluna devam etme çabası. Ayrılık temasına göre etiketlenen şarkıların sözleri, Türkçe çevirileri ve notları bu koleksiyonda bir araya geliyor.' },
];

// Theme labels are editorial: sadness alone does not imply romantic separation.
export const breakupSongSlugs = new Set([
  'amy-winehouse-back-to-black-turkce-ceviri',
  'adele-set-fire-to-the-rain-turkce-ceviri',
  'adele-love-in-the-dark-turkce-ceviri',
  'charlie-puth-attention-turkce-ceviri',
  'wham-last-christmas-turkce-ceviri',
  'lp-lost-on-you-turkce-ceviri',
  'tom-odell-another-love-turkce-ceviri',
  'taylor-swift-cardigan-turkce-ceviri',
  'sam-smith-taeyeon-im-not-the-only-one-turkce-ceviri',
]);

export const moodLandingFor = value => value && moodLandingPages.find(page => [page.key, page.slug, page.alias].includes(value));
export const canonicalMoodSlug = value => moodLandingFor(value)?.slug || value;
