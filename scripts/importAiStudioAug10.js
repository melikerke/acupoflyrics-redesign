import { execFile } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { fetchTrackBundle, searchTrackBundle } from "../server/spotify.js";
import { slugify, upsertRecordData, writePublishData } from "../server/ingest.js";

const execFileAsync = promisify(execFile);
const INPUT = "/tmp/acupoflyrics-ai-studio-aug10.json";
const REPORT = "/tmp/acupoflyrics-ai-studio-aug10-report.json";
const DEMAND_INPUT = "/tmp/acupoflyrics-ai-studio-demand.json";
const DEMAND_REPORT = "/tmp/acupoflyrics-ai-studio-demand-report.json";
const AUG12_INPUT = path.join(process.cwd(), "scripts/aiStudioAug12.raw.json");
const AUG12_REPORT = "/tmp/acupoflyrics-ai-studio-aug12-report.json";
const THAT_WAY_INPUT = path.join(process.cwd(), "scripts/aiStudioThatWay.raw.json");
const THAT_WAY_REPORT = "/tmp/acupoflyrics-ai-studio-that-way-report.json";
const AUG13_INPUT = path.join(process.cwd(), "scripts/aiStudioAug13.raw.json");
const AUG13_REPORT = "/tmp/acupoflyrics-ai-studio-aug13-report.json";
const BOUNCY_INPUT = path.join(process.cwd(), "scripts/aiStudioBouncy.raw.json");
const BOUNCY_REPORT = "/tmp/acupoflyrics-ai-studio-bouncy-report.json";
const AUG14_INPUT = path.join(process.cwd(), "scripts/aiStudioAug14.raw.json");
const AUG14_REPORT = "/tmp/acupoflyrics-ai-studio-aug14-report.json";
const AUG18_INPUT = path.join(process.cwd(), "scripts/aiStudioAug18.raw.json");
const AUG18_REPORT = "/tmp/acupoflyrics-ai-studio-aug18-report.json";
const SITE_URL = "https://www.acupoflyrics.com";

