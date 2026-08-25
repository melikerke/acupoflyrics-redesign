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
const BIIIG_INPUT = path.join(process.cwd(), "scripts/aiStudioBiiiG.raw.json");
const BIIIG_REPORT = "/tmp/acupoflyrics-ai-studio-biiig-report.json";
const AUG21_INPUT = path.join(process.cwd(), "scripts/aiStudioAug21.raw.json");
const AUG21_REPORT = "/tmp/acupoflyrics-ai-studio-aug21-report.json";
const KORKMAM_INPUT = path.join(process.cwd(), "scripts/aiStudioKorkmamBen.raw.json");
const KORKMAM_REPORT = "/tmp/acupoflyrics-ai-studio-korkmam-ben-report.json";
const BTBT_INPUT = path.join(process.cwd(), "scripts/aiStudioBtbt.raw.json");
const BTBT_REPORT = "/tmp/acupoflyrics-ai-studio-btbt-report.json";
const THUNDER_INPUT = path.join(process.cwd(), "scripts/aiStudioThunder.raw.json");
const THUNDER_REPORT = "/tmp/acupoflyrics-ai-studio-thunder-report.json";
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
    annotationKeyHints: [null, null, "silahın namlusuna"],
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
    annotationKeyHints: ["Yalnız başıma akrobasiler yapıyorum"],
  },
  {
    batch: "aug12",
    sourceKey: "ever2Late",
    label: "KiiiKiii — Ever2Late!",
    artist: "KiiiKiii",
    title: "Ever2Late!",
    youtubeUrl: "https://www.youtube.com/watch?v=G6uhnkDPca8",
    annotationKeyHints: ["ebesi olmayan"],
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
    annotationKeyHints: [
      "Bir uçurtmanın",
      "Siyahın ve beyazın o sonsuz döngüsünde",
      "Shaolin",
    ],
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
    annotationKeyHints: [
      "Kapı işte tam orada",
      "Vitrin alışverişi yapıyorum",
      "mic drop",
    ],
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
    annotationKeyHints: ["eğitim dönemi bitti"],
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
    annotationKeyHints: ["4 Temmuz", "kendi tenimin içinden sürünerek çıkabilseydim"],
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
    annotationKeyHints: [
      null,
      null,
      "gerçekleri anlatmamı ister misin",
      "hava durumu perin",
      null,
    ],
  },
  {
    batch: "bouncy",
    sourceKey: "bouncy",
    label: "ATEEZ — BOUNCY (K-HOT CHILLI PEPPERS)",
    artist: "ATEEZ",
    title: "BOUNCY (K-HOT CHILLI PEPPERS)",
    slug: "ateez-bouncy-k-hot-chilli-peppers-turkce-ceviri",
    youtubeUrl: "https://www.youtube.com/watch?v=U0G5OA6ZH5w",
    annotationKeyHints: ["Bir, iki; Rahat", "Kore usulü acı havası", "şimdi dayağı yersin"],
  },
  {
    batch: "aug14",
    sourceKey: "hootie",
    label: "KATSEYE — Hootie Frutti",
    artist: "KATSEYE",
    title: "Hootie Frutti",
    youtubeUrl: "https://www.youtube.com/watch?v=is8UDe2PhKQ",
    annotationKeyHints: ["Matcha çayım elimde", "yirmi dolarlık \"smoothie\"ler"],
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
    annotationKeyHints: ["elbisesinde bir leke", null, null],
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
    annotationKeyHints: ["Veda"],
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
    annotationKeyHints: ["atsınlar beni içeri"],
    annotationOverrides: [
      { word: "conexión psíquica", text: "İki kişi arasında söze ihtiyaç bırakmayan, zihinsel ve sezgisel bir bağ." },
      { word: "que me lleven presa", text: "Yapılan şey yanlışsa bile sonuçlarını göze alacak kadar kararlı olmayı anlatan meydan okuma." },
      { word: "bajo la mesa", text: "Başkalarından gizlenen yakınlığı masa altı görüntüsü üzerinden kuruyor." },
      { word: "buena suerte", text: "Gerçeği öğrenecek eski sevgiliye yöneltilen alaycı bir ‘bol şans’ ifadesi." },
    ],
  },
  {
    batch: "biiig",
    sourceKey: "biiig",
    label: "BIGBANG — BiiiG",
    artist: "BIGBANG",
    title: "BiiiG",
    slug: "bigbang-biiig-turkce-ceviri",
    modelEnd: "\nthumb_up",
    youtubeUrl: "https://www.youtube.com/watch?v=L8ZnXgbyUuc",
    translationMap: [0, 1, 2, 3, 1, 5, 6, 7],
    annotationKeyHints: [null, "Eski toprak her zaman en iyisidir"],
    annotationOverrides: [
      { word: "Bang Bong", text: "BIGBANG'in G-DRAGON tarafından tasarlanan taç biçimli resmî ışıklı çubuğuna verilen ad." },
      { word: "Eski toprak her zaman en iyisidir", text: "Korecedeki ‘eski görevli en iyisidir’ atasözünden hareketle özgün olanın yerini kimsenin tutamayacağını anlatıyor." },
      { word: "yirmi çetin tepeyi", text: "‘Yirmi Soru’ oyunuyla grubun yirmi yıllık kariyerindeki dönüm noktalarını bir araya getiren bir kelime oyunu." },
      { word: "Kızıl Gün Batımı", text: "BIGBANG'in ‘Sunset Glow’ adlı şarkısına doğrudan gönderme." },
      { word: "Çift sekiz yılı", text: "G-DRAGON ve TAEYANG'ın 1988 doğum yılına, aynı zamanda ‘eski kafalı’ anlamındaki Korece ifadeye gönderme." },
      { word: "Kkanttappiya", text: "Kore animasyonu Dooly'deki uzak gezegenin adı; şarkının uzay imgesini nostaljik bir göndermeyle genişletiyor." },
    ],
  },
  {
    batch: "aug21",
    sourceKey: "twoFools",
    label: "ENHYPEN — Two Fools",
    artist: "ENHYPEN",
    title: "Two Fools",
    spotifyUrl: "https://open.spotify.com/track/4H7Wy2jficlFQppJCHE8Ks",
    youtubeUrl: "https://www.youtube.com/watch?v=w6KQ385IANI",
    geniusUrl: "https://genius.com/Enhypen-two-fools-lyrics",
    translationOverrides: {
      0: ["Woah, oh-oh-oh", "Woah, oh-oh-oh", "Woah, oh-oh-oh", "Woah, oh-oh-oh"],
      4: ["Woah, oh-oh-oh", "Woah, oh-oh-oh", "Woah, oh-oh-oh", "Woah, oh-oh-oh"],
      8: ["Woah, oh-oh-oh", "Woah, oh-oh-oh", "Woah, oh-oh-oh", "Woah, oh-oh-oh"],
    },
    annotationOverrides: [],
  },
  {
    batch: "aug21",
    sourceKey: "stuck",
    label: "ENHYPEN — Stuck",
    artist: "ENHYPEN",
    title: "Stuck",
    spotifyUrl: "https://open.spotify.com/track/42roIue3b1zBaGIpEmyy2b",
    youtubeUrl: "https://www.youtube.com/watch?v=WNySEn-VkpQ",
    geniusUrl: "https://genius.com/Enhypen-stuck-lyrics",
    annotationKeyHints: ["hem kurtuluşum"],
    translationOverrides: {
      2: [
        "Sana ihtiyacım var kızım, affet beni (Affet);",
        "Biliyorsun, seni benim yapacağım (Benimsin)...",
        "Şu çirkin bencilliğimle (Oh, evet),",
        "Kaderin önünde diz çöküp yalvarır oldum; sana hapsoldum.",
        "Sana ihtiyacım var, affet beni bebeğim (Bebeğim);",
        "Biliyorsun, seni benim yapacağım (Benimsin).",
        "Seni arzulayışım, benim en büyük günahım (Oh, evet);",
        "Başka yolu yok, derinlerine daldım; sana hapsoldum...",
      ],
      5: [
        "Sana ihtiyacım var kızım, affet beni bebeğim (Affet beni, bebeğim)",
        "Biliyorsun, seni benim yapacağım (Benimsin)",
        "Şu çirkin bencilliğimle (Oh, evet)",
        "Kaderin önünde yalvarır oldum; sana hapsoldum.",
        "Sana ihtiyacım var kızım, affet beni bebeğim (Affet beni, bebeğim)",
        "Biliyorsun, seni benim yapacağım (Benimsin)",
        "Seni arzulayışım, benim en büyük günahım (Oh, evet)",
        "Başka yolu yok, derinlerine daldım; sana hapsoldum.",
      ],
      6: [
        "Hata bende, sen ve ben (Ooh)",
        "Benim için kurgulanmış bir paradoks bu (Ooh)",
        "Her şey benim suçum, sen ve ben (Ooh)",
        "Hapsolduk bu paradoksun içine (Ooh)",
      ],
    },
    annotationOverrides: [
      { word: "hem kurtuluşum hem de cezamsın", text: "Karşı tarafın sevgisi hem ruhunu iyileştiriyor hem de ona vicdan azabı çektiriyor; dizedeki paradoks bu iki duyguyu bir arada kuruyor." },
    ],
  },
  {
    batch: "aug21",
    sourceKey: "badForYou",
    label: "ENHYPEN — Bad For You",
    artist: "ENHYPEN",
    title: "Bad For You",
    spotifyUrl: "https://open.spotify.com/track/3ppL6m58G6Kw2j19TEvdHp",
    youtubeUrl: "https://www.youtube.com/watch?v=w0fCzVbKQdo",
    geniusUrl: "https://genius.com/Enhypen-bad-for-you-lyrics",
    translationOverrides: {
      0: ["Ooh, woah, ooh", "Ooh, woah"],
      6: [
        "Oh, elimde değil",
        "O tek kız sensin (O tek kız sensin)",
        "Artık birbirimizin her şeyi olduk.",
      ],
      7: [
        "Sana fena halde tutuldum;",
        "Her şeyin farkında olsam da, sana tutkunum.",
        "Birbirimizi ne kadar incitip yaralasak da;",
        "İllaki sensin o!",
        "Sana fena halde tutuldum (Sana tutuldum);",
        "Sonunda yine sana döndüm (Yine sana döndüm).",
        "En başından beri her şey senin için yazılmış sanki...",
        "Aşka düşüyorum (Aşka düşüyorum).",
      ],
      8: [
        "Çünkü sana fena tutuldum (Sana tutuldum, sana tutuldum, fena)",
        "Fena (Sana tutuldum, sana tutuldum, fena)",
        "Fena (Sana tutuldum, sana tutuldum, fena)",
        "Sana fena tutuldum (Hadi bir kez daha söyle)",
        "Çünkü sana fena tutuldum (Sana tutuldum, sana tutuldum, fena)",
        "Fena (Sana tutuldum, sana tutuldum, fena)",
        "Fena (Sana tutuldum, sana tutuldum, fena)",
        "Sana fena tutuldum (Sana, ooh)",
      ],
    },
    annotationOverrides: [
      { word: "Sana fena halde tutuldum", text: "‘I got it bad for you’, birine kontrolsüz denecek kadar güçlü biçimde âşık olmayı anlatan bir deyimdir." },
      { word: "inadıma yenildim", text: "Korecedeki ‘오기’ (ogi), gereksiz yere inat edip geri adım atmamayı anlatır; dizede ilk adımı kimin atacağı gerilimine işaret eder." },
    ],
  },
  {
    batch: "aug21",
    sourceKey: "bloodyParadise",
    label: "ENHYPEN — Bloody Paradise",
    artist: "ENHYPEN",
    title: "Bloody Paradise",
    spotifyUrl: "https://open.spotify.com/track/0r2JVOjI7H1jhXzXBOorKu",
    youtubeUrl: "https://www.youtube.com/watch?v=YJhEsDa2o8w",
    geniusUrl: "https://genius.com/Enhypen-bloody-paradise-lyrics",
    translationMap: [0, 1, 2, 3, 4, 5, 6, 3, 8, 9],
    translationOverrides: {
      4: [
        "(Like woo) Uç, evet, evet, evet, evet",
        "(Woo) Uç, evet, evet, evet, evet",
        "(Woo) Uç, evet, evet, evet, evet",
        "Dansını öyle yap (Woah, woo)",
      ],
      6: [
        "Ah, kan kırmızısı o takım elbiseyle sür arabayı!",
        "Kalbim pervasız, bas gaza o uçsuz bucaksız yollarda...",
        "Sen yanımdayken aşk başımı döndürüyor;",
        "Ateşler içinde, yükselişimi ve uçuşumu izle! (İster misin?)",
      ],
      8: [
        "(Like woo) Uç, evet, evet, evet, evet",
        "(Woo) Uç, evet, evet, evet, evet",
        "(Woo) Uç, evet, evet, evet, evet",
        "Dansını öyle yap (Woah, woo)",
        "(Woah, woo) Uç, evet, evet, evet, evet",
        "(Woo) Uç, evet, evet, evet, evet",
        "(Woo) Uç, evet, evet, evet, evet",
        "Dansını öyle yap (Woah, woo)",
      ],
    },
    annotationOverrides: [
      { word: "Sırra kadem basıyoruz", text: "‘Going MIA’, askerî kökenli ‘missing in action’ ifadesinden gelir; burada gözden kaybolup dertlerden uzaklaşmak anlamında kullanılır." },
    ],
    annotationKeyHints: ["Sırra kadem basıyoruz"],
  },
  {
    batch: "aug21",
    sourceKey: "checkmate",
    label: "ENHYPEN — Checkmate",
    artist: "ENHYPEN",
    title: "Checkmate",
    spotifyUrl: "https://open.spotify.com/track/5BPz1bcrWmrTAzzODtQqB9",
    youtubeUrl: "https://www.youtube.com/watch?v=n02DkXkkluU",
    geniusUrl: "https://genius.com/Enhypen-checkmate-lyrics",
    translationOverrides: {
      2: [
        "Asla ölmeyeceğiz!",
        "Uçurumun kenarında dans eden o pervasız cesaret...",
        "Gözümüz kör olmuş;",
        "Hadi daha da delirmiş gibi haykır: Şah-mat, şah-mat!",
        "Şah-mat, şah-mat!",
      ],
      3: [
        "Kontrol, kontrol, kontrol, kontrol (Mikrofon kontrol)",
        "Kontrol, kontrol, kontrol, kontrol (Şah-mat, şah-mat)",
        "Kontrol, kontrol, kontrol, kontrol",
        "Bizi hedef alan şu dünyaya karşı şah-mat, şah-mat",
        "Kontrol, kontrol, kontrol, kontrol (Mikrofon)",
        "Kontrol, kontrol, kontrol, kontrol (Mikrofon)",
        "Kontrol, kontrol, kontrol, kontrol",
        "Daha da delirmiş gibi haykır, şah-mat",
      ],
      6: [
        "Kontrol, kontrol, kontrol, kontrol (Mikrofon kontrol)",
        "Kontrol, kontrol, kontrol, kontrol (Şah-mat, şah-mat)",
        "Kontrol, kontrol, kontrol, kontrol",
        "Bizi hedef alan şu dünyaya karşı şah-mat, şah-mat",
        "Kontrol, kontrol, kontrol, kontrol (Mikrofon)",
        "Kontrol, kontrol, kontrol, kontrol (Mikrofon)",
        "Kontrol, kontrol, kontrol, kontrol",
        "Daha da delirmiş gibi haykır, şah-mat, şah-mat",
        "Kontrol, kontrol, kontrol, kontrol (Mikrofon)",
        "Kontrol, kontrol, kontrol, kontrol (Mikrofon)",
        "Kontrol, kontrol, kontrol, kontrol",
        "Daha da delirmiş gibi haykır, şah-mat, şah-mat",
      ],
    },
    annotationOverrides: [
      { word: "pervasız cesaret", text: "Korecedeki ‘객기’ (gaekgi), sonunu düşünmeden gösterilen aşırı ya da gereksiz cesareti anlatır." },
    ],
    annotationKeyHints: ["pervasız cesaret"],
  },
  {
    batch: "aug21",
    sourceKey: "highlight",
    label: "ENHYPEN — Highlight",
    artist: "ENHYPEN",
    title: "Highlight",
    spotifyUrl: "https://open.spotify.com/track/1iMSo2imh5nnJL4QF7VL0i",
    youtubeUrl: "https://www.youtube.com/watch?v=IGJluJnnMxs",
    geniusUrl: "https://genius.com/Enhypen-highlight-lyrics",
    annotationKeyHints: ["pervasız bir talihsizlik"],
    translationOverrides: {
      1: [
        "Hâlâ buradayız; evet, hiç ayrılmadık (Hiç gitmedik).",
        "Beraberiz hâlâ, bu yolun tam sonunda (Woo)...",
        "Tıpkı Bonnie ve Clyde gibi; geri dönüş yok artık (Ayy)!",
        "Koşuyoruz bu anda, korkmuyoruz hiç (Woo)...",
        "Karanlık gecede bana güven ve gel yanıma (Bana güven)...",
        "Engelleyin bakalım bizi, biz hâlâ aynıyız (Vay be)!",
        "Birbirimizi aydınlatan o ışık olduk (Yeah);",
        "Şu an her şey çok net; ee, sırada ne var (Ooh)?",
      ],
      3: [
        "İşte buralara kadar geldik sonunda...",
        "Tüm bu anlar",
        "Akıp gitse bile;",
        "İşte bu bizim zirve noktamız!",
        "Dünya üzerinde birileri",
        "Bizi pervasız bir talihsizlik olarak",
        "Tanımlasa da;",
        "İşte bu bizim zirvemiz!",
      ],
      4: [
        "Woah, evet; sen ne diyorsun bu işe?",
        "Bırak buna bizim kaderimiz diyeyim (Oh)...",
        "Ne diyorsun?",
        "Hepsini sana göstermek istiyorum!",
      ],
      5: [
        "Evet, geriye sarmak yok bizde;",
        "Bizim hayatımızda kurgu noktası falan yok (Saçmalık)!",
        "Bunu düşünmek bile benim için saçmalık...",
        "Her anımız efsane bir sahneye dönüşür; zamansızız biz!",
        "Bir yanıp bir sönen o dünyamız (Dünyamız)...",
        "O renksiz geçen bunca an (Yah)...",
        "Evet, hepsi bizim mirasımız artık!",
        "Yazmaya devam edeceğiz; hiç bitmeyecek bu hikâye (Yazmaya devam)...",
      ],
      6: ["Söyle bana, sırada ne var?", "Ah, söyle bana; sırada ne var?"],
      7: [
        "(Oh) İşte buralara kadar geldik sonunda...",
        "Tüm bu anlar",
        "Akıp gitse bile;",
        "İşte bu bizim zirve noktamız!",
        "Dünya üzerinde birileri",
        "Bizi pervasız bir talihsizlik olarak",
        "Tanımlasa da;",
        "İşte bu bizim zirvemiz!",
      ],
      8: [
        "Oh-woah, oh-woah-oh, oh-woah",
        "İşte bu bizim zirvemiz!",
        "Oh-woah, oh-woah-oh, oh-woah",
        "İşte bu bizim zirvemiz!",
      ],
      9: ["(Oh) Sahi, sen ne diyorsun?", "(Oh) Görmeni istiyorum hepsini (Evet)", "(Oh) Oh, woah"],
      10: [
        "(Oh) İşte buralara kadar geldik sonunda...",
        "Tüm bu anlar",
        "Akıp gitse bile;",
        "İşte bu bizim zirve noktamız!",
        "Dünya üzerinde birileri",
        "Bizi pervasız bir talihsizlik olarak",
        "Tanımlasa da;",
        "İşte bu bizim zirvemiz!",
      ],
      11: [
        "Oh-woah, oh-woah-oh, oh-woah",
        "İşte bu bizim zirvemiz!",
        "Oh-woah, oh-woah-oh, oh-woah",
        "İşte bu bizim zirvemiz!",
      ],
    },
    annotationOverrides: [
      { word: "pervasız bir talihsizlik", text: "Dışarıdan imkânsız veya tehlikeli görülen ve başkalarınca bir felaket gibi yazılan süreci anlatır; anlatıcı bunu kendi zirvesi olarak sahiplenir." },
    ],
  },
  {
    batch: "aug21",
    sourceKey: "wave",
    label: "Baby Shark Boy feat. JOOHONEY — WAVE",
    artist: "Baby Shark Boy",
    artistDisplay: "Baby Shark Boy feat. JOOHONEY",
    title: "WAVE",
    spotifyUrl: "https://open.spotify.com/track/0RDjvRegB8u136bNVGFYgH",
    youtubeUrl: "https://www.youtube.com/watch?v=63rOINf75yY",
    annotationKeyHints: ["yüz milyondan fazla hayranım"],
    translationMap: [0, 1, 2, 3, 4, 5, 6, 3, 4, null, 4],
    translationOverrides: {
      4: [
        "Bebek köpekbalığı, doo-doo, doo-doo-doo",
        "Bebek köpekbalığı, doo-doo, doo-doo-doo",
        "Ver bana sevgini, zirveye çıkacağım!",
        "Her şeyin başlangıcıydı bu.",
        "Köpekbalığı, doo-doo, doo-doo-doo",
        "Bebek köpekbalığı, doo-doo, doo-doo-doo",
        "Oh canım, sen benim biriciğimsin;",
        "Heyecanlanabilirsin artık, ben senin çocuğunum.",
      ],
      8: [
        "Bebek köpekbalığı, doo-doo, doo-doo-doo",
        "Bebek köpekbalığı, doo-doo, doo-doo-doo",
        "Ver bana sevgini, zirveye çıkacağım!",
        "Her şeyin başlangıcıydı bu.",
        "Köpekbalığı, doo-doo, doo-doo-doo",
        "Bebek köpekbalığı, doo-doo, doo-doo-doo",
        "Oh canım, sen benim biriciğimsin;",
        "Heyecanlanabilirsin artık, ben senin çocuğunum.",
      ],
      9: [
        "Doo, doo-doo, doo-doo, doo, doo",
        "Doo, doo",
        "Doo, doo-doo, doo-doo, doo, doo",
        "Evet, hadi gidelim",
      ],
      10: [
        "Köpekbalığı, doo-doo, doo-doo-doo (Oh)",
        "Bebek köpekbalığı, doo-doo, doo-doo-doo",
        "Ver bana sevgini, zirveye çıkacağım (Sevgi)!",
        "Her şeyin başlangıcıydı bu (Her şeyin başlangıcı).",
        "Köpekbalığı, doo-doo, doo-doo-doo",
        "Bebek köpekbalığı, doo-doo, doo-doo-doo",
        "Oh canım, sen benim biriciğimsin (Oh canım, sen benim biriciğimsin);",
        "Heyecanlanabilirsin artık, ben senin çocuğunum.",
      ],
    },
    annotationOverrides: [
      { word: "yüz milyondan fazla hayranım", text: "Dize, karakterin küresel ölçekteki dinleyici kitlesini vurgulayan bir övünme ifadesidir." },
    ],
  },
  {
    batch: "aug21",
    sourceKey: "ohYeah",
    label: "Steve Lacy — Oh Yeah?",
    artist: "Steve Lacy",
    title: "Oh Yeah?",
    spotifyUrl: "https://open.spotify.com/track/22NHkFYbgxB2Zirj29Gbp8",
    youtubeUrl: "https://www.youtube.com/watch?v=yGHEis32s2Y",
    geniusUrl: "https://genius.com/Steve-lacy-oh-yeah-lyrics",
    translationOverrides: {
      0: ["Hadi, hadi, hadi", "Oh, oh", "Hadi, hadi, hadi", "Oh, oh", "Hadi, hadi, hadi"],
      1: ["Oh, oh, oh, oh, oh", "Oh, oh, oh, oh, oh", "Oh, oh, oh, oh, oh", "Oh, oh, oh, oh"],
      3: ["Bırakın çıkayım dışarı bu gece (Dışarı, dışarı)", "Ölmek için fazla genciz biz (Dışarı, dışarı)"],
      4: [
        "Hadi, hadi, hadi (Ooh, ooh, ooh, ooh, ooh, ooh, ooh)",
        "Oh, oh",
        "Hadi, hadi, hadi (Ooh, ooh, ooh, ooh, ooh, ooh, ooh)",
        "Oh, oh",
      ],
      5: ["Ooh, ooh, ooh"],
    },
    annotationOverrides: [
      { word: "Hayat bir sürtüktür", text: "‘Life’s a bitch’, hayatın sert ve acımasız olduğunu açık sözlü biçimde anlatan bir deyimdir; ardından gelen yeniden yaşama vurgusu direnci kurar." },
    ],
  },
  {
    batch: "aug21",
    sourceKey: "didntMeanToTurnYouOn",
    label: "Mariah Carey feat. Rochelle Jordan — Didn't Mean to Turn You On",
    artist: "Mariah Carey",
    artistDisplay: "Mariah Carey feat. Rochelle Jordan",
    title: "Didn't Mean to Turn You On",
    spotifyUrl: "https://open.spotify.com/track/569BvEAwdBNy9Ro0DtWWR5",
    youtubeUrl: "https://www.youtube.com/watch?v=-JcEobUz3Bc",
    geniusUrl: "https://genius.com/Mariah-carey-and-rochelle-jordan-didnt-mean-to-turn-you-on-lyrics",
    annotationKeyHints: ["pes etmediğim"],
    translationOverrides: {
      0: [
        "Beni dışarı çıkarmana izin verdim, neyin peşinde olduğunu çok iyi biliyordum;",
        "Ama seninle geldiğimde, seni umutlandırmaya çalışmıyordum hiç.",
        "Şimdi beni eve bıraktın;",
        "Ve bir iyi gecelerin senin için yeterli olmadığını söylüyorsun.",
        "Üzgünüm bebeğim, niyetim seni tahrik etmek değildi.",
        "Beni yanlış (Beni yanlış) anladın (Yanlış anladın);",
        "Seni umutlandırmaya falan çalışmıyordum (Umutlandırmaya).",
        "Sadece bir arkadaşlık istiyorum, seni azdırmak değildi niyetim;",
        "Whoa, seni tahrik etmek istememiştim.",
      ],
      3: [
        "Niyetim seni tahrik etmek değildi;",
        "Aradığın kişinin ben olduğumu çoktan anlamalıydım...",
        "Seni azdırmak istememiştim.",
        "Oh...",
        "Niyetim seni tahrik etmek değildi;",
        "İstediğin tek şeyin ben olduğunu bilmeliydim;",
        "Niyetim seni tahrik etmek değildi.",
      ],
    },
    annotationOverrides: [
      { word: "pes etmediğim", text: "‘Won’t give in’, karşı tarafın cinsel beklentisine veya baskısına boyun eğmemeyi anlatır." },
    ],
  },
  {
    batch: "aug21",
    sourceKey: "motivation",
    label: "Carly Rae Jepsen — Motivation",
    artist: "Carly Rae Jepsen",
    title: "Motivation",
    spotifyUrl: "https://open.spotify.com/track/59edZBlolguuivWORanXkJ",
    youtubeUrl: "https://www.youtube.com/watch?v=m2bgsLp943A",
    geniusUrl: "https://genius.com/Carly-rae-jepsen-motivation-lyrics",
    translationMap: [0, 1, 2, 3, 4, 5, 6, 3, 4, 8],
    translationOverrides: {
      0: [
        "Beni öyle bir kutuya hapsetmeye devam et sen...",
        "Ben sensiz de tüm dünyayı gezerim.",
        "Ver bana o motivasyonu;",
        "Sensiz yepyeni bir dünya kuracağım ben.",
        "Beni öylece kısıtlamaya devam et;",
        "Sana ihtiyacım olmadan dünyayı dolaşacağım.",
        "Ver o motivasyonu bana, ver o motivasyonu bana.",
      ],
      1: [
        "Kış yaprakları...",
        "Ayaklarımın altında çıtırdayan o ritim...",
        "Sanki seninle buluşmaya geliyormuşum gibi;",
        "Tıpkı her yerin yemyeşil olduğu,",
        "O çocukluk yıllarımdaki gibi...",
        "Ver o motivasyonu bana, ver o motivasyonu bana;",
        "İşte benim sokağım burası (Benim sokağım)!",
        "İşte sırtımı yasladığım o tek dostum;",
        "İşte benim evim; nefesimi tutuyorum, yüzüm morarıyor...",
        "Tıpkı çocukluğumdaki gibi;",
        "Her şey yemyeşildi, her şey yemyeşil.",
        "Ver bana o motivasyonu, ver bana o motivasyonu.",
      ],
      2: ["Biz uçlarda yaşarız (Biz uçlarda yaşarız)", "Bu ailede (Bu aile—)"],
      3: [
        "Biz bu ailede her şeyi uçlarda yaşarız;",
        "Biz bu ailede birbirimizi ölesiye severiz.",
        "Ben aileme aşığım aslında;",
        "Deliliğe bile yerimiz var bizim aramızda.",
        "Ben bu hikâyenin sonunda doğdum belki;",
        "Ama asıl başlangıç için buradayım artık.",
        "Biz bu ailede her şeyi sert yaşarız;",
        "Biz bu ailede her şeyi uçlarda yaşarız;",
        "Ortalığı birbirine katarız gerekirse.",
        "Hadi, sen de üzerine düşeni yap;",
        "Düşüşleri engellemeye, ayakta tutmaya çalış bizi...",
        "Ben bu enerjiyle doğmuşum;",
        "Çünkü başka çarem yoktu.",
        "Biz bu ailede her şeyi uçlarda yaşarız.",
      ],
      4: [
        "Beni böyle bir kutuya hapset.",
        "Ben sensiz de tüm dünyayı gezerim (Biz uçlarda yaşarız).",
        "Ver bana o motivasyonu (Biz uçlarda yaşarız).",
        "Sensiz yepyeni bir dünya kuracağım.",
        "Beni böyle bir kutuya hapset.",
        "Ben sensiz de tüm dünyayı gezerim (Biz uçlarda yaşarız).",
        "Ver bana o motivasyonu (Biz uçlarda yaşarız).",
      ],
      7: [
        "Biz bu ailede her şeyi uçlarda yaşarız;",
        "Biz bu ailede birbirimizi ölesiye severiz.",
        "Ben aileme aşığım aslında;",
        "Deliliğe bile yerimiz var bizim aramızda.",
        "Ben bu hikâyenin sonunda doğdum belki;",
        "Ama asıl başlangıç için buradayım artık.",
        "Biz bu ailede her şeyi sert yaşarız;",
        "Biz bu ailede her şeyi uçlarda yaşarız;",
        "Ortalığı birbirine katarız gerekirse.",
        "Hadi, sen de üzerine düşeni yap;",
        "Düşüşleri engellemeye, ayakta tutmaya çalış bizi...",
        "Ben bu enerjiyle doğmuşum;",
        "Çünkü başka çarem yoktu.",
        "Biz bu ailede her şeyi uçlarda yaşarız.",
      ],
      8: [
        "Beni böyle bir kutuya hapset.",
        "Ben sensiz de tüm dünyayı gezerim (Biz uçlarda yaşarız).",
        "Ver bana o motivasyonu (Biz uçlarda yaşarız).",
        "Sensiz yepyeni bir dünya kuracağım.",
        "Beni böyle bir kutuya hapset.",
        "Ben sensiz de tüm dünyayı gezerim (Biz uçlarda yaşarız).",
        "Ver bana o motivasyonu (Biz uçlarda yaşarız).",
        "Sensiz yepyeni bir dünya kuracağım.",
        "Ver bana o motivasyonu, ver bana o motivasyonu.",
        "Biz uçlarda yaşarız, biz uçlarda yaşarız.",
        "Sensiz yepyeni bir dünya kuracağım.",
        "Ver bana o motivasyonu, ver bana o motivasyonu.",
        "Biz uçlarda yaşarız, biz uçlarda yaşarız.",
      ],
      9: [
        "Pırıl pırıl parla küçük yıldız...",
        "Sahi, nesin sen merak ediyorum...",
        "[?], hem güzel hem karmakarışık, bilmiyorum işte.",
        "Selam Carly Hala!",
        "Değişecek misin artık?",
        "Ce-ee!",
      ],
    },
    annotationOverrides: [
      { word: "nefesimi tutuyorum, yüzüm morarıyor", text: "‘Hold my breath, turn blue’, ev içindeki baskıyı veya gerilim anındaki nefessiz kalma hissini fiziksel bir imgeyle anlatır." },
      { word: "ip üzerinde yürümek", text: "‘Always a tightrope’, aile beklentileriyle kişinin kendi kimliği arasındaki zorlu dengeyi anlatır." },
    ],
    annotationKeyHints: ["nefesimi tutuyorum, yüzüm morarıyor", "ip üzerinde yürümek"],
  },
  {
    batch: "aug21",
    sourceKey: "sunflower",
    label: "Post Malone & Swae Lee — Sunflower",
    artist: "Post Malone",
    artistDisplay: "Post Malone & Swae Lee",
    title: "Sunflower",
    spotifyUrl: "https://open.spotify.com/track/1A6OTy97kk0mMdm78rHsm8",
    youtubeUrl: "https://www.youtube.com/watch?v=ApXoWvfEYVU",
    geniusUrl: "https://genius.com/Post-malone-and-swae-lee-sunflower-lyrics",
    translationOverrides: {
      0: ["Ayy, ayy, ayy, ayy (Ooh)", "Ooh, ooh, ooh, ooh (Ooh)", "Ayy, ayy", "Ooh, ooh, ooh, ooh"],
      1: [
        "Söylememe gerek yok, ipleri elimde tutuyorum;",
        "O fena mı fena bir kızdı, her şeye rağmen (Evet).",
        "Şimdi pes ediyorum bebeğim, ben tam bir enkazım (Enkaz);",
        "Bende kalıyorsun bebeğim, sen de tam bir enkazsın (Enkaz).",
        "Söylememe gerek yok, ipleri elimde tutuyorum;",
        "O fena mı fena bir kızdı, her şeye rağmen...",
        "Şimdi pes ediyorum bebeğim, ben tam bir enkazım;",
        "Bende kalıyorsun bebeğim, sen de tam bir enkazsın.",
        "Kötü düşüncelere dalıyorsun, kontrolü kaybediyorsun;",
        "Yüzüme karşı bağırıyorsun, bebeğim saçmalama.",
        "Birisi ağır bir mağlubiyet aldı, nasıl bir histi acaba?",
        "Sana şöyle bir yan gözle bakıyorum, parti çığırından çıktı resmen...",
        "Ooh-ooh, bazı şeyleri reddedemezsin;",
        "Beni bir gemi gibi sürmek istiyor ama ben kaybetmeye niyetli değilim.",
      ],
      3: [
        "Seni her terk edişimde (Ooh),",
        "Bunu hiç de kolaylaştırmıyorsun, hayır (Hayır, hayır).",
        "Keşke senin için orada olabilseydim (Ooh);",
        "Bana bunun için bir sebep ver, oh (Oh).",
        "Ne zaman kapıdan çıksam (Oh),",
        "Bana geri dön dediğini duyabiliyorum (Oh, oh).",
        "Güvenimi kazanmak için savaşıyorsun ve geri adım atmıyorsun hiç (Hayır);",
        "Şu an her şeyi riske atmamız gerekse bile (Şimdi).",
        "Biliyorum, o bilinmezlikten korkuyorsun (Bilinmezlik);",
        "Yalnız kalmak istemiyorsun, biliyorum (Yalnız).",
        "Biliyorum, ben hep böyle gelip gidiyorum (Gelip gidiyorum);",
        "Ama bu benim kontrolümün dışında...",
      ],
    },
    annotationOverrides: [
      { word: "ipleri elimde tutuyorum", text: "‘Keep a check’, hem kontrolü elinde tutma hem de finansal güç çağrışımı taşıyan bir kelime oyunudur." },
      { word: "ağır bir mağlubiyet aldı", text: "‘Take a big L’, hip-hop jargonunda yenilgiye uğramak veya küçük düşmek anlamına gelir." },
      { word: "Sen bir ayçiçeğisin", text: "Ayçiçeğinin güneşe yönelmesi, sevgilinin anlatıcıya bağlılığını ve anlatıcının bu yoğunluktan çekinmesini simgeler." },
    ],
    annotationKeyHints: ["ipleri elimde tutuyorum", "ağır bir mağlubiyet", "Sen bir ayçiçeğisin"],
  },
  {
    batch: "aug21",
    sourceKey: "theNightWeMet",
    label: "Lord Huron — The Night We Met",
    artist: "Lord Huron",
    title: "The Night We Met",
    spotifyUrl: "https://open.spotify.com/track/3hRV0jL3vUpRrcy398teAU",
    youtubeUrl: "https://www.youtube.com/watch?v=KtlgYxa6BMU",
    geniusUrl: "https://genius.com/Lord-huron-the-night-we-met-lyrics",
    annotationKeyHints: [null, "Senin her şeyine sahiptim önce, sonra sadece çoğuna"],
    translationOverrides: {
      0: ["(Ooh, ooh, ooh)", "(Ooh, ooh, ooh)", "(Ooh, ooh, ooh)", "(Ooh, ooh, ooh)"],
    },
    annotationOverrides: [
      { word: "Borcunu henüz ödememiş olan", text: "Hayat yolculuğundaki hataları ve bu hataların bedelini ödeme zorunluluğunu anlatan bir imgedir." },
      { word: "Senin her şeyine sahiptim önce, sonra sadece çoğuna", text: "‘Hepsi, çoğu, birazı, hiçbiri’ dizilimi bir ilişkinin aşama aşama tükenişini anlatır." },
    ],
  },
  {
    batch: "aug21",
    sourceKey: "justAGirl",
    label: "No Doubt — Just a Girl",
    artist: "No Doubt",
    title: "Just a Girl",
    spotifyUrl: "https://open.spotify.com/track/5lWRaa0fBxDE5yU91npPq7",
    youtubeUrl: "https://www.youtube.com/watch?v=PHzOOQfhPFg",
    geniusUrl: "https://genius.com/No-doubt-just-a-girl-lyrics",
    annotationKeyHints: ["herhangi bir hak falan vermeye kalkma"],
    translationOverrides: {
      8: ["Oh, artık burama kadar...", "Oh, artık burama kadar...", "Oh, artık burama kadar geldi!"],
    },
    annotationOverrides: [
      { word: "sadece bir kızım", text: "Anlatıcı, toplumun kadınlara biçtiği narin ve bağımlı rolü alaycı biçimde tekrar ederek bu role itiraz eder." },
      { word: "kaba hesapların", text: "‘Rule of thumb’, kesin olmayan genel kural anlamına gelir; dizede kadınları kısıtlayan yerleşik kurallara bağlanır." },
      { word: "Saçmalık işte", text: "‘Twiddle-dum’, anlamsızlık veya boş uğraş çağrışımı taşıyan alaycı bir ünlemdir." },
    ],
  },
  {
    batch: "aug21",
    sourceKey: "thinkingOutLoud",
    label: "Ed Sheeran — Thinking Out Loud",
    artist: "Ed Sheeran",
    title: "Thinking Out Loud",
    spotifyUrl: "https://open.spotify.com/track/34gCuhDGsG4bRPIf9bb02f",
    youtubeUrl: "https://www.youtube.com/watch?v=lp-EO5I60KA",
    geniusUrl: "https://genius.com/Ed-sheeran-thinking-out-loud-lyrics",
    translationOverrides: {
      1: [
        "Düşünüyorum da;",
        "İnsanlar ne kadar da gizemli yollarla aşık oluyorlar.",
        "Belki sadece bir elin dokunuşuyla...",
        "Bense, sana her bir gün yeniden aşık oluyorum;",
        "Ve sadece sana âşık olduğumu söylemek istiyorum.",
      ],
      5: [
        "Bebeğim, şimdi al beni o sevgi dolu kollarına;",
        "Öp beni binlerce yıldızın ışığı altında...",
        "Başını şu atan kalbimin üzerine yasla, sesli düşünüyorum;",
        "Belki de aşkı tam da olduğumuz yerde bulduk, oh-oh.",
      ],
      6: ["Lo-lo-lo, lo-lo-lo", "Lo-lo-lo, lo-lo-lo, love"],
      7: [
        "Bebeğim, şimdi al beni o sevgi dolu kollarına;",
        "Öp beni binlerce yıldızın ışığı altında, oh, sevgilim...",
        "Başını şu çarpan kalbimin üzerine yasla, sesli düşünüyorum;",
        "Belki de aşkı tam da olduğumuz yerde bulduk.",
        "Oh, belki de aşkı tam da burada bulduk;",
        "Ve aşkı tam da olduğumuz yerde bulduk.",
      ],
    },
    annotationOverrides: [
      { word: "hep tazedir", text: "‘Evergreen’, her mevsim yeşil kalan bitki imgesinden hareketle ruhun hiç yaşlanmayan, canlı kalan yönünü anlatır." },
    ],
  },
  {
    batch: "thunder",
    sourceKey: "thunder",
    label: "Imagine Dragons — Thunder",
    artist: "Imagine Dragons",
    title: "Thunder",
    slug: "imagine-dragons-thunder-turkce-ceviri",
    spotifyUrl: "https://open.spotify.com/track/1zB4vmk8tFRmM9UULNzbLB",
    youtubeUrl: "https://www.youtube.com/watch?v=fKopy74weus",
    geniusUrl: "https://genius.com/Imagine-dragons-thunder-lyrics",
    languages: { original: "en", translation: "tr", annotations: "tr" },
    modelEnd: "\nÇEVİRİ NOTLARI / TRANSLATION NOTES",
    bilingualAnnotations: true,
    annotationKeyHints: [
      "numaranı al",
      "arka koltuktan",
      "ucuz koltuklarda",
      "kitleleri nasıl ele geçireceğimin planlarını",
    ],
  },
  {
    batch: "btbt",
    sourceKey: "btbt",
    label: "B.I, Soulja Boy, DeVita — BTBT",
    artist: "B.I",
    artistDisplay: "B.I, Soulja Boy, DeVita",
    title: "BTBT",
    slug: "bi-soulja-boy-btbt-ft-devita-turkce-ceviri",
    spotifyUrl: "https://open.spotify.com/track/4XcxgZSriCYamtIA7BgT7V",
    youtubeUrl: "https://www.youtube.com/watch?v=Tzz82mwLZIw",
    geniusUrl: "https://genius.com/Bi-and-soulja-boy-btbt-lyrics",
    languages: { original: "ko-Latn", translation: "tr", annotations: "tr" },
    translatorNote: "Korece dizeler, okurun sözleri takip edebilmesi için Latin alfabesiyle romanize edildi.",
    // AI Studio sonraki nakaratları ve ikinci pre-chorus'u kısalttı. Yeni bir
    // hedef metin üretmeden, modelin ilk tam bloklarını birebir tekrar kullan.
    translationMap: [0, 1, 2, 0, 4, 2, 0, 6, 0, 8],
    translationLineSplits: {
      7: {
        0: ["Evet;", "ön, arka, sağ ve sol..."],
      },
    },
    annotationKeyHints: ["Beni böyle yalpalatıyorsun", "Bentley", "Cartier"],
    inlineAnnotationsOnly: true,
  },
  {
    batch: "korkmam",
    sourceKey: "korkmamBen",
    label: "Radikal — KORKMAM BEN",
    artist: "Radikal",
    title: "KORKMAM BEN",
    slug: "radikal-korkmam-ben-english-translation",
    spotifyUrl: "https://open.spotify.com/track/1E4KvEuWVyWB3x2QEjLIEG",
    youtubeUrl: "https://www.youtube.com/watch?v=1d1ecNSsWQc",
    geniusUrl: "https://genius.com/Radikal-korkmam-ben-lyrics",
    appleMusicUrl: "https://music.apple.com/tr/album/korkmam-ben-single/6798354143",
    releaseDate: "2026-08-21",
    languages: { original: "tr", translation: "en", annotations: "en" },
    modelEnd: "\nÇEVİRİ NOTLARI / TRANSLATION NOTES",
    translationMap: [0, 1, 2, 3, 4, 5, 6, 3, 3],
    sectionOverrides: [
      "Intro: İbrahim",
      "Verse 1: Vedat",
      "Pre-Chorus: Yusuf Emre",
      "Chorus: Vedat",
      "Verse 2: Yuşa",
      "Bridge: Vedat & Yusuf Emre",
      "Verse 3: İbrahim",
      "Chorus: Vedat",
      "Chorus: Vedat",
    ],
    preserveParentheticals: true,
    enforceLineParity: true,
    translationOverrides: {
      0: ["(Radikal)"],
      1: [
        "I always forget everything at night",
        "I came crawling back to you (Back to you)",
        "I grew up, I learned how to love",
        "With just a single word from you",
      ],
      3: [
        "I’m not afraid of your lies (Oh-oh, oh-oh)",
        "They can’t pierce my memories",
        "Liars ain’t allowed in my dreams, ah-ah-ah-ah-ah-ah-ah-ah (Oh-oh, oh-oh; Dreams)",
      ],
      6: [
        "(Woo, woo)",
        "(Shut it, shut it, shut it, shut it)",
        "The door you closed is now—now in your past",
        "Every night you run away brings you back to me",
        "Even if you go far away, in your heart",
        "My name, my name will always echo",
        "Don't stop, go ahead and say what you're holding inside",
        "If you’re not regretful, why do your eyes look like that?",
        "When everyone walks out on you",
        "Only one name will fall from your lips... (Ra-Ra-Ra-Radikal)",
      ],
      7: [
        "I’m not afraid of your lies (Oh-oh, oh-oh)",
        "They can’t pierce my memories",
        "Liars ain’t allowed in my dreams, ah-ah-ah-ah-ah-ah-ah-ah (Oh-oh, oh-oh)",
      ],
      8: [
        "I’m not afraid of your lies",
        "They can’t pierce my memories",
        "Liars ain’t allowed in my dreams, ah-ah-ah-ah-ah-ah-ah-ah",
      ],
    },
    annotationOverrides: [
      { word: "came crawling back", text: "The Turkish phrase ‘Tıpış tıpış gelmek’ describes returning submissively after a mistake. ‘To come crawling back’ preserves its strong sense of regret and surrender." },
      { word: "always in a bind", text: "‘Bi’ çare’ conveys helplessness or having no solution. ‘In a bind’ is a natural English idiom for being trapped in a difficult situation, reflecting the narrator’s mental struggle." },
      { word: "stalling for time", text: "‘Oyalar vade’ refers to delaying a process or buying time. ‘Stalling for time’ captures how the intrusive thought keeps the narrator from moving on." },
      { word: "earned a place in me", text: "‘Hane’ literally means a house or household. ‘Earned a place in me’ keeps that sense of belonging and suggests a permanent place in the narrator’s heart." },
      { word: "pierce my memories", text: "‘İşlemez’ suggests that something cannot penetrate a protected surface. ‘Pierce’ emphasizes that the lies are not sharp enough to damage the memories." },
      { word: "dug your pit", text: "‘Kuyu kazmak’ means secretly plotting against someone. The English image ‘to dig a pit’ preserves the original metaphor of sabotage and revenge." },
      { word: "flaked again", text: "‘Bozdu oyunu’ means ruining the plan or breaking the rules of the game. The modern slang ‘to flake’ describes someone who breaks their word or bails at the last minute." },
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
  ["熙", "hui"],
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

const PRESERVED_TRANSLATED_ECHOES = new Set([
  "affet",
  "affet beni, bebeğim",
  "benimsin",
  "oh, evet",
  "bebeğim",
  "engel olamıyorum",
  "o tek kız sensin",
  "sana tutuldum",
  "sana tutuldum, sana tutuldum, fena",
  "sana, ooh",
  "yine sana döndüm",
  "aşka düşüyorum",
  "senin için yanıyorum",
  "senin için",
  "hadi bir kez daha söyle",
  "sırra kadem basıyoruz",
  "like woo",
  "ister misin",
  "gidiyoruz uzaklara",
  "mikrofon kontrol",
  "mikrofon",
  "şah-mat, şah-mat",
  "mic",
  "hiç gitmedik",
  "bana güven",
  "vay be",
  "saçmalık",
  "dünyamız",
  "yah",
  "yazmaya devam",
  "o heyecanı hisset",
  "vakit geldi",
  "benim bu",
  "ah-ha",
  "benim zirvem",
  "sevgini ver bana",
  "sevgi",
  "her şeyin başlangıcı",
  "oh canım, sen benim biriciğimsin",
  "dışarı, dışarı",
  "benim sokağım",
  "biz sertiz",
  "biz uçlarda yaşarız",
  "bu aile—",
  "nasıl yapmışım",
  "beni yanlış",
  "yanlış anladın",
  "umutlandırmaya",
  "enkaz",
  "evet",
  "hayır",
  "hayır, hayır",
  "bilinmezlik",
  "yalnız",
  "gelip gidiyorum",
  "şimdi",
  "gidiyorum",
]);

function preserveParenthetical(content) {
  const clean = content
    .toLocaleLowerCase("tr-TR")
    .replace(/[.!?…]+$/g, "")
    .trim();
  return PRESERVED_ADLIBS.test(clean) || PRESERVED_TRANSLATED_ECHOES.has(clean);
}

const ENGLISH_GLOSS_PARENTHETICALS = new Set([
  "adicto",
  "desperate measures",
  "editing point",
  "for keeps",
  "fucked up royally",
  "go hard",
  "going mia",
  "greed",
  "i got it bad for you",
  "ideals",
  "kite",
  "lost my jeong sin",
  "masterpiece",
  "me wrong",
  "mine",
  "o gi",
  "one hundred",
  "pretend",
  "rewind",
  "sandlot",
  "scheming",
  "seollem",
  "string",
  "stuck on you",
  "soulja",
  "tag",
  "thrill",
  "btbt",
  "you read",
]);

function normalizeParenthetical(value) {
  return String(value || "")
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isEnglishGlossParenthetical(content, originalContext) {
  if (preserveParenthetical(content)) return false;
  if (/[가-힣]/u.test(content) || /\p{Script=Han}|\p{Script=Hiragana}|\p{Script=Katakana}/u.test(content)) return true;
  const normalized = normalizeParenthetical(content);
  if (!normalized) return false;
  const original = normalizeParenthetical(originalContext);
  const appearsInOriginal = original && (` ${original} `).includes(` ${normalized} `);
  return appearsInOriginal || ENGLISH_GLOSS_PARENTHETICALS.has(normalized);
}

function cleanTranslationLine(value, { preserveParentheticals = false, originalContext = "" } = {}) {
  const withoutFootnotes = String(value || "").replace(/[¹²³⁴⁵⁶⁷⁸⁹⁰]+/g, "");
  return (preserveParentheticals
    ? withoutFootnotes
    : withoutFootnotes.replace(/\s*\(([^)]*\p{L}[^)]*)\)/gu, (whole, content) => (
      isEnglishGlossParenthetical(content, originalContext) ? "" : whole
    )))
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

function annotationKeyFromLine(line, lyrics) {
  const clean = String(line || "").trim();
  const candidates = [
    clean,
    ...clean.split(/[;,.!?…]+/).map((part) => part.trim()).filter(Boolean),
  ];
  return candidates
    .map((candidate) => actualMatchedTerm(candidate, lyrics))
    .find(Boolean) || null;
}

function annotationTermFromRawGloss(candidates, translationBody, lyricalText) {
  const normalizedCandidates = candidates.map(normalizeParenthetical).filter(Boolean);
  if (!normalizedCandidates.length) return null;
  const targetLines = lyricalText.split("\n").filter(Boolean);

  for (const rawLine of translationBody.split("\n")) {
    if (rawLine.trim().startsWith("|||")) continue;
    const parentheticals = [...rawLine.matchAll(/\(([^)]*)\)/g)].map((match) => normalizeParenthetical(match[1]));
    if (!normalizedCandidates.some((candidate) => parentheticals.includes(candidate))) continue;

    const rawWords = new Set(normalizeGlossForMatch(rawLine.replace(/\([^)]*\)/g, "")).split(" ").filter(Boolean));
    const ranked = targetLines
      .map((line) => {
        const targetWords = new Set(normalizeGlossForMatch(line.replace(/\([^)]*\)/g, "")).split(" ").filter(Boolean));
        const overlap = [...rawWords].filter((word) => targetWords.has(word)).length;
        return { line, score: overlap / Math.max(1, Math.min(rawWords.size, targetWords.size)) };
      })
      .sort((a, b) => b.score - a.score);
    if (ranked[0]?.score >= 0.5) return annotationKeyFromLine(ranked[0].line, lyricalText);
  }
  return null;
}

