import { matchChartEntry } from "../../src/lib/chartMatching.js";
import { aboutTitle, aboutSections, aboutProfileImage } from "../../src/data/aboutContent.js";
import { songInsights } from '../../src/data/songInsights.js';
import { editorialSeoUpdatedAt } from '../../src/data/songEditorialSeo.js';
import { readablePublicationDate } from '../../src/lib/songPublication.js';
import { annotationsFor } from '../../src/lib/annotations.js';
import { languagesFor } from '../../src/lib/languages.js';
import { linksHubSongs, linksHubTitle, linksHubDescription, instagramProfileUrl } from '../../src/lib/linksHub.js';
import { moodLandingPages } from '../../src/data/moodLandingPages.js';

export function staticLinksHub(posts) {
  const { featured, latest } = linksHubSongs(posts);
  const title = post => escapeHtml(`${post.artist} — ${post.song}`);
  const href = post => `/${escapeHtml(post.slug)}/`;
  return `<div class="seo-prerender"><nav aria-label="Ana gezinme"><a href="/">acupoflyrics</a><a href="/discover">Keşfet</a><a href="/sarkilar">Şarkılar</a></nav><main><div class="links-hub">
    <header class="links-intro"><img src="${aboutProfileImage}" width="68" height="68" alt="Melike Erke — acupoflyrics"><a href="${instagramProfileUrl}" class="links-handle">@acupoflyrics</a><h1>${linksHubTitle}</h1><p>${linksHubDescription}</p></header>
    <form action="/search" method="get" role="search" class="links-search"><label for="hub-search">Şarkı veya sanatçı ara</label><div><input id="hub-search" name="q" type="search" placeholder="Şarkı ya da sanatçı adı…" required><button type="submit">Ara <span aria-hidden="true">↗</span></button></div></form>
    ${featured ? `<section aria-labelledby="hub-weekly"><h2 id="hub-weekly">Haftanın çevirisi</h2><a href="${href(featured)}" class="links-featured"><img src="${escapeHtml(featured.cover || featured.image)}" alt="${title(featured)} kapak görseli" width="120" height="120"><div><span class="links-kicker">Bu haftanın seçimi</span><strong>${title(featured)}</strong><span>Çeviriyi ve notları oku ↗</span></div></a></section>` : ''}
    <section aria-labelledby="hub-latest"><h2 id="hub-latest">Son çeviriler</h2><ol class="links-latest">${latest.map((post, index) => `<li><a href="${href(post)}"><span class="links-number" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span><span>${title(post)}</span><span aria-hidden="true">↗</span></a></li>`).join('')}</ol><a href="/sarkilar" class="links-all">Tüm çevirilere göz at →</a></section>
    <section aria-labelledby="hub-moods"><h2 id="hub-moods">Bugün hangi ruh hâlindesin?</h2><div class="links-moods">${moodLandingPages.slice(0, 3).map(mood => `<a href="/mood/${mood.slug}">${mood.name} <span aria-hidden="true">↗</span></a>`).join('')}</div></section>
    </div></main></div>`;
}

// These are real initial-HTML elements, not JSON-LD or client-only dialog text.
// Native details keeps every note readable/toggleable even without JavaScript.
export function staticSongAnnotations(post) {
  const entries = Object.entries({ ...annotationsFor(post.slug), ...(post.annotations || {}) })
    .filter(([term, note]) => term.trim() && typeof note === 'string' && note.trim());
  if (!entries.length) return '';
  const language = languagesFor(post).annotations;
  const english = language === 'en';
  return `<section class="seo-translation-notes" lang="${escapeHtml(language)}" aria-label="${english ? 'Translator notes' : 'Çevirmen notları'}"><h2>${english ? 'Translation notes' : 'Çeviri ve notlar'}</h2>${entries.map(([term, note]) => `<details class="seo-translation-note"><summary class="detail-lyric-annot">${escapeHtml(term)}</summary><p class="seo-translation-note-text">${escapeHtml(note)}</p></details>`).join('')}</section>`;
}

export function staticSongVideoLink(post) {
  const href = safeExternalUrl(post.youtubeUrl || post.youtube?.url);
  if (!href || !/^(?:(?:www|m|music)\.)?youtube\.com$|^(?:www\.)?youtu\.be$|^(?:www\.)?youtube-nocookie\.com$/.test(new URL(href).hostname)) return '';
  const english = languagesFor(post).translation === 'en';
  return `<p class="seo-song-video"><a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(`${post.artist} — ${post.song}`)} · ${english ? 'Open on YouTube' : "YouTube’da aç"}</a></p>`;
}

