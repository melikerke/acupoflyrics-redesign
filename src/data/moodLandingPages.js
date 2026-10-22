export const moodLandingPages = [
  { key: 'Sad', slug: 'huzunlu-sarkilar', alias: 'sad', name: 'Hüzünlü Şarkılar', description: 'Özlem, kayıp ve içe dönüş üzerine şarkılar. Hüzünlü şarkı sözlerini Türkçe çevirileri ve çevirmen notlarıyla oku; anlatıcının duygusuna kendi hızında yaklaş.' },
  { key: 'Love', slug: 'ask-sarkilari', alias: 'love', name: 'Aşk Şarkıları', description: 'İlk yakınlaşmadan uzun süren bağlılığa, aşkın farklı hâllerini anlatan şarkılar. Orijinal sözleri ve Türkçe çevirileri birlikte okuyarak sevginin farklı dillerde nasıl söylendiğini keşfet.' },
  { key: 'Breakup', slug: 'ayrilik-sarkilari', name: 'Ayrılık Şarkıları', description: 'Vedalar, kırılan güven ve bir ilişkiden sonra yoluna devam etme çabası. Ayrılık temasına göre etiketlenen şarkıların sözleri, Türkçe çevirileri ve notları bu koleksiyonda bir araya geliyor.' },
  { key: 'Happy', slug: 'mutlu-sarkilar', alias: 'happy', name: 'Mutlu Şarkılar', description: 'Neşeyi, güzel bir karşılaşmayı ve küçük mutlulukları anlatan şarkılar. Orijinal sözleri Türkçe çevirileriyle birlikte oku; anlatıcıların sevincine eşlik eden kelimeleri ve imgeleri keşfet.' },
  { key: 'Healing', slug: 'iyi-hissettiren-sarkilar', alias: 'healing', name: 'İyi Hissettiren Şarkılar', description: 'Yeniden başlamak, kendini kabul etmek ve zor bir dönemin ardından umut bulmak üzerine şarkılar. Türkçe çevirilerde anlatıcıların toparlanma çabasını takip et. Bu seçki, şarkıların temalarına dayanır; herkeste aynı duyguyu uyandırması beklenmez.' },
  { key: 'Dark', slug: 'karanlik-atmosferli-sarkilar', alias: 'dark', name: 'Karanlık Atmosferli Şarkılar', description: 'Korku, öfke, tehlike ve iç çatışma imgelerinin öne çıktığı şarkılar. Karanlık anlatıların sözlerini Türkçe çevirileriyle birlikte oku. Çeviri notlarıyla mecazları ve anlatıcının bakış açısını yakından incele.' },
  { key: 'Motivation', slug: 'motivasyon-sarkilari', alias: 'motivation', name: 'Motivasyon Şarkıları', description: 'Vazgeçmemek, yeniden ayağa kalkmak ve kendi yolunu çizmek üzerine şarkılar. Özgüven ve kararlılık taşıyan sözleri Türkçe çevirileriyle keşfet; farklı anlatıcıların mücadeleye nasıl ses verdiğini oku.' },
  { key: 'Party', slug: 'parti-sarkilari', alias: 'party', name: 'Parti Şarkıları', description: 'Dansı, kutlamayı ve gece dışarı çıkmanın heyecanını anlatan şarkılar. Parti temalı sözleri orijinalleri ve Türkçe çevirileriyle birlikte oku. Argo ifadelerin ve kültürel göndermelerin açıklamalarını çevirmen notlarında bul.' },
  { key: 'Lonely', slug: 'yalnizlik-sarkilari', alias: 'lonely', name: 'Yalnızlık Şarkıları', description: 'Kalabalıkta yalnız kalmak, birini özlemek ve kendi sesini duymak üzerine şarkılar. Yalnızlığın farklı hâllerini anlatan sözleri Türkçe çevirileriyle oku. Bu seçki yalnızca romantik ayrılıkları değil, insanın kendisiyle baş başa kaldığı anları da kapsıyor.' },
  { key: 'Dreamy', slug: 'hayallere-daldiran-sarkilar', alias: 'dreamy', name: 'Hayallere Daldıran Şarkılar', description: 'Rüyalar, hayaller ve uzaklara gitme isteği etrafında şekillenen şarkılar. Hayal imgelerinin öne çıktığı sözleri Türkçe çevirileriyle keşfet. Anlatıcının kurduğu dünyayı orijinal metin ve çevirmen notlarıyla birlikte takip et.' },
  { key: 'Night', slug: 'gece-sarkilari', alias: 'night', name: 'Gece Şarkıları', description: 'Gece yolları, uykusuz saatler ve şehir ışıkları arasında geçen şarkılar. Geceyi kimi zaman bir kaçış, kimi zaman bir yakınlık anı olarak anlatan sözleri Türkçe çevirileriyle oku. Farklı türlerden gece temalı anlatılar bu sayfada buluşuyor.' },
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
  'lord-huron-the-night-we-met-turkce-ceviri',
  'taylor-swift-august-turkce-ceviri',
  'gims-est-ce-que-tu-maimes-turkce-ceviri',
  'slimane-mon-amour-turkce-ceviri',
  'ariana-grande-dont-wanna-break-up-again-turkce-ceviri',
  'ariana-grande-bye-turkce-ceviri',
  'ariana-grande-eternal-sunshine-turkce-ceviri',
  'taylor-swift-right-where-you-left-me-turkce-ceviri',
  'taylor-swift-i-can-do-it-with-a-broken-heart-turkce-ceviri',
  'dua-lipa-pierre-de-maere-these-walls-turkce-ceviri',
  'the-weeknd-cry-for-me-turkce-ceviri',
]);

export const moodLandingFor = value => value && moodLandingPages.find(page => [page.key, page.slug, page.alias].includes(value));
export const canonicalMoodSlug = value => moodLandingFor(value)?.slug || value;
