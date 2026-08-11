// Mood tagging is intentionally done at build time, while the complete lyric
// blocks are available. The browser receives the resulting `moods` array in
// postIndex.json, so homepage groups never depend on the lazy search index.

export const MOOD_NAMES = [
  "Love",
  "Sad",
  "Happy",
  "Healing",
  "Dark",
  "Motivation",
  "Party",
  "Lonely",
  "Dreamy",
  "Night",
];

// A small editorial layer for songs whose central idea is clearer than a
// keyword score can express. The first item is the primary mood; the optional
// second item lets naturally mixed songs appear in two useful collections.
export const MOOD_OVERRIDES = {
  "aespa-lemonade-turkce-ceviri": ["Motivation", "Party"],
  "artms-blue-blood-turkce-ceviri": ["Healing", "Night"],
  "blackpink-forever-young-turkce-ceviri": ["Party", "Happy"],
  "blackpink-hope-not-turkce-ceviri": ["Sad"],
  "blackpink-kick-it-turkce-ceviri": ["Motivation", "Dark"],
  "blackpink-kill-this-love-turkce-ceviri": ["Dark", "Sad"],
  "blackpink-playing-with-fire-turkce-ceviri": ["Dark", "Love"],
  "blackpink-stay-turkce-ceviri": ["Sad", "Love"],
  "arca-futurality-turkce-ceviri": ["Dreamy", "Motivation"],
  "arca-heart-turkce-ceviri": ["Motivation", "Party"],
  "arca-suen-o-turkce-ceviri": ["Dreamy"],
  "arca-taconeando-turkce-ceviri": ["Party"],
  "dino-like-it-turkce-ceviri": ["Love", "Party"],
  "dominic-fike-babydoll-turkce-ceviri": ["Sad", "Love"],
  "eminem-lose-yourself-turkce-ceviri": ["Motivation"],
  "flo-remedied-turkce-ceviri": ["Healing", "Sad"],
  "flo-therapy-at-the-club-turkce-ceviri": ["Sad", "Party"],
  "illit-it-s-me-turkce-ceviri": ["Motivation", "Love"],
  "jin-super-tuna-turkce-ceviri": ["Happy", "Party"],
  "katseye-pinky-up-turkce-ceviri": ["Party", "Happy"],
  "le-sserafim-boompala-turkce-ceviri": ["Motivation", "Healing"],
};

