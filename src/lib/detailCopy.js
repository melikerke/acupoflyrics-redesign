import { languageInfo } from "./languages";

const DETAIL_COPY = {
  es: {
    closeAnnotation: "Cerrar explicación", selectedPhrase: "Frase seleccionada", line: "línea",
    searchLabel: "Buscar en la letra", searchPlaceholder: "Busca una palabra, sección o traducción",
    sections: "Secciones", lyricView: "Vista de la letra", view: "Vista", both: "Ambos",
    createCard: "Crear tarjeta", cardPreview: "Vista previa de la tarjeta", closeCard: "Cerrar editor de tarjetas",
    cardStudioKicker: "TARJETAS DE LETRAS", cardStudioTitle: "Convierte un verso en una imagen",
    format: "Formato", story: "Historia", square: "Cuadrado", language: "Idioma", cardLanguage: "Idioma de la tarjeta",
    albumTone: "Tono del álbum", cardColor: "Color de la tarjeta", color: "Color", lines: "Versos", maxLines: "Hasta 3 · versos consecutivos",
    cardLines: "Versos de la tarjeta", download: "Descargar PNG", share: "Compartir", downloaded: "PNG descargado.", cardCopied: "Texto copiado.",
    loadingLyrics: "Cargando letra", readTranslation: "Leer traducción", listenSpotify: "Escuchar en Spotify", preAddApple: "Añadir en Apple Music", copied: "Copiado",
    songInfo: "Información de la canción", artist: "Artista", album: "Álbum", single: "Sencillo", status: "Estado", firstPerformance: "Primera actuación",
    release: "Lanzamiento", genre: "Género", composer: "Compositores", duration: "Duración", reading: "Lectura", date: "Fecha", minutes: "min", readingBadge: "min de lectura",
    tags: "Etiquetas", translationAndNotes: "traducción", videoAndTranslation: "Vídeo y traducción", watchOnYoutube: "Ver en YouTube", playVideo: "Reproducir vídeo",
    videoHint: "Lee la traducción mientras ves el vídeo.", openYoutube: "Abrir en YouTube", fromAlbum: "del álbum", recommended: "Más traducciones",
    allAlbumTranslations: "Ver todas las traducciones del álbum →", sameWorld: "y más canciones", keepReading: "seguir leyendo",
  },
  tr: {
    closeAnnotation: "Açıklamayı kapat",
    selectedPhrase: "Seçili ifade",
    line: "satır",
    searchLabel: "Satır ara",
    searchPlaceholder: "Kelime, bölüm veya çeviri ara",
    sections: "Bölümler",
    lyricView: "Şarkı sözü görünümü",
    view: "Görünüm",
    both: "İkisi",
    createCard: "Kart oluştur",
    cardPreview: "Lyric card önizleme",
    closeCard: "Kart oluşturucuyu kapat",
    cardStudioKicker: "SOSYAL KART STÜDYOSU",
    cardStudioTitle: "Bir dizeyi görsele dönüştür",
    format: "Format",
    story: "Hikâye",
    square: "Kare",
    language: "Dil",
    cardLanguage: "Kart dili",
    albumTone: "Albüm tonu",
    cardColor: "Kart rengi",
    color: "Renk",
    lines: "Dizeler",
    maxLines: "En fazla 3 · komşu satırlar",
    cardLines: "Kart satırları",
    download: "PNG indir",
    share: "Paylaş",
    downloaded: "PNG indirildi.",
    cardCopied: "Kart metni kopyalandı.",
    loadingLyrics: "Sözler yükleniyor",
    readTranslation: "Çeviriyi oku",
    listenSpotify: "Spotify'da dinle",
    preAddApple: "Apple Music'te ön ekle",
    copied: "Kopyalandı",
    songInfo: "Şarkı Bilgisi",
    artist: "Sanatçı",
    album: "Albüm",
    single: "Tekli",
    status: "Durum",
    firstPerformance: "İlk performans",
    release: "Yayın",
    genre: "Tür",
    composer: "Besteci",
    duration: "Süre",
    reading: "Okuma",
    date: "Tarih",
    minutes: "dk",
    readingBadge: "dk okuma",
    tags: "Etiketler",
    translationAndNotes: "çeviri ve notlar",
    videoAndTranslation: "Video ve çeviri",
    watchOnYoutube: "YouTube'da izle",
    playVideo: "Videoyu oynat",
    videoHint: "Videoyu izlerken çeviriye tek dokunuşla geç.",
    openYoutube: "YouTube'da aç",
    fromAlbum: "albümünden",
    recommended: "Önerilen çeviriler",
    allAlbumTranslations: "Albümdeki tüm çeviriler →",
    sameWorld: "ve aynı dünyadan",
    keepReading: "okumaya devam et",
  },
  en: {
    closeAnnotation: "Close explanation",
    selectedPhrase: "Selected phrase",
    line: "line",
    searchLabel: "Search lines",
    searchPlaceholder: "Search a word, section or translation",
    sections: "Sections",
    lyricView: "Lyrics view",
    view: "View",
    both: "Both",
    createCard: "Create card",
    cardPreview: "Lyric card preview",
    closeCard: "Close card studio",
    cardStudioKicker: "LYRIC CARD STUDIO",
    cardStudioTitle: "Turn a lyric into a visual",
    format: "Format",
    story: "Story",
    square: "Square",
    language: "Language",
    cardLanguage: "Card language",
    albumTone: "Album tone",
    cardColor: "Card color",
    color: "Color",
    lines: "Lines",
    maxLines: "Up to 3 · adjacent lines",
    cardLines: "Card lines",
    download: "Download PNG",
    share: "Share",
    downloaded: "PNG downloaded.",
    cardCopied: "Card text copied.",
    loadingLyrics: "Lyrics are loading",
    readTranslation: "Read translation",
    listenSpotify: "Listen on Spotify",
    preAddApple: "Pre-add on Apple Music",
    copied: "Copied",
    songInfo: "Song information",
    artist: "Artist",
    album: "Album",
    single: "Single",
    status: "Status",
    firstPerformance: "First performance",
    release: "Release",
    genre: "Genre",
    composer: "Songwriters",
    duration: "Duration",
    reading: "Reading time",
    date: "Date",
    minutes: "min",
    readingBadge: "min read",
    tags: "Tags",
    translationAndNotes: "translation and notes",
    videoAndTranslation: "Video and translation",
    watchOnYoutube: "Watch on YouTube",
    playVideo: "Play video",
    videoHint: "Move from the video to the translation in one tap.",
    openYoutube: "Open on YouTube",
    fromAlbum: "from the album",
    recommended: "Recommended translations",
    allAlbumTranslations: "View all album translations →",
    sameWorld: "and more from the same world",
    keepReading: "keep reading",
  },
};