const TRACKS = [
  { label: "ARTMS — Blue Blood", artist: "ARTMS", title: "Blue Blood" },
  { label: "Morgan Wallen — Been By Now", artist: "Morgan Wallen", title: "Been By Now" },
  { label: "Alex Warren — Ordinary", artist: "Alex Warren", title: "Ordinary" },
  {
    label: "KISS OF LIFE — SWEAT",
    artist: "KISS OF LIFE",
    title: "SWEAT",
    // İkinci pre-chorus ilk pre-chorus ile aynı; AI Studio yanıtı tekrarı
    // yeniden yazmak yerine atladığı için aynı çeviri bloğunu tekrar kullan.
    translationMap: [0, 1, 2, 3, 4, 5, 2, 6, 7, 8, 9],
  },
  {
    label: "aespa feat. Ty Dolla Sign — Switchblade",
    artist: "aespa",
    artistDisplay: "aespa feat. Ty Dolla $ign",
    title: "Switchblade",
    youtubeArtist: "aespa Ty Dolla Sign",
  },
  {
    label: "FLO — Side Effects",
    artist: "FLO",
    title: "Side Effects",
    translationMap: [0, 1, 2, 3, 4, 5, 6, 7, 3, 8, 9],
  },
  {
    label: "FLO — Small Doses",
    artist: "FLO",
    title: "Small Doses",
    modelStart: "1. SMALL DOSES (KÜÇÜK DOZLAR) - TAM METİN ÇEVİRİ",
    modelEnd: "2. CRY UGLY (REZİLCE AĞLATMAK) - TAM METİN ÇEVİRİ",
  },
  {
    label: "FLO — Cry Ugly",
    artist: "FLO",
    title: "Cry Ugly",
    modelStart: "2. CRY UGLY (REZİLCE AĞLATMAK) - TAM METİN ÇEVİRİ",
    youtubeUrl: "https://www.youtube.com/watch?v=waAzBC31RHk",
  },
  { label: "FLO — Leak It", artist: "FLO", title: "Leak It" },
  { label: "FLO — Therapy at the Club", artist: "FLO", title: "Therapy at the Club" },
  { label: "FLO — Remedied", artist: "FLO", title: "Remedied" },
  { label: "FLO — Don’t Break Her Heart", artist: "FLO", title: "Don’t Break Her Heart" },
  {
    label: "PICHEOLIN — Party Rock Rock",
    artist: "Picheolin",
    artistDisplay: "PICHEOLIN",
    title: "Party Rock Rock",
    youtubeArtist: "피철인 놀아보세",
  },
  {
    label: "PICHEOLIN — ZZAN",
    artist: "Picheolin",
    artistDisplay: "PICHEOLIN",
    title: "ZZAN",
    youtubeArtist: "피철인 짠",
  },
  {
    label: "PICHEOLIN — Sincerely",
    artist: "Picheolin",
    artistDisplay: "PICHEOLIN",
    title: "Sincerely",
    youtubeArtist: "피철인 정말",
  },
  {
    label: "PICHEOLIN — Mi-cheo Mi-cheo",
    artist: "Picheolin",
    artistDisplay: "PICHEOLIN",
    title: "Mi-cheo Mi-cheo",
    youtubeArtist: "피철인 미쳐 미쳐",
  },
  {
    label: "PICHEOLIN — Love Sick",
    artist: "Picheolin",
    artistDisplay: "PICHEOLIN",
    title: "Love Sick",
    youtubeArtist: "피철인 아프지 않은 이별은 없다",
  },
  { label: "DINO — LIKE IT", artist: "DINO", title: "LIKE IT" },
  {
    label: "DAYOUNG & Jay Park — FLIRTY",
    artist: "DAYOUNG",
    artistDisplay: "DAYOUNG & Jay Park",
    title: "FLIRTY",
    youtubeArtist: "DAYOUNG Jay Park",
    translationMap: [0, 1, 2, 3, 4, 5, 6, 4, 7],
  },
  {
    batch: "demand",
    label: "ILLIT — It's Me",
    artist: "ILLIT",
    title: "It's Me",
    youtubeUrl: "https://www.youtube.com/watch?v=bMhDJ0S0OBA",
  },
  {
    batch: "demand",
    label: "aespa — LEMONADE",
    artist: "aespa",
    title: "LEMONADE",
    youtubeUrl: "https://www.youtube.com/watch?v=83C3TZ4Zm_o",
    translationMap: [0, 1, 11, 2, 4, 5, 6, 7, 8, 9, 10, 8, 11],
  },
  {
    batch: "demand",
    label: "RESCENE — LOVE ATTACK",
    artist: "RESCENE",
    title: "LOVE ATTACK",
    youtubeUrl: "https://www.youtube.com/watch?v=9XttLI0oH0I",
    translationMap: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 6, 11, 12, 13, 14],
  },
  {
    batch: "demand",
    label: "KATSEYE — PINKY UP",
    artist: "KATSEYE",
    title: "PINKY UP",
    youtubeUrl: "https://www.youtube.com/watch?v=8g7VclWsiaM",
  },
  {
    batch: "demand",
    label: "LE SSERAFIM — BOOMPALA",
    artist: "LE SSERAFIM",
    title: "BOOMPALA",
    youtubeUrl: "https://www.youtube.com/watch?v=Gnn4GRSzRXI",
  },
  {
    batch: "aug12",
    sourceKey: "camera",
    label: "Charli xcx — Camera",
    artist: "Charli xcx",
    title: "Camera",
    youtubeUrl: "https://www.youtube.com/watch?v=eO3zsYsDnbI",
  },
  {
    batch: "aug12",
    sourceKey: "handle",
    label: "Ravyn Lenae — Handle",
    artist: "Ravyn Lenae",
    title: "Handle",
    youtubeUrl: "https://www.youtube.com/watch?v=e2MS5f3Mnn8",
    translationMap: [0, 1, 2, 3, 4, 5, 6, 3, 7, 8, 9, 3, 10, 11, 12],
  },
  {
    batch: "aug12",
    sourceKey: "girlInNewYork",
    label: "ROLE MODEL — Girl In New York",
    artist: "ROLE MODEL",
    title: "Girl In New York",
    spotifyTitle: "girl in new york",
    youtubeUrl: "https://www.youtube.com/watch?v=eJJxYMfOJ1M",
  },
  {
    batch: "aug12",
    sourceKey: "whereIsMyHusband",
    label: "RAYE — WHERE IS MY HUSBAND!",
    artist: "RAYE",
    title: "WHERE IS MY HUSBAND!",
    youtubeUrl: "https://www.youtube.com/watch?v=rK5TyISxZ_M",
  },
  {
    batch: "aug12",
    sourceKey: "ever2Late",
    label: "KiiiKiii — Ever2Late!",
    artist: "KiiiKiii",
    title: "Ever2Late!",
    youtubeUrl: "https://www.youtube.com/watch?v=G6uhnkDPca8",
  },
  {
    batch: "aug12",
    sourceKey: "pinata",
    label: "NCT 127 — Piñata",
    artist: "NCT 127",
    title: "Piñata",
    slug: "nct-127-pinata-turkce-ceviri",
    legacySlugs: ["nct-127-pin-ata-turkce-ceviri"],
    youtubeUrl: "https://www.youtube.com/watch?v=s8BOZFalBI8",
    noSpotifyTrack: true,
    spotifyFallbackTrackUrl: "https://open.spotify.com/track/2nNBdv2vcJZuWOZ06nNF62",
    releaseDate: "2026-08-12",
    cover: "https://i.ytimg.com/vi/s8BOZFalBI8/maxresdefault.jpg",
  },
  {
    batch: "aug12",
    sourceKey: "visionWings",
    label: "WayV — Vision Wings",
    artist: "WayV",
    title: "Vision Wings",
    spotifyTitle: "鸢 (Vision Wings)",
    forceRomanize: true,
    youtubeUrl: "https://www.youtube.com/watch?v=bfQ0eLJNWiw",
    translationMap: [0, 1, 2, 3, 4, 5, 6, 7, 8, null, 7, 9],
    translationOverrides: {
      9: [
        "Uçmaya devam;",
        "Bir uçurtma biçimindeki hayal gücüyle;",
        "Saldırı anını bekliyorum, sakin kalacağım;",
        "Gece gündüz güçlü kalacağım. (Bir lotus gibi süzülerek)",
      ],
    },
  },
  {
    batch: "aug12",
    sourceKey: "popOffPopOff",
    label: "KiiiKiii — Pop Off Pop Off",
    artist: "KiiiKiii",
    title: "Pop Off Pop Off",
    youtubeUrl: "https://www.youtube.com/watch?v=UsbRoaH6y-Q",
    translationMap: [0, 1, 2, 3, 4, 5, 2, 6, 7, 8],
  },
  {
    batch: "thatway",
    sourceKey: "thatWay",
    label: "KATSEYE — That Way",
    artist: "KATSEYE",
    title: "That Way",
    translationMap: [0, 1, 2, 0, 4, 2, 0, 7],
    noSpotifyTrack: true,
    spotifyFallbackTrackUrl: "https://open.spotify.com/track/4KmkJjHTNlr1jFY56Lyz4E",
    albumName: "WILD",
    albumType: "EP",
    albumUrl: "https://music.apple.com/us/album/wild-ep/1891779764",
    appleMusicUrl: "https://music.apple.com/us/song/that-way/1891779779",
    releaseDate: "2026-08-14",
    cover: "https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/e2/28/92/e22892a7-fe88-72cf-ecba-691030dfcf7e/26UMGIM41151.rgb.jpg/1200x1200bb.jpg",
    skipYoutube: true,
    releaseStatus: "14 Ağustos 2026'da yayımlanacak",
    performanceSource: "Klub KATSEYE · Spotify canlı performansı",
  },
  {
    batch: "aug13",
    sourceKey: "trainingSeason",
    label: "Dua Lipa — Training Season",
    artist: "Dua Lipa",
    title: "Training Season",
    youtubeUrl: "https://www.youtube.com/watch?v=ZjBZ8MUnB0E",
  },
  {
    batch: "aug13",
    sourceKey: "aintInLa",
    label: "ADÉLA — Ain't In LA",
    artist: "ADÉLA",
    title: "Ain't In LA",
    slug: "adela-aint-in-la-turkce-ceviri",
    legacySlugs: ["ade-la-ain-t-in-la-turkce-ceviri"],
    youtubeUrl: "https://www.youtube.com/watch?v=0ijm2Xui5N8",
  },
  {
    batch: "aug13",
    sourceKey: "myBodyIsntReady",
    label: "sombr — My Body Isn't Ready",
    artist: "sombr",
    title: "My Body Isn't Ready",
    slug: "sombr-my-body-isnt-ready-turkce-ceviri",
    legacySlugs: ["sombr-my-body-isn-t-ready-turkce-ceviri"],
    youtubeUrl: "https://www.youtube.com/watch?v=ofywN3NgGqY",
  },
  {
    batch: "aug13",
    sourceKey: "tenReasonsToDateMe",
    label: "AxMxP — 10 Reasons to Date Me",
    artist: "AxMxP",
    title: "10 Reasons to Date Me",
    skipYoutube: true,
  },
  {
    batch: "aug13",
    sourceKey: "heyHi",
    label: "KiiiKiii — Hey Hi",
    artist: "KiiiKiii",
    title: "Hey Hi",
    skipYoutube: true,
  },
  {
    batch: "bouncy",
    sourceKey: "bouncy",
    label: "ATEEZ — BOUNCY (K-HOT CHILLI PEPPERS)",
    artist: "ATEEZ",
    title: "BOUNCY (K-HOT CHILLI PEPPERS)",
    slug: "ateez-bouncy-k-hot-chilli-peppers-turkce-ceviri",
    youtubeUrl: "https://www.youtube.com/watch?v=U0G5OA6ZH5w",
  },
  {
    batch: "aug14",
    sourceKey: "hootie",
    label: "KATSEYE — Hootie Frutti",
    artist: "KATSEYE",
    title: "Hootie Frutti",
    youtubeUrl: "https://www.youtube.com/watch?v=is8UDe2PhKQ",
  },
  {
    batch: "aug14",
    sourceKey: "belAir",
    label: "KATSEYE — Bel Air",
    artist: "KATSEYE",
    title: "Bel Air",
    youtubeUrl: "https://www.youtube.com/watch?v=oMvXwtmYVWc",
  },
  {
    batch: "aug14",
    sourceKey: "thatWayStudio",
    label: "KATSEYE — That Way",
    artist: "KATSEYE",
    title: "That Way",
    slug: "katseye-that-way-turkce-ceviri",
    youtubeUrl: "https://www.youtube.com/watch?v=DgFemuNxBrk",
    appleMusicUrl: "https://music.apple.com/us/song/that-way/1891779779",
    removeReleaseStatus: true,
    removePerformanceSource: true,
    annotationOverrides: [
      { word: "the door is that way", text: "Ayak uyduramıyorsan kapı orada, gidebilirsin anlamında doğrudan bir meydan okuma." },
      { word: "Shopping in the window", text: "Birini ciddi bir ilişkiye başlamadan önce inceleme ve değerlendirme metaforu." },
      { word: "mic drop", text: "Bir tartışmayı güçlü ve kesin bir hareketle bitirmeyi anlatan popüler kültür ifadesi." },
    ],
  },
  {
    batch: "aug14",
    sourceKey: "shesTheBest",
    label: "Troye Sivan — She’s the Best",
    artist: "Troye Sivan",
    title: "She’s the Best",
    slug: "troye-sivan-shes-the-best-turkce-ceviri",
    youtubeUrl: "https://www.youtube.com/watch?v=mFA1P8ZzoLw",
    annotationOverrides: [
      { word: "cum stain", text: "Açık cinsel içerikli ifade; karakterin özensiz ve toplumsal beklentileri umursamayan görünümünü vurguluyor." },
      { word: "Moodboard", text: "Belirli bir estetik veya gelecek fikri için ilham verici görsellerin toplandığı pano." },
      { word: "incel", text: "Çoğu zaman kadın düşmanı söylemlerle ilişkilendirilen çevrim içi bir altkültür terimi." },
    ],
  },
  {
    batch: "aug14",
    sourceKey: "cntrl",
    label: "Becky G — CNTRL",
    artist: "Becky G",
    title: "CNTRL",
    youtubeUrl: "https://www.youtube.com/watch?v=j0MOFslqpSw",
    translationOverrides: {
      3: [
        "Kontrolü elimde tutuyorum;",
        "Keyfime bakıyor, planlar yapıyorum;",
        "Perreo yapıyor, giderek keskinleşiyorum;",
        "Yiyip bitiriyor, podyumda süzülüyorum...",
      ],
      7: [
        "Kontrolü elimde tutuyorum;",
        "Keyfime bakıyor, planlar yapıyorum;",
        "Perreo yapıyor, giderek keskinleşiyorum;",
        "Yiyip bitiriyor, podyumda süzülüyorum...",
      ],
    },
  },
  {
    batch: "aug18",
    sourceKey: "soEasy",
    label: "Olivia Dean — So Easy (To Fall In Love)",
    artist: "Olivia Dean",
    title: "So Easy (To Fall In Love)",
    youtubeUrl: "https://www.youtube.com/watch?v=FX1_FXlKxXY",
    annotationOverrides: [
      { word: "icing on your cake, the cherry on the top", text: "Bir şeyi tamamlayan en güzel son dokunuşu anlatan iki yakın İngilizce imge." },
      { word: "Saturday night and the rest of your life", text: "Cumartesi gecesinin heyecanıyla uzun süreli bir ilişkinin güvenini aynı kişide buluşturuyor." },
      { word: "one night could turn into three", text: "Tek gecelik bir buluşmanın birkaç güne uzayabilecek kadar güçlü bir çekime dönüşmesini anlatıyor." },
    ],
  },
  {
    batch: "aug18",
    sourceKey: "beHer",
    label: "Ella Langley — Be Her",
    artist: "Ella Langley",
    title: "Be Her",
    annotationOverrides: [
      { word: "state of mind", text: "Zenginliği maddi varlıktan çok kişinin bakış açısı ve iç huzuruyla ilişkilendiriyor." },
      { word: "mile high", text: "Yükseklerdeki lüks yaşamı ve özel uçuşları temsil eden bir ifade." },
      { word: "walk one in her heels", text: "Başka birinin hayatını onun yerinde yaşayabilmeyi anlatan, ayakkabı üzerinden kurulan bir empati metaforu." },
    ],
  },
  {
    batch: "aug18",
    sourceKey: "loser",
    label: "Tame Impala — Loser",
    artist: "Tame Impala",
    title: "Loser",
    youtubeUrl: "https://www.youtube.com/watch?v=s3a4OQR-10M",
    annotationOverrides: [
      { word: "So much for closure", text: "Beklenen vedanın veya duygusal kapanışın işe yaramadığını belirten hayal kırıklığı ifadesi." },
      { word: "Desperate times call for desperate measures", text: "Çaresiz durumların alışılmadık ve sert önlemler gerektirebileceğini anlatan İngilizce deyim." },
      { word: "magnified it", text: "Bir sorunu çözmek yerine zihinde büyütüp daha ağır hale getirmek anlamında kullanılıyor." },
    ],
  },
  {
    batch: "aug18",
    sourceKey: "conexionPsiquica",
    label: "Aitana — Conexión Psíquica",
    artist: "Aitana",
    title: "Conexión Psíquica",
    slug: "aitana-conexion-psiquica-turkce-ceviri",
    translationMap: [0, 1, 2, 3, 4, 5, 6, 5],
    sectionOverrides: ["Verse 1", "Pre-Chorus", "Chorus", "Verse 2", "Pre-Chorus", "Chorus", "Bridge", "Chorus"],
    annotationOverrides: [
      { word: "conexión psíquica", text: "İki kişi arasında söze ihtiyaç bırakmayan, zihinsel ve sezgisel bir bağ." },
      { word: "que me lleven presa", text: "Yapılan şey yanlışsa bile sonuçlarını göze alacak kadar kararlı olmayı anlatan meydan okuma." },
      { word: "bajo la mesa", text: "Başkalarından gizlenen yakınlığı masa altı görüntüsü üzerinden kuruyor." },
      { word: "buena suerte", text: "Gerçeği öğrenecek eski sevgiliye yöneltilen alaycı bir ‘bol şans’ ifadesi." },
    ],
  },
];