const CUES = {
  Love: [
    ["aşk*", 4], ["sev*", 2.5], ["kalp*", 2], ["öp*", 3], ["sarıl*", 3],
    ["romantik", 3], ["tutku*", 3], ["sevgili", 3], ["ilk aşk", 5],
    ["love*", 3], ["lover*", 3], ["kiss*", 3], ["romance", 3],
    ["darling", 2], ["sweetheart", 3], ["falling for", 4], ["in love", 5],
  ],
  Sad: [
    ["ağla*", 4], ["gözyaş*", 4], ["acı*", 3], ["kırık*", 3], ["özle*", 4],
    ["ayrıl*", 4], ["veda", 3], ["unut*", 2], ["pişman*", 4], ["kaybet*", 3],
    ["canım yan*", 5], ["cry*", 4], ["tear*", 3], ["hurt*", 3], ["pain*", 3],
    ["broken", 4], ["heartbreak*", 5], ["goodbye", 3], ["regret*", 4],
    ["miss you", 4], ["lost you", 4], ["let you go", 4], ["without you", 2.5],
  ],
  Happy: [
    ["mutlu*", 4], ["gülümse*", 4], ["neşe*", 4], ["keyif*", 3], ["eğlen*", 3],
    ["harika", 2], ["çok güzel", 2], ["özgür*", 2.5], ["kutla*", 3],
    ["happy", 5], ["happier", 4], ["smile*", 4], ["joy*", 4], ["fun", 3],
    ["sunshine", 3], ["celebrat*", 4], ["feel good", 4], ["good time", 4],
  ],
  Healing: [
    ["iyileş*", 6], ["şifa", 6], ["huzur*", 4], ["umut*", 4], ["nefes al*", 3],
    ["kendime dön*", 5], ["kendini sev*", 5], ["kabul et*", 3], ["affet*", 3],
    ["yeniden başla*", 5], ["heal*", 6], ["recover*", 5], ["peace", 4],
    ["hope*", 4], ["breathe", 3], ["self love", 5], ["let it go", 3],
    ["be okay", 4], ["better now", 3], ["save me", 3], ["savior", 4],
  ],
  Dark: [
    ["öldür*", 6], ["ölüm", 5], ["kan", 4], ["karanlık", 4], ["gölge*", 3],
    ["cehennem", 5], ["şeytan", 5], ["zehir*", 5], ["tehlike*", 4], ["intikam", 5],
    ["korku*", 3], ["canavar", 4], ["kill*", 6], ["die", 5], ["death", 5],
    ["blood", 4], ["dark*", 4], ["shadow*", 3], ["hell", 5], ["devil", 5],
    ["poison*", 5], ["danger*", 4], ["revenge", 5], ["monster*", 4], ["villain*", 4],
  ],
  Motivation: [
    ["vazgeçme*", 6], ["devam et*", 5], ["ayağa kalk*", 5], ["başar*", 4],
    ["kazan*", 4], ["zirve*", 4], ["güçlü*", 4], ["gücüm", 4], ["kontrol bende", 5],
    ["kendi ayak*", 5], ["kendime inan*", 5], ["korkusuz*", 4], ["yolumda", 2],
    ["never give up", 6], ["keep going", 5], ["rise up", 5], ["strong*", 4],
    ["power*", 3], ["unstoppable", 6], ["win*", 3], ["champion*", 4],
    ["my way", 3], ["believe in myself", 5], ["no holding me back", 5],
  ],
  Party: [
    ["dans*", 5], ["parti*", 5], ["kulüp*", 5], ["ritim*", 3], ["sesi kökle*", 4],
    ["felekten bir gece", 6], ["kalça salla*", 5], ["şampanya", 4], ["sarhoş*", 3],
    ["dance*", 5], ["party*", 5], ["club*", 5], ["turn it up", 4], ["dance floor", 6],
    ["champagne", 4], ["shots", 3], ["drink*", 2.5], ["shake it", 4], ["all night", 3],
  ],
  Lonely: [
    ["yalnız*", 6], ["tek başıma", 6], ["kimsesiz", 6], ["boş oda", 5], ["sessizlik", 3],
    ["kimsem yok", 6], ["sensiz", 3], ["uyuyam*", 3], ["alone", 6], ["lonely", 6],
    ["by myself", 6], ["nobody", 4], ["empty room", 5], ["silence", 3],
    ["on my own", 5], ["without anyone", 5], ["can't sleep", 3],
  ],
  Dreamy: [
    ["rüya*", 5], ["hayal*", 4], ["düşler*", 4], ["gökyüz*", 3], ["yıldız*", 3],
    ["bulut*", 3], ["uçuyor*", 3], ["sihir*", 4], ["cennet", 3], ["evren", 3],
    ["dream*", 5], ["sky", 3], ["star*", 3], ["cloud*", 3], ["fly*", 2.5],
    ["magic*", 4], ["heaven*", 3], ["fantasy", 4], ["wonderland", 4],
  ],
  Night: [
    ["gece", 5], ["geceler", 5], ["gece yarısı", 6], ["şafak", 4], ["gün doğ*", 3],
    ["neon", 5], ["uykusuz*", 4], ["sabahın", 3], ["night*", 5], ["midnight", 6],
    ["late night", 6], ["dawn", 4], ["neon", 5], ["sleepless", 4], ["2am", 6], ["3am", 6],
  ],
};