function normalizeGlossForMatch(value) {
  return String(value || "")
    .toLocaleLowerCase("tr-TR")
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function inlineAnnotations(translationBody, lyricalText, keyHints = [], trackLabel = "Parça") {
  const notes = new Map();
  const unmatched = [];
  let noteIndex = 0;
  for (const rawLine of translationBody.split("\n")) {
    const line = rawLine.trim();
    if (!line.startsWith("|||")) continue;
    const note = line
      .replace(/^\|\|\|\s*/, "")
      .replace(/^[¹²³⁴⁵⁶⁷⁸⁹⁰]+\s*/, "")
      .replace(/\*/g, "")
      .trim();
    const colon = note.indexOf(":");
    if (colon < 1) continue;
    const heading = note.slice(0, colon);
    const candidates = [heading];
    for (const match of note.matchAll(/["“”']([^"“”']{2,70})["“”']/g)) candidates.push(match[1]);
    for (const match of note.matchAll(/\(([^)]{2,70})\)/g)) candidates.push(match[1]);
    for (const candidate of [...candidates]) {
      if (/[\uac00-\ud7a3]/.test(candidate)) candidates.push(romanizeHangul(candidate));
      if (/\p{Script=Han}/u.test(candidate)) candidates.push(romanizeCjk(candidate));
    }
    const matched = candidates.map((candidate) => actualMatchedTerm(candidate, lyricalText)).find(Boolean)
      || actualMatchedTerm(keyHints[noteIndex], lyricalText)
      || annotationTermFromRawGloss(candidates, translationBody, lyricalText);
    noteIndex += 1;
    if (!matched) unmatched.push(note);
    else if (!notes.has(matched)) notes.set(matched, note);
  }
  if (unmatched.length) {
    throw new Error(`${trackLabel}: ${unmatched.length} AI Studio açıklaması hedef dizede eşleşmedi (${unmatched.join(" | ")}).`);
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

function bilingualTranslationNotes(model, lyricalText, language = "en", keyHints = [], trackLabel = "Parça") {
  const body = stripTurnChrome(model);
  const marker = body.search(/ÇEVİRİ NOTLARI\s*\/\s*TRANSLATION NOTES/i);
  if (marker < 0) return [];
  const tail = body.slice(marker).replace(/\nBu format[\s\S]*$/i, "");
  const sections = tail.split(/(?=^[¹²³⁴⁵⁶⁷⁸⁹⁰]+\s+)/m).slice(1);
  const notes = [];
  for (const [index, section] of sections.entries()) {
    const heading = section.split("\n")[0].replace(/^[¹²³⁴⁵⁶⁷⁸⁹⁰]+\s*/, "").trim();
    const text = language === "tr"
      ? section.match(/\nTR:\s*([\s\S]*?)(?=\nEN:|\s*$)/i)?.[1]?.trim()
      : section.match(/\nEN:\s*([\s\S]*?)\s*$/i)?.[1]?.trim();
    const candidates = [
      heading.replace(/\s*\([^)]*\)\s*$/, "").trim(),
      ...[...heading.matchAll(/\(([^)]{2,120})\)/g)].flatMap((match) => (
        match[1].split(/\s*[/|]\s*/).map((part) => part.trim())
      )),
      keyHints[index],
    ].filter(Boolean);
    const word = candidates.map((candidate) => actualMatchedTerm(candidate, lyricalText)).find(Boolean);
    if (!word || !text) {
      throw new Error(`${trackLabel}: ${index + 1}. iki dilli açıklama hedef metinle eşleşmedi.`);
    }
    notes.push({ word, text });
  }
  return notes;
}

