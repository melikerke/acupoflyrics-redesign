import { matchChartEntry } from "../../src/lib/chartMatching.js";

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
  return `${related.length ? `<section><h2>İlgili çeviriler</h2><ul>${related.map((post) => `<li><a href="/${escapeHtml(post.slug)}/">${escapeHtml(post.artist)} — ${escapeHtml(post.song)}</a></li>`).join("")}</ul></section>` : ""}
    ${sources.length ? `<section><h2>Kaynaklar</h2><ul>${sources.map((source) => `<li><a href="${escapeHtml(safeExternalUrl(source.url))}" rel="noopener noreferrer">${escapeHtml(source.name)}</a></li>`).join("")}</ul></section>` : ""}
    <p><a href="/pop-gunlugu">Pop Günlüğü'ne dön</a></p>
    ${neighbours.length ? `<nav aria-label="Diğer yazılar"><ul>${neighbours.map((item) => `<li><a href="/pop-gunlugu/${escapeHtml(item.slug)}">${escapeHtml(item.shortTitle || item.title)}</a></li>`).join("")}</ul></nav>` : ""}`;
}

export function staticSupportPage(path, postCount) {
  const pages = {
    "/hakkimizda": {
      kicker: "Hakkımızda", title: "İki dil arasında bir okuma alanı.",
      description: `acupoflyrics, 2020'den beri şarkı sözlerinin hikâyesini ve anlamını Türkçeye taşıyor — bugüne kadar ${postCount} çeviri.`,
      children: `<p>Burada çeviri, bir şarkının bıraktığı hissi Türkçede yeniden kurmak olarak anlaşılır. Çeviri tercihlerinin gerekçesi çevirmen notlarıyla açıklanır.</p><p>Spotify ve YouTube bağlantıları ilgili platformlara gider.</p><p>Bir düzeltme önerin ya da çevrilmesini istediğin bir şarkı varsa <a href="/iletisim">iletişim sayfasından</a> yazabilirsin.</p><p><a href="/discover">Arşivi keşfet</a></p>`,
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