const INITIALS = ["g", "kk", "n", "d", "tt", "r", "m", "b", "pp", "s", "ss", "", "j", "jj", "ch", "k", "t", "p", "h"];
const VOWELS = ["a", "ae", "ya", "yae", "eo", "e", "yeo", "ye", "o", "wa", "wae", "oe", "yo", "u", "wo", "we", "wi", "yu", "eu", "ui", "i"];
const FINALS = ["", "k", "k", "ks", "n", "nj", "nh", "t", "l", "lk", "lm", "lp", "ls", "lt", "lp", "lh", "m", "p", "ps", "t", "t", "ng", "t", "t", "k", "t", "p", "h"];

function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    const absolute = path.join(process.cwd(), file);
    if (!existsSync(absolute)) continue;
    for (const line of readFileSync(absolute, "utf8").split(/\r?\n/)) {
      const match = line.trim().match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (!match || process.env[match[1]]) continue;
      process.env[match[1]] = match[2].trim().replace(/^["']|["']$/g, "");
    }
  }
}

function stripTurnChrome(value) {
  const source = Array.isArray(value) ? value.join("\n") : String(value || "");
  const lines = source.replace(/\r/g, "").split("\n");
  while (["edit", "more_vert", ""].includes((lines[0] || "").trim())) lines.shift();
  if (/^(?:User|Model)\s+\d{1,2}:\d{2}\s*[AP]M$/i.test((lines[0] || "").replace(/[\u202f\u00a0]/g, " ").trim())) {
    lines.shift();
  }
  while (!(lines[0] || "").trim()) lines.shift();
  return lines.join("\n").trim();
}