const TIE_ORDER = [
  "Sad",
  "Love",
  "Motivation",
  "Healing",
  "Dark",
  "Party",
  "Lonely",
  "Night",
  "Happy",
  "Dreamy",
];

const SECONDARY_CONFLICTS = new Set([
  "Dark:Happy",
  "Happy:Lonely",
  "Happy:Sad",
]);

function normalize(value) {
  return String(value || "")
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function lyricText(post, original) {
  return (post.blocks || [])
    .filter((block) => Boolean(block?.original) === original)
    .flatMap((block) => block.lines || [])
    .join(" ");
}

function isInstrumental(post) {
  const translatedLines = (post.blocks || [])
    .filter((block) => block?.original === false)
    .flatMap((block) => block.lines || [])
    .map((line) => normalize(line))
    .filter(Boolean);
  return translatedLines.length > 0 && translatedLines.every((line) => (
    line === "enstrumantal"
    || line === "sozsuz enstrumantal gecis"
  ));
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function countCue(text, rawCue, cap) {
  const isStem = rawCue.endsWith("*");
  const cue = normalize(isStem ? rawCue.slice(0, -1) : rawCue);
  if (!cue || !text) return 0;
  const pattern = isStem
    ? `(?:^|\\s)${escapeRegExp(cue)}[a-z]*(?=\\s|$)`
    : `(?:^|\\s)${escapeRegExp(cue)}(?=\\s|$)`;
  return Math.min(cap, [...text.matchAll(new RegExp(pattern, "g"))].length);
}

function addFieldScores(scores, text, multiplier, cap) {
  const normalized = normalize(text);
  if (!normalized) return;
  for (const mood of MOOD_NAMES) {
    for (const [cue, weight] of CUES[mood]) {
      scores[mood] += countCue(normalized, cue, cap) * weight * multiplier;
    }
  }
}

export function moodDetailsFor(post) {
  const override = MOOD_OVERRIDES[post?.slug];
  if (override) {
    return {
      moods: override,
      scores: Object.fromEntries(MOOD_NAMES.map((name) => [name, override.includes(name) ? 100 : 0])),
      source: "editorial",
    };
  }

  if (isInstrumental(post)) {
    return {
      moods: [],
      scores: Object.fromEntries(MOOD_NAMES.map((name) => [name, 0])),
      source: "instrumental",
    };
  }

  const scores = Object.fromEntries(MOOD_NAMES.map((name) => [name, 0]));
  addFieldScores(scores, post?.song || post?.title, 6, 1);
  addFieldScores(scores, post?.excerpt, 2.5, 2);
  addFieldScores(scores, lyricText(post, false), 1, 4);
  addFieldScores(scores, lyricText(post, true), 0.55, 4);

  const ranked = MOOD_NAMES
    .map((name) => ({ name, score: scores[name], tie: TIE_ORDER.indexOf(name) }))
    .sort((a, b) => b.score - a.score || a.tie - b.tie);

  const primary = ranked[0].score >= 3 ? ranked[0] : { name: "Dreamy", score: 0 };
  const moods = [primary.name];
  const secondary = ranked.find((item) => item.name !== primary.name);
  const conflictKey = secondary
    ? [primary.name, secondary.name].sort().join(":")
    : "";
  if (
    secondary
    && secondary.score >= 6
    && secondary.score >= primary.score * 0.58
    && !SECONDARY_CONFLICTS.has(conflictKey)
  ) {
    moods.push(secondary.name);
  }

  return { moods, scores, source: primary.score ? "lyrics" : "fallback" };
}

export function moodsForPost(post) {
  if (Array.isArray(post?.moods)) {
    return post.moods.filter((mood) => MOOD_NAMES.includes(mood)).slice(0, 2);
  }
  return moodDetailsFor(post).moods;
}

export function primaryMoodForPost(post) {
  return moodsForPost(post)[0] || "Dreamy";
}