function splitTranslationLines(lines, splits, trackLabel, stanzaIndex) {
  if (!splits) return lines;
  return lines.flatMap((line, lineIndex) => {
    const parts = splits[lineIndex];
    if (!parts) return [line];
    if (!Array.isArray(parts) || parts.length < 2 || parts.some((part) => typeof part !== "string" || !part.trim())) {
      throw new Error(`${trackLabel}: ${stanzaIndex + 1}. kıtanın ${lineIndex + 1}. satır bölümü geçersiz.`);
    }
    if (parts.join(" ") !== line) {
      throw new Error(`${trackLabel}: satır bölümü AI Studio metnini birebir korumuyor ("${line}").`);
    }
    return parts;
  });
}

function parseTrack(source, track, { preserveMissing = false } = {}) {
  if (!source?.user || !source?.model) throw new Error(`${track.label}: orijinal söz veya çeviri eksik.`);
  const originalBody = stripTurnChrome(source.user);
  const originalStanzas = parseStanzas(originalBody);
  const translatedBody = cropTranslation(source.model, track);
  const translatedStanzas = parseStanzas(translatedBody);
  const translationMap = track.translationMap || originalStanzas.map((_, index) => index);
  const missingMappedStanza = translationMap.some((index) => (
    index == null ? !preserveMissing : !translatedStanzas[index]
  ));
  if (!originalStanzas.length || translationMap.length !== originalStanzas.length || missingMappedStanza) {
    throw new Error(`${track.label}: kıta sayıları eşleşmiyor (${originalStanzas.length}/${translatedStanzas.length}).`);
  }

  const hasHangul = /[\uac00-\ud7a3]/.test(originalBody);
  const hasHan = /\p{Script=Han}/u.test(originalBody);
  const stanzas = originalStanzas.map((stanza, index) => {
    const mappedIndex = translationMap[index];
    const rawTranslation = mappedIndex == null ? null : translatedStanzas[mappedIndex]?.lines;
    // AI Studio hedef metni yayın kaynağıdır. Eski override alanları denetim izi olarak
    // dosyada kalsa da çeviri veya açıklama üretiminde bilinçli olarak kullanılmaz.
    const selectedTranslation = rawTranslation
      ? splitTranslationLines(rawTranslation, track.translationLineSplits?.[index], track.label, index)
      : rawTranslation;
    return {
      section: track.sectionOverrides?.[index] || stanza.section,
      original: stanza.lines.map((line) => {
      const corrected = line
        .replace("차오르은 feel", "차오르는 feel")
        .replace("ㅂ-ㅣ-ㄱ", "B-I-G")
        .replace("(熙)", "")
        .replace(/\s*\(\[?\?\]?\)\s*/g, "")
        .replace(/[еЕ]/g, (character) => character === "Е" ? "E" : "e");
      const hangulRomanized = hasHangul ? romanizeHangul(corrected) : corrected;
        return hasHan || track.forceRomanize ? romanizeCjk(hangulRomanized) : hangulRomanized;
      }),
      translation: selectedTranslation
        ? selectedTranslation
          .map((line) => cleanTranslationLine(line, {
            preserveParentheticals: track.preserveParentheticals,
            originalContext: stanza.lines.join("\n"),
          }))
          .filter(Boolean)
        : [],
      missingTranslation: !selectedTranslation,
      notes: [],
    };
  });
  const translationText = stanzas.flatMap((stanza) => stanza.translation).join("\n");
  const lyricalText = translationText;
  const annotationLanguage = track.languages?.annotations || "tr";
  const annotationCandidates = track.bilingualAnnotations || annotationLanguage === "en"
    ? bilingualTranslationNotes(source.model, lyricalText, annotationLanguage, track.annotationKeyHints, track.label)
    : (track.inlineAnnotationsOnly || ["aug12", "aug13", "thatway", "aug14", "aug18"].includes(track.batch)
      ? inlineAnnotations(translatedBody, lyricalText, track.annotationKeyHints, track.label)
      : [
        ...inlineAnnotations(translatedBody, lyricalText, track.annotationKeyHints, track.label),
        ...analysisAnnotations(source.model, lyricalText),
      ]);
  const notes = new Map();
  for (const note of annotationCandidates) {
    if (!notes.has(note.word)) notes.set(note.word, note.text);
  }
  stanzas[0].notes = [...notes.entries()].slice(0, 16).map(([word, text]) => ({ word, text }));
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
  const romanized = track.hasHangul || track.hasHan || /^ko-latn$/i.test(track.languages?.original || "")
    ? ", romanize okunuşu"
    : "";
  if (track.languages?.translation === "en") {
    const album = bundle.album?.name && bundle.album.name !== track.title
      ? ` from ${bundle.album.name}`
      : "";
    const detailed = `${artist} – ${track.title} Turkish lyrics and a carefully crafted English translation${album}. Explore the song’s meaning, idioms and notes.`;
    if (detailed.length <= 160) return detailed;
    return `${artist} – ${track.title} Turkish lyrics, English translation and notes. Explore the song’s meaning and idioms.`;
  }
  const album = bundle.album?.name && bundle.album.name !== track.title ? ` ${bundle.album.name} albümündeki parçanın` : " Parçanın";
  const detailed = `${artist} – ${track.title} şarkı sözleri${romanized} ve özenli Türkçe çevirisi.${album} anlamını ve açıklamalarını keşfet.`;
  if (detailed.length <= 160) return detailed;
  return `${artist} – ${track.title} şarkı sözleri${romanized} ve Türkçe çevirisi. Parçanın anlamını keşfet.`;
}