export function staticSongSpotifyLink(post) {
  const href = safeExternalUrl(post.spotify?.trackUrl || post.spotify?.track?.url);
  if (!href || new URL(href).hostname !== 'open.spotify.com' || !/^\/(?:intl-[a-z-]+\/)?track\/[a-zA-Z0-9]+\/?$/.test(new URL(href).pathname)) return '';
  const english = languagesFor(post).translation === 'en';
  return `<p class="seo-song-spotify"><a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(`${post.artist} — ${post.song}`)} · ${english ? 'Listen on Spotify' : 'Spotify’da dinle'}</a></p>`;
}

export function staticSongInsight(slug) {
  const insight = songInsights[slug];
  if (!insight) return '';
  const updatedAt = insight.updatedAt || editorialSeoUpdatedAt;
  return `<section class="song-insight" aria-label="Şarkının anlamı ve sık sorulan sorular"><span class="song-insight-kicker">Şarkının arka planı</span><h2 class="font-serif">Şarkı ne anlatıyor?</h2><p class="song-insight-summary">${escapeHtml(insight.summary)}</p><p class="song-insight-meta">Sözlere dayalı editoryal yorum · Güncelleme: <time datetime="${updatedAt}">${readablePublicationDate(updatedAt)}</time></p><h2 class="song-insight-faq-title font-serif">Sık sorulan sorular</h2><div class="song-insight-faq">${insight.faq.map(item => `<details><summary><span>${escapeHtml(item.question)}</span><span class="song-insight-toggle" aria-hidden="true"></span></summary><p>${escapeHtml(item.answer)}</p></details>`).join('')}</div><footer class="song-insight-sources"><h3>Kaynaklar</h3><p>Yayın bilgileri ve açıklamalar için:</p><ul>${insight.sources.map(source => `<li><a href="${escapeHtml(source.url)}" rel="noopener noreferrer">${escapeHtml(source.label)}</a></li>`).join('')}</ul></footer></section>`;
}