function isMetadataHeading(section) {
  return /(?:가사|lyrics|letra|songtext)/i.test(section) || /["“”].+["“”]/.test(section);
}

function parseStanzas(value) {
  const stanzas = [];
  let current = null;
  const flush = () => {
    if (current?.lines.length) stanzas.push(current);
    current = null;
  };

  for (const rawLine of String(value || "").split("\n")) {
    const line = rawLine.trim();
    const heading = line.match(/^\[(.+)]$/);
    if (heading) {
      flush();
      if (!isMetadataHeading(heading[1])) current = { section: heading[1].trim(), lines: [] };
      continue;
    }
    if (current && line && !line.startsWith("|||")) current.lines.push(line);
  }
  flush();
  return stanzas;
}

function cropTranslation(model, track) {
  let body = stripTurnChrome(model);
  if (track.modelStart) {
    const start = body.indexOf(track.modelStart);
    if (start < 0) throw new Error(`${track.label}: çeviri başlangıcı bulunamadı.`);
    body = body.slice(start + track.modelStart.length);
  }
  if (track.modelEnd) {
    const end = body.indexOf(track.modelEnd);
    if (end < 0) throw new Error(`${track.label}: çeviri bitişi bulunamadı.`);
    body = body.slice(0, end);
  }
  const stopIndexes = ["\nAnaliz:", "\nÇeviri Notları"]
    .map((marker) => body.indexOf(marker))
    .filter((index) => index >= 0);
  if (stopIndexes.length) body = body.slice(0, Math.min(...stopIndexes));
  const firstHeading = body.search(/^\[[^\n]+]$/m);
  if (firstHeading < 0) throw new Error(`${track.label}: ilk kıta başlığı bulunamadı.`);
  return body.slice(firstHeading).trim();
}