export function copyForLanguage(code) {
  if (String(code).startsWith("es")) return DETAIL_COPY.es;
  return String(code || "").toLowerCase().startsWith("en") ? DETAIL_COPY.en : DETAIL_COPY.tr;
}

export function interfaceLocaleFor(languages) {
  if (languages.translation === "es") return "es";
  return languages.translation === "en" ? "en" : "tr";
}

export function columnLabel(language, kind, interfaceLocale) {
  if (interfaceLocale === "es") return kind === "original" ? "ORIGINAL" : "ESPAÑOL";
  const info = languageInfo(language);
  if (interfaceLocale === "tr" && kind === "original" && language === "en") return "ORİJİNAL";
  if (interfaceLocale === "tr" && kind === "translation" && language === "tr") return "TÜRKÇE";
  const name = interfaceLocale === "en" ? info.englishName : info.turkishName;
  const role = kind === "original"
    ? (interfaceLocale === "en" ? "ORIGINAL" : "ORİJİNAL")
    : (interfaceLocale === "en" ? "TRANSLATION" : "ÇEVİRİ");
  return `${name.toLocaleUpperCase(interfaceLocale === "tr" ? "tr-TR" : "en-US")} · ${role}`;
}

export function cardLanguageLabel(language, kind, interfaceLocale) {
  if (interfaceLocale === "es") return kind === "original" ? "Original" : "Español";
  if (interfaceLocale === "tr" && kind === "original" && language === "en") return "Orijinal";
  const info = languageInfo(language);
  return interfaceLocale === "en" ? info.englishName : info.turkishName;
}
