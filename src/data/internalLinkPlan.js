// Editorial relationships, not fabricated view counts. Keep seasonal filtering.
export const lostOnYou = 'lp-lost-on-you-turkce-ceviri';
export const dieWithASmile = 'lady-gaga-bruno-mars-die-with-a-smile-turkce-ceviri';
export const popularSongSlugs = [lostOnYou, dieWithASmile, 'lord-huron-the-night-we-met-turkce-ceviri', 'one-direction-night-changes-turkce-ceviri', 'shawn-mendes-camila-cabello-senorita-turkce-ceviri'];
export const moodPins = { Sad: [lostOnYou], Breakup: [lostOnYou], Love: [dieWithASmile] };
const toLost = [
  'tom-odell-another-love-turkce-ceviri', 'lord-huron-the-night-we-met-turkce-ceviri',
  'adele-set-fire-to-the-rain-turkce-ceviri', 'adele-love-in-the-dark-turkce-ceviri',
  'lana-del-rey-summertime-sadness-turkce-ceviri',
  'cigarettes-after-sex-apocalypse-turkce-ceviri', 'mazzy-star-fade-into-you-turkce-ceviri',
  'sam-smith-taeyeon-im-not-the-only-one-turkce-ceviri', 'harry-styles-matilda-turkce-ceviri',
  'indila-derniere-danse-turkce-ceviri', 'indila-tourner-dans-le-vide-turkce-ceviri',
  'taylor-swift-cardigan-turkce-ceviri', 'shawn-mendes-treat-you-better-turkce-ceviri',
];
const toSmile = [
  'billie-eilish-birds-of-a-feather-turkce-ceviri', 'shawn-mendes-camila-cabello-senorita-turkce-ceviri',
  'lana-del-rey-young-and-beautiful-turkce-ceviri', 'ed-sheeran-thinking-out-loud-turkce-ceviri',
  'arctic-monkeys-i-wanna-be-yours-turkce-ceviri', 'justin-timberlake-mirrors-turkce-ceviri',
  'one-direction-night-changes-turkce-ceviri', 'sting-shape-of-my-heart-turkce-ceviri',
  'coldplay-we-dance-turkce-ceviri', 'justin-bieber-ludacris-baby-turkce-ceviri',
  'ed-sheeran-azizam-turkce-ceviri',
];
export const relatedSongPins = Object.fromEntries([...toLost.map(s => [s, lostOnYou]), ...toSmile.map(s => [s, dieWithASmile])]);