function romanizeHangul(value) {
  let output = "";
  for (const character of value) {
    const code = character.charCodeAt(0);
    if (code < 0xac00 || code > 0xd7a3) {
      output += character;
      continue;
    }
    const offset = code - 0xac00;
    const initial = Math.floor(offset / 588);
    const vowel = Math.floor((offset % 588) / 28);
    const final = offset % 28;
    output += `${INITIALS[initial]}${VOWELS[vowel]}${FINALS[final]}`;
  }
  return output;
}

const PINYIN_PHRASES = new Map([
  ["我爱你", "Wo ai ni"],
  ["以鸢为形的想象", "Yi yuan wei xing de xiangxiang"],
  ["等待出击", "Dengdai chuji"],
  ["埋伏等飞行", "Maifu deng feixing"],
  ["等飞行", "Deng feixing"],
  ["仁者无畏", "Renzhe wuwei"],
  ["运分毫不差", "Yun fenhao bu cha"],
  ["圆开到最大", "Yuan kai dao zui da"],
  ["羽翼为我张开", "Yuyi wei wo zhangkai"],
  ["划破等待", "Huapo dengdai"],
  ["大雨连接地与天", "Dayu lianjie di yu tian"],
  ["黑与白无极之间", "Hei yu bai wuji zhijian"],
  ["风生水起化成鸢", "Fengshengshuiqi hua cheng yuan"],
  ["鸢飞划破天际", "Yuan fei huapo tianji"],
  ["辟地开天", "Pidi kaitian"],
  ["目光俯瞰世界", "Muguang fukan shijie"],
  ["定数", "Dingshu"],
  ["胜负", "Shengfu"],
  ["自有来路", "Ziyou lailu"],
  ["万境更迭加速", "Wanjing gengdie jiasu"],
  ["看不见的距离", "Kan bu jian de juli"],
  ["手掌握着觉醒", "Shouzhang wozhe juexing"],
  ["万千张的脸孔", "Wanqian zhang de liankong"],
  ["看向天的疆界", "Kan xiang tian de jiangjie"],
  ["俯瞰世界", "Fukan shijie"],
  ["鸢", "Yuan"],
]);

function romanizeCjk(value) {
  let output = value;
  for (const [source, romanized] of PINYIN_PHRASES) output = output.replaceAll(source, romanized);
  if (/\p{Script=Han}/u.test(output)) {
    throw new Error(`Romanize edilmemiş Çince dize kaldı: ${output}`);
  }
  return output;
}