async function withNetworkRetry(label, work, attempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await work();
    } catch (error) {
      lastError = error;
      if (attempt === attempts) break;
      console.warn(`${label}: bağlantı yeniden deneniyor (${attempt}/${attempts - 1})...`);
      await new Promise((resolve) => setTimeout(resolve, attempt * 500));
    }
  }
  throw lastError;
}

async function main() {
  loadEnv();
  const write = process.argv.includes("--write");
  const parseOnly = process.argv.includes("--parse-only");
  const contentOnly = process.argv.includes("--content-only");
  const preserveMissing = process.argv.includes("--preserve-missing");
  if (preserveMissing && !contentOnly && !parseOnly) {
    throw new Error("--preserve-missing yalnızca --content-only veya --parse-only ile kullanılabilir.");
  }
  const sourceKeyArgument = process.argv.find((argument) => argument.startsWith("--source-key="));
  const sourceKeys = new Set((sourceKeyArgument?.split("=").slice(1).join("=") || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean));
  const demandBatch = process.argv.includes("--demand");
  const aug12Batch = process.argv.includes("--aug12");
  const thatWayBatch = process.argv.includes("--that-way");
  const aug13Batch = process.argv.includes("--aug13");
  const bouncyBatch = process.argv.includes("--bouncy");
  const aug14Batch = process.argv.includes("--aug14");
  const aug18Batch = process.argv.includes("--aug18");
  const biiigBatch = process.argv.includes("--biiig");
  const aug21Batch = process.argv.includes("--aug21");
  const korkmamBatch = process.argv.includes("--korkmam");
  const btbtBatch = process.argv.includes("--btbt");
  const thunderBatch = process.argv.includes("--thunder");
  const inputPath = thunderBatch ? THUNDER_INPUT : btbtBatch ? BTBT_INPUT : korkmamBatch ? KORKMAM_INPUT : aug21Batch ? AUG21_INPUT : biiigBatch ? BIIIG_INPUT : aug18Batch ? AUG18_INPUT : aug14Batch ? AUG14_INPUT : bouncyBatch ? BOUNCY_INPUT : aug13Batch ? AUG13_INPUT : thatWayBatch ? THAT_WAY_INPUT : aug12Batch ? AUG12_INPUT : demandBatch ? DEMAND_INPUT : INPUT;
  const reportPath = thunderBatch ? THUNDER_REPORT : btbtBatch ? BTBT_REPORT : korkmamBatch ? KORKMAM_REPORT : aug21Batch ? AUG21_REPORT : biiigBatch ? BIIIG_REPORT : aug18Batch ? AUG18_REPORT : aug14Batch ? AUG14_REPORT : bouncyBatch ? BOUNCY_REPORT : aug13Batch ? AUG13_REPORT : thatWayBatch ? THAT_WAY_REPORT : aug12Batch ? AUG12_REPORT : demandBatch ? DEMAND_REPORT : REPORT;
  const selectedTracks = TRACKS.filter((track) => (
    thunderBatch ? track.batch === "thunder" : btbtBatch ? track.batch === "btbt" : korkmamBatch ? track.batch === "korkmam" : aug21Batch ? track.batch === "aug21" : biiigBatch ? track.batch === "biiig" : aug18Batch ? track.batch === "aug18" : aug14Batch ? track.batch === "aug14" : bouncyBatch ? track.batch === "bouncy" : aug13Batch ? track.batch === "aug13" : thatWayBatch ? track.batch === "thatway" : aug12Batch ? track.batch === "aug12" : demandBatch ? track.batch === "demand" : !track.batch
  )).filter((track) => !sourceKeys.size || sourceKeys.has(track.sourceKey || track.label));
  if (!selectedTracks.length) throw new Error("Seçilen kaynak anahtarıyla eşleşen parça bulunamadı.");
  const extracted = JSON.parse(await readFile(inputPath, "utf8"));
  const byLabel = new Map(extracted.items.map((item) => [item.key || item.label, item]));
  const parsed = selectedTracks.map((track) => parseTrack(
    byLabel.get(track.sourceKey || track.label),
    track,
    { preserveMissing },
  ));

  console.table(parsed.map((track) => ({
    artist: track.artistDisplay || track.artist,
    song: track.title,
    stanzas: track.stanzas.length,
    lines: track.stanzas.reduce((sum, stanza) => sum + stanza.original.length, 0),
    notes: track.stanzas[0].notes.length,
    romanized: track.hasHangul || track.hasHan || /^ko-latn$/i.test(track.languages?.original || ""),
  })));
  if (parseOnly) return;

  if (contentOnly) {
    if (!write) {
      console.log("İçerik ön izlemesi tamamlandı. Veri dosyalarını değiştirmek için --write ekleyin.");
      return;
    }
    const posts = JSON.parse(await readFile(path.join(process.cwd(), "src/data/posts.json"), "utf8"));
    const artists = JSON.parse(await readFile(path.join(process.cwd(), "src/data/artists.json"), "utf8"));
    const updated = [];
    for (const track of parsed) {
      const candidates = posts.filter((post) => (
        normalize(post.song) === normalize(track.title)
        && normalize(post.artist).includes(normalize(track.artist))
      ));
      const post = track.slug
        ? posts.find((candidate) => candidate.slug === track.slug)
        : candidates[0];
      if (!post || (!track.slug && candidates.length !== 1)) {
        throw new Error(`${track.label}: güncellenecek tekil site kaydı bulunamadı (${candidates.length}).`);
      }
      const previousOriginals = post.blocks.filter((block) => block.original);
      const previousTranslations = post.blocks.filter((block) => !block.original);
      if (previousOriginals.length !== track.stanzas.length || previousTranslations.length !== track.stanzas.length) {
        throw new Error(`${track.label}: mevcut post kıta yapısı AI Studio kaynağıyla eşleşmiyor (${previousOriginals.length}/${previousTranslations.length}/${track.stanzas.length}).`);
      }
      post.blocks = track.stanzas.flatMap((stanza, index) => {
        const translation = stanza.missingTranslation
          ? previousTranslations[index]?.lines
          : stanza.translation;
        if (!translation?.length) {
          throw new Error(`${track.label}: ${stanza.section} için AI Studio çevirisi bulunamadı.`);
        }
        return [
          { ...previousOriginals[index], lines: [...previousOriginals[index].lines] },
          {
            ...previousTranslations[index],
            original: false,
            label: previousTranslations[index].label || stanza.section,
            lines: [...translation],
          },
        ];
      });
      const wordCount = post.blocks
        .flatMap((block) => block.lines || [])
        .join(" ")
        .split(/\s+/)
        .filter(Boolean)
        .length;
      post.reading_time = Math.max(1, Math.round(wordCount / 200));
      post.updatedAt = new Date().toISOString();
      const originalLines = post.blocks
        .filter((block) => block.original)
        .flatMap((block) => block.lines || []);
      const translatedLines = post.blocks
        .filter((block) => !block.original)
        .flatMap((block) => block.lines || []);
      const translationLanguage = (track.languages || post.languages)?.translation || "tr";
      post.excerpt = (translationLanguage === "en"
        ? translatedLines.find((line) => /\p{L}/u.test(line) && !/^\([^)]*\)$/.test(line))
        : originalLines.find(Boolean)) || "";
      post.annotations = Object.fromEntries(
        track.stanzas.flatMap((stanza) => stanza.notes || []).map((note) => [note.word, note.text]),
      );
      if (track.languages) post.languages = track.languages;
      updated.push({ title: post.title, slug: post.slug });
    }
    await writePublishData({ posts, artists });
    console.table(updated);
    return;
  }

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
    if (track.spotifyUrl) {
      const bundle = await withNetworkRetry(track.label, () => fetchTrackBundle(track.spotifyUrl, credentials));
      if (track.releaseDate) bundle.album.releaseDate = track.releaseDate;
      console.log(`Spotify ✓ ${track.label}: ${bundle.track.name} — ${bundle.album.name}`);
      enriched.push({ ...track, spotify: bundle, spotifyScore: 99 });
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
      genius: track.geniusUrl ? { url: track.geniusUrl } : null,
      stanzas: track.stanzas,
      youtubeUrl: track.youtube.selected?.url || null,
      languages: track.languages,
      translatorNote: track.translatorNote || (track.hasHangul ? "Korece dizeler, okurun sözleri takip edebilmesi için Latin alfabesiyle romanize edildi." : null),
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