function escapeHtml(value = "") {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function safeExternalUrl(value) {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

export function staticArticleLinks(article, posts, articles = []) {
  const related = (article.relatedTranslations || []).map((slug) => posts.find((post) => post.slug === slug)).filter(Boolean);
  const sources = (article.sources || []).filter((source) => safeExternalUrl(source.url));
  const position = articles.findIndex((item) => item.slug === article.slug);
  const neighbours = position < 0 ? [] : [articles[position - 1], articles[position + 1]].filter(Boolean);
  return `${related.length ? `<section><h2>${escapeHtml(article.relatedTitle || 'Şimdi sözlerine dalma zamanı')}</h2><p>${escapeHtml(article.relatedDescription || 'Yazıda geçen şarkıların Türkçe çevirilerini keşfet.')}</p><ul>${related.map((post) => `<li><a href="/${escapeHtml(post.slug)}/">${escapeHtml(post.artist)} — ${escapeHtml(post.song)}</a></li>`).join("")}</ul></section>` : ""}
    ${sources.length ? `<section><h2>Kaynaklar</h2><ul>${sources.map((source) => `<li><a href="${escapeHtml(safeExternalUrl(source.url))}" rel="noopener noreferrer">${escapeHtml(source.name)}</a></li>`).join("")}</ul></section>` : ""}
    ${article.sourceNote ? `<p>${escapeHtml(article.sourceNote)}</p>` : ''}
    <p><a href="/pop-gunlugu">Pop Günlüğü'ne dön</a></p>
    ${neighbours.length ? `<nav aria-label="Diğer yazılar"><ul>${neighbours.map((item) => `<li><a href="/pop-gunlugu/${escapeHtml(item.slug)}">${escapeHtml(item.shortTitle || item.title)}</a></li>`).join("")}</ul></nav>` : ""}`;
}

export function staticSupportPage(path, postCount) {
  const pages = {
    "/hakkimizda": {
      kicker: "Hakkımızda", title: aboutTitle,
      description: `acupoflyrics, 2020'den beri şarkı sözlerinin hikâyesini ve anlamını Türkçeye taşıyor — bugüne kadar ${postCount} çeviri.`,
      children: `<figure><img src="${aboutProfileImage}" alt="Melike Erke — acupoflyrics Instagram profil fotoğrafı" width="100" height="100" style="border-radius:50%;object-fit:cover"><figcaption><a href="https://www.instagram.com/acupoflyrics/">Melike Erke · @acupoflyrics</a></figcaption></figure>` + aboutSections.map(section => `<section>${section.title ? `<h2>${escapeHtml(section.title)}</h2>` : ''}${section.paragraphs.map(paragraph => `<p>${escapeHtml(paragraph)}</p>`).join('')}</section>`).join('') + '<p><a href="/discover">Arşivi keşfet</a> · <a href="/iletisim">İletişime geç</a> · <a href="/es">İspanyolca çeviriler</a></p>',
    },
    "/iletisim": {
      kicker: "İletişim", title: "Yaz, okuyorum.",
      description: "Çeviri talebi, düzeltme önerisi, iş birliği ya da sadece selam — hepsi aynı kutuya düşüyor.",
      children: `<h2>İletişim seçenekleri</h2><p><a href="mailto:acupoflyrics55@gmail.com">acupoflyrics55@gmail.com</a></p><p><a href="https://instagram.com/acupoflyrics" rel="noopener noreferrer">Instagram: @acupoflyrics</a></p><p>Çeviri taleplerinde şarkı adı ve sanatçıyı yazman yeterli. Reklam ve iş birliği için e-posta tercih edilir.</p>`,
    },
    "/gizlilik": {
      kicker: "Gizlilik ve çerezler", title: "Ölçüm açık, tercih senin.",
      description: "Sitedeki analitik ölçümün ne yaptığını ve tercihini nasıl değiştirebileceğini burada açıklıyoruz.",
      children: `<h2>Hangi araçları kullanıyoruz?</h2><p>Site performansını ve hangi sayfaların ilgi gördüğünü anlamak için Google Tag Manager ile Google Analytics 4 kullanıyoruz. Sayfa görüntülemeleri, dış bağlantı tıklamaları ve sayfa hızı ölçülebilir. Reklam kişiselleştirmesi kapalıdır.</p><h2>Tercihin nasıl çalışıyor?</h2><p>Analitiğe izin verirsen Google Analytics ölçümü etkinleşir. Reddedersen Google Analytics yüklenmez ve yeni kullanım olayları gönderilmez. Tercihin yalnızca bu tarayıcıda saklanır ve dilediğin zaman değiştirilebilir.</p><h2>Daha fazla bilgi</h2><p><a href="https://policies.google.com/privacy" rel="noopener noreferrer">Google Gizlilik Politikası</a></p><p>Soruların için <a href="/iletisim">iletişime geçebilirsin</a>. Çerez tercihlerini sayfanın etkileşimli görünümünden değiştirebilirsin.</p>`,
    },
  };
  return pages[path] || null;
}

export function staticChartsContent(data, posts, albums = []) {
  return (data.lists || []).map((list) => `<section><h2>${escapeHtml(list.name)}</h2>
    <p>${escapeHtml(list.description)}</p><p>Ölçüm: ${escapeHtml(list.period || "Kaynağın sıralaması")} · Veri tarihi: <time datetime="${escapeHtml(list.updated || data.updated)}">${escapeHtml(list.updated || data.updated)}</time></p>
    ${safeExternalUrl(list.sourceUrl) ? `<p><a href="${escapeHtml(safeExternalUrl(list.sourceUrl))}" rel="noopener noreferrer">Kaynağı aç</a></p>` : ""}
    <ol>${(list.entries || []).map((entry) => {
      const match = matchChartEntry(list, entry, posts, albums);
      const href = match ? (match.type === "album" ? `/album/${match.item.slug}` : `/${match.item.slug}/`) : `/search?q=${encodeURIComponent(`${entry.title} ${entry.artist}`)}`;
      return `<li value="${Number(entry.rank) || 1}"><a href="${escapeHtml(href)}">${escapeHtml(entry.artist)} — ${escapeHtml(entry.title)}</a> · ${match ? (match.type === "album" ? "Albüm çevirilerini aç" : "Çeviriyi oku") : "Arşivde ara"}</li>`;
    }).join("")}</ol></section>`).join("");
}