const PRESERVED_ADLIBS = /^(?:ah+|ayy+|eh+|ha+|hey+|huh+|nah|ooh+|oh+|uh+|woo(?:-hoo)?|woah+|yeah+|what|meow)(?:[,.!?'\s-]+(?:ah+|ayy+|eh+|ha+|hey+|huh+|nah|ooh+|oh+|uh+|woo(?:-hoo)?|woah+|yeah+|what|meow))*[.!?]?$/i;

function cleanTranslationLine(value) {
  return String(value || "")
    .replace(/[¹²³⁴⁵⁶⁷⁸⁹⁰]+/g, "")
    .replace(/\s*\(([^)]*[A-Za-z][^)]*)\)/g, (whole, content) => (
      PRESERVED_ADLIBS.test(content.trim()) ? whole : ""
    ))
    .replace(/\s+([,.;!?])/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function actualMatchedTerm(candidate, lyrics) {
  const clean = String(candidate || "")
    .replace(/^[¹²³⁴⁵⁶⁷⁸⁹⁰\d.\-*\s]+/, "")
    .replace(/\*/g, "")
    .replace(/^['"“”]+|['"“”]+$/g, "")
    .replace(/\s*\([^)]*\)\s*$/, "")
    .trim();
  if (clean.length < 3 || clean.length > 70) return null;
  const escaped = clean.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = lyrics.match(new RegExp(escaped, "iu"));
  return match?.[0] || null;
}

function inlineAnnotations(translationBody, lyricalText) {
  const notes = new Map();
  for (const rawLine of translationBody.split("\n")) {
    const line = rawLine.trim();
    if (!line.startsWith("|||")) continue;
    const note = line.replace(/^\|\|\|\s*/, "").replace(/\*/g, "").trim();
    const colon = note.indexOf(":");
    if (colon < 1) continue;
    const heading = note.slice(0, colon);
    const candidates = [heading];
    for (const match of heading.matchAll(/["“”']([^"“”']{2,70})["“”']/g)) candidates.push(match[1]);
    for (const match of heading.matchAll(/\(([^)]{2,70})\)/g)) candidates.push(match[1]);
    for (const candidate of [...candidates]) {
      if (/[\uac00-\ud7a3]/.test(candidate)) candidates.push(romanizeHangul(candidate));
      if (/\p{Script=Han}/u.test(candidate)) candidates.push(romanizeCjk(candidate));
    }
    const matched = candidates.map((candidate) => actualMatchedTerm(candidate, lyricalText)).find(Boolean);
    if (matched && !notes.has(matched)) notes.set(matched, note);
  }
  return [...notes.entries()].map(([word, text]) => ({ word, text }));
}

function analysisAnnotations(model, lyricalText) {
  const body = stripTurnChrome(model);
  const markers = ["Analiz:", "Çeviri Notları"];
  const indexes = markers.map((marker) => body.indexOf(marker)).filter((index) => index >= 0);
  if (!indexes.length) return [];
  const tail = body.slice(Math.min(...indexes)).replace(/\n(?:thumb_up|thumb_down|\d+(?:\.\d+)?s)\s*$/g, "");
  const notes = new Map();

  for (const paragraph of tail.split(/\n\s*\n/).slice(1)) {
    const compact = paragraph.replace(/\s+/g, " ").trim();
    if (!compact || /(?:sence|Bir sonrakine)/i.test(compact)) continue;
    const colon = compact.indexOf(":");
    const candidates = [];
    if (colon > 0 && colon < 90) candidates.push(compact.slice(0, colon));
    for (const match of compact.matchAll(/["“”']([^"“”']{3,70})["“”']/g)) candidates.push(match[1]);
    for (const candidate of candidates) {
      const matched = actualMatchedTerm(candidate, lyricalText);
      if (matched && !notes.has(matched)) notes.set(matched, compact);
    }
  }
  return [...notes.entries()].slice(0, 12).map(([word, text]) => ({ word, text }));
}

function parseTrack(source, track) {
  if (!source?.user || !source?.model) throw new Error(`${track.label}: orijinal söz veya çeviri eksik.`);
  const originalBody = stripTurnChrome(source.user);
  const originalStanzas = parseStanzas(originalBody);
  const translatedBody = cropTranslation(source.model, track);
  const translatedStanzas = parseStanzas(translatedBody);
  const translationMap = track.translationMap || originalStanzas.map((_, index) => index);
  if (
    !originalStanzas.length
    || translationMap.length !== originalStanzas.length
    || translationMap.some((index, stanzaIndex) => index == null && !track.translationOverrides?.[stanzaIndex])
    || translationMap.some((index, stanzaIndex) => index != null && !translatedStanzas[index] && !track.translationOverrides?.[stanzaIndex])
  ) {
    throw new Error(`${track.label}: kıta sayıları eşleşmiyor (${originalStanzas.length}/${translatedStanzas.length}).`);
  }

  const hasHangul = /[\uac00-\ud7a3]/.test(originalBody);
  const hasHan = /\p{Script=Han}/u.test(originalBody);
  const stanzas = originalStanzas.map((stanza, index) => ({
    section: track.sectionOverrides?.[index] || stanza.section,
    original: stanza.lines.map((line) => {
      const corrected = line.replace("차오르은 feel", "차오르는 feel");
      const hangulRomanized = hasHangul ? romanizeHangul(corrected) : corrected;
      return hasHan || track.forceRomanize ? romanizeCjk(hangulRomanized) : hangulRomanized;
    }),
    translation: (track.translationOverrides?.[index] || translatedStanzas[translationMap[index]].lines)
      .map(cleanTranslationLine)
      .filter(Boolean),
    notes: [],
  }));
  const lyricalText = stanzas.flatMap((stanza) => [...stanza.original, ...stanza.translation]).join("\n");
  const annotationCandidates = ["aug12", "aug13", "thatway", "aug14", "aug18"].includes(track.batch)
    ? inlineAnnotations(translatedBody, lyricalText)
    : [...inlineAnnotations(translatedBody, lyricalText), ...analysisAnnotations(source.model, lyricalText)];
  const notes = new Map();
  for (const note of annotationCandidates) {
    if (!notes.has(note.word)) notes.set(note.word, note.text);
  }
  stanzas[0].notes = track.annotationOverrides
    || [...notes.entries()].slice(0, 16).map(([word, text]) => ({ word, text }));
  return { ...track, hasHangul, hasHan, stanzas };
}

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function youtubeScore(entry, track, durationSeconds) {
  const title = normalize(entry.title);
  const wanted = normalize(track.title);
  const artist = normalize(track.youtubeArtist || track.artist);
  const channel = normalize(entry.channel || entry.uploader);
  let score = 0;
  if (title === wanted) score += 12;
  else if (title.includes(wanted)) score += 8;
  const artistWords = artist.split(" ").filter((word) => word.length > 2);
  const titleAndChannel = `${title} ${channel}`;
  score += Math.min(6, artistWords.filter((word) => titleAndChannel.includes(word)).length * 2);
  const primaryArtist = normalize(track.artist);
  const isArtistChannel = channel === primaryArtist || channel === `${primaryArtist} official`;
  if (isArtistChannel) score += 4;
  if (/(official|music video|official audio|visualizer|topic)/i.test(`${entry.title} ${entry.channel || ""}`)) score += 3;
  if (/(lyrics?|color coded|reaction|cover|sped up|slowed|karaoke|line distribution|demo version|instrumental)/i.test(entry.title || "")) {
    score -= isArtistChannel && /lyric/i.test(entry.title || "") ? 1 : 8;
  }
  const candidateDuration = Number(entry.duration || 0);
  if (durationSeconds && candidateDuration) {
    const difference = Math.abs(durationSeconds - candidateDuration);
    if (difference <= 4) score += 4;
    else if (difference <= 12) score += 2;
    else if (difference > 45) score -= 3;
  }
  return score;
}

async function findYoutube(track, spotifyBundle) {
  if (track.youtubeUrl) {
    return {
      selected: {
        id: track.youtubeUrl.split("v=")[1],
        title: `${track.artist} - ${track.title} (Official Video)`,
        channel: track.artist,
        duration: null,
        score: 99,
        url: track.youtubeUrl,
      },
      candidates: [],
    };
  }
  const query = `${track.youtubeArtist || track.artist} ${track.title} official audio`;
  const { stdout } = await execFileAsync("yt-dlp", [
    "--flat-playlist",
    "--dump-single-json",
    "--no-warnings",
    `ytsearch8:${query}`,
  ], { maxBuffer: 20 * 1024 * 1024, timeout: 90_000 });
  const result = JSON.parse(stdout);
  const durationSeconds = spotifyBundle.track?.durationMs ? Math.round(spotifyBundle.track.durationMs / 1000) : null;
  const candidates = (result.entries || [])
    .filter((entry) => entry?.id && entry?.title)
    .map((entry) => ({
      id: entry.id,
      title: entry.title,
      channel: entry.channel || entry.uploader || null,
      duration: entry.duration || null,
      score: youtubeScore(entry, track, durationSeconds),
      url: `https://www.youtube.com/watch?v=${entry.id}`,
    }))
    .sort((a, b) => b.score - a.score);
  if (!candidates.length || candidates[0].score < 8) {
    throw new Error(`${track.label}: güvenilir YouTube eşleşmesi bulunamadı.`);
  }
  return { selected: candidates[0], candidates: candidates.slice(0, 4) };
}

function descriptionFor(track, bundle) {
  const artist = track.artistDisplay || track.artist;
  const romanized = track.hasHangul || track.hasHan ? ", romanize okunuşu" : "";
  const album = bundle.album?.name && bundle.album.name !== track.title ? ` ${bundle.album.name} albümündeki parçanın` : " Parçanın";
  const detailed = `${artist} – ${track.title} şarkı sözleri${romanized} ve özenli Türkçe çevirisi.${album} anlamını ve açıklamalarını keşfet.`;
  if (detailed.length <= 160) return detailed;
  return `${artist} – ${track.title} şarkı sözleri${romanized} ve Türkçe çevirisi. Parçanın anlamını keşfet.`;
}

async function main() {
  loadEnv();
  const write = process.argv.includes("--write");
  const parseOnly = process.argv.includes("--parse-only");
  const demandBatch = process.argv.includes("--demand");
  const aug12Batch = process.argv.includes("--aug12");
  const thatWayBatch = process.argv.includes("--that-way");
  const aug13Batch = process.argv.includes("--aug13");
  const bouncyBatch = process.argv.includes("--bouncy");
  const aug14Batch = process.argv.includes("--aug14");
  const aug18Batch = process.argv.includes("--aug18");
  const inputPath = aug18Batch ? AUG18_INPUT : aug14Batch ? AUG14_INPUT : bouncyBatch ? BOUNCY_INPUT : aug13Batch ? AUG13_INPUT : thatWayBatch ? THAT_WAY_INPUT : aug12Batch ? AUG12_INPUT : demandBatch ? DEMAND_INPUT : INPUT;
  const reportPath = aug18Batch ? AUG18_REPORT : aug14Batch ? AUG14_REPORT : bouncyBatch ? BOUNCY_REPORT : aug13Batch ? AUG13_REPORT : thatWayBatch ? THAT_WAY_REPORT : aug12Batch ? AUG12_REPORT : demandBatch ? DEMAND_REPORT : REPORT;
  const selectedTracks = TRACKS.filter((track) => (
    aug18Batch ? track.batch === "aug18" : aug14Batch ? track.batch === "aug14" : bouncyBatch ? track.batch === "bouncy" : aug13Batch ? track.batch === "aug13" : thatWayBatch ? track.batch === "thatway" : aug12Batch ? track.batch === "aug12" : demandBatch ? track.batch === "demand" : !track.batch
  ));
  const extracted = JSON.parse(await readFile(inputPath, "utf8"));
  const byLabel = new Map(extracted.items.map((item) => [item.key || item.label, item]));
  const parsed = selectedTracks.map((track) => parseTrack(byLabel.get(track.sourceKey || track.label), track));

  console.table(parsed.map((track) => ({
    artist: track.artistDisplay || track.artist,
    song: track.title,
    stanzas: track.stanzas.length,
    lines: track.stanzas.reduce((sum, stanza) => sum + stanza.original.length, 0),
    notes: track.stanzas[0].notes.length,
    romanized: track.hasHangul || track.hasHan,
  })));
  if (parseOnly) return;

  const credentials = {
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  };
  const enriched = [];
  for (const track of parsed) {
    if (track.noSpotifyTrack) {
      const fallback = await fetchTrackBundle(track.spotifyFallbackTrackUrl, credentials);
      const spotifyBundle = {
        track: {
          id: null,
          name: track.title,
          url: null,
          isrc: null,
          durationMs: null,
          duration: null,
          explicit: false,
          popularity: null,
          trackNumber: 1,
          previewUrl: null,
        },
        artist: fallback.artist,
        artists: [fallback.artist].map(({ id, name, url }) => ({ id, name, url })),
        album: {
          id: null,
          name: track.albumName || track.title,
          url: track.albumUrl || null,
          cover: track.cover,
          artists: [{ id: fallback.artist.id, name: fallback.artist.name, url: fallback.artist.url }],
          releaseDate: track.releaseDate,
          releaseDatePrecision: "day",
          albumType: track.albumType || "Single",
          rawAlbumType: "single",
          label: null,
          copyrights: [],
          totalTracks: track.albumType === "EP" ? 6 : 1,
          tracks: [],
        },
        fetchedAt: new Date().toISOString(),
      };
      console.log(`Spotify — ${track.label}: resmi parça henüz yok; sanatçı bilgisi kullanıldı.`);
      enriched.push({ ...track, spotify: spotifyBundle, spotifyScore: null });
      continue;
    }
    const spotify = await searchTrackBundle({ artist: track.artist, title: track.spotifyTitle || track.title }, credentials);
    if (!spotify.matched) {
      const candidates = spotify.candidates?.map((candidate) => `${candidate.artist} — ${candidate.name}`).join(" | ");
      throw new Error(`${track.label}: Spotify eşleşmedi. ${candidates || "Aday yok."}`);
    }
    console.log(`Spotify ✓ ${track.label}: ${spotify.bundle.track.name} — ${spotify.bundle.album.name}`);
    enriched.push({ ...track, spotify: spotify.bundle, spotifyScore: spotify.score });
  }

  let youtubeCursor = 0;
  async function youtubeWorker() {
    while (youtubeCursor < enriched.length) {
      const index = youtubeCursor++;
      const track = enriched[index];
      if (track.skipYoutube) {
        track.youtube = { selected: null, candidates: [] };
        console.log(`YouTube — ${track.label}: resmi video henüz yok; eklenmedi.`);
        continue;
      }
      track.youtube = await findYoutube(track, track.spotify);
      console.log(`YouTube ✓ ${track.label}: ${track.youtube.selected.title} [${track.youtube.selected.score}]`);
    }
  }
  await Promise.all(Array.from({ length: 3 }, () => youtubeWorker()));

  const report = enriched.map((track) => ({
    label: track.label,
    spotify: {
      score: track.spotifyScore,
      title: track.spotify.track.name,
      artist: track.spotify.artists.map((artist) => artist.name).join(", "),
      album: track.spotify.album.name,
      url: track.spotify.track.url,
    },
    youtube: track.youtube,
    stanzaCount: track.stanzas.length,
    romanized: track.hasHangul || track.hasHan,
  }));
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(`Eşleşme raporu: ${reportPath}`);
  if (!write) {
    console.log("Veri dosyaları değiştirilmedi. Yazmak için --write kullanın.");
    return;
  }

  let posts = JSON.parse(await readFile(path.join(process.cwd(), "src/data/posts.json"), "utf8"));
  let artists = JSON.parse(await readFile(path.join(process.cwd(), "src/data/artists.json"), "utf8"));
  for (const track of enriched) {
    if (!track.slug || !track.legacySlugs?.length) continue;
    const legacyPost = posts.find((item) => track.legacySlugs.includes(item.slug));
    if (!legacyPost) continue;
    legacyPost.slug = track.slug;
    if (legacyPost.seo) legacyPost.seo.canonical = `${SITE_URL}/${track.slug}/`;
  }
  const results = [];
  for (const track of enriched) {
    const record = {
      song: track.title,
      slug: track.slug,
      artist: track.artistDisplay || track.artist,
      spotify: track.spotify,
      stanzas: track.stanzas,
      youtubeUrl: track.youtube.selected?.url || null,
      savedAt: new Date().toISOString(),
      source: "ai-studio-spotify-youtube",
    };
    const updated = upsertRecordData(record, posts, artists);
    posts = updated.posts;
    artists = updated.artists;
    const post = posts.find((item) => item.slug === updated.result.slug);
    post.source = "ai-studio-spotify-youtube";
    if (track.releaseStatus) post.releaseStatus = track.releaseStatus;
    if (track.performanceSource) post.performanceSource = track.performanceSource;
    if (track.appleMusicUrl) post.appleMusicUrl = track.appleMusicUrl;
    if (track.removeReleaseStatus) delete post.releaseStatus;
    if (track.removePerformanceSource) delete post.performanceSource;
    post.seo = {
      title: post.title,
      description: descriptionFor(track, track.spotify),
      canonical: `${SITE_URL}/${post.slug}/`,
    };
    results.push(updated.result);
  }
  await writePublishData({ posts, artists });
  console.table(results.map((result) => ({ title: result.title, slug: result.slug, updated: result.updated })));
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
