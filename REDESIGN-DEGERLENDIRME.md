# acupoflyrics Redesign — Değerlendirme Raporu

*2 Temmuz 2026 · Kod tabanı + localhost:5173 üzerinde canlı inceleme*

## Özet

Redesign, WordPress'ten çıkma hedefini teknik olarak büyük ölçüde karşılıyor: statik build, SEO prerender, eski URL yapısının korunması ve Spotify+Genius destekli bir yayın akışı hazır. Okuma deneyimi canlı sitedekinden belirgin şekilde iyi. Yayına engel olan üç şey var: **sahte metrikler/yorumlar**, **iki eski tasarım katmanının hâlâ pakette olması** ve **canlı sitedeki bazı özelliklerin henüz karşılıksız kalması** (gerçek yorum, müzik listeleri, kurumsal sayfalar).

---

## 1. Karşılanan ihtiyaçlar (güçlü yanlar)

**WordPress'ten bağımsız yayın hattı.** Vite build + `prerenderSeo.js` her sayfa için title/description/OG/JSON-LD üretiyor; `sitemap.xml`, `_redirects` (eski `/ceviri/` ve `/song/` aliasları 301 ile `/slug/`a gidiyor) ve canonical'lar hazır. WP'deki `/slug/` URL yapısı korunduğu için SEO kaybı riski düşük. `importWpSeo.js` ile mevcut SEO verisi taşınabiliyor.

**İçerik üretim akışı WP editörünü ikame ediyor.** `/admin`: Spotify linki yapıştır → track/albüm/sanatçı metadata'sı otomatik → Genius'tan orijinal söz → çeviri gir → publish. Manuel WP post açmaktan çok daha hızlı; kapak, ISRC, yayın tarihi gibi alanlar kendiliğinden doğru geliyor.

**Okuma deneyimi ciddi bir sıçrama.** Bölüm bazlı EN/TR karşılıklı görünüm, İkisi/EN/TR görünüm modları, bölüm çipleriyle "smart seek", satır içi arama, okuma ilerleme çubuğu, bölüm paylaşımı (lyric card), albüm kapağından türetilen sayfa renkleri ve çevirmen notu paneli (annotation). Bunların hiçbiri canlı sitede yok; site farkını yaratan katman bu.

**Keşif katmanı.** Mood / tür / koleksiyon / albüm / sanatçı sayfaları, her sonucun kendi hedefine giden ⌘K arama overlay'i (şarkı + dize + sanatçı + albüm + koleksiyon, iki dilde) ve `/search` sayfası. Canlı sitede arama sadece başlık eşleşmesiyken burada dize araması bile var — çok değerli.

**Temiz veri modeli.** `postIndex.json` (liste/arama) + `posts.json` (tam sözler) ayrımı, `cleanSongTitle` ile "Türkçe Çeviri" ekinin arayüzden temizlenmesi, `tr-TR` tarih/sayı biçimlendirme, Türkçe karakter güvenli slug üretimi.

---

## 2. Gereksiz olmuş / yayına girmemesi gerekenler

**Sahte metrikler (en kritik).** `metricsFor()` okunma/beğeni/kaydetme/trend skorunu slug hash'inden üretiyor. Ana sayfada "42 B okunma", "99 trend skoru" olarak görünüyor; "En Çok Okunanlar" ve "Trend Olanlar" sıralaması da bu sahte skora dayanıyor. Yayında fark edilirse güveni bitirir. Seçenekler: gerçek analytics'e bağla (Plausible/GA4 + basit bir views endpoint'i) ya da metrikleri karttan tamamen kaldır.

**Sahte yorumlar ve kaybolan geri bildirim.** `Comments` localStorage'da tutuluyor (sadece o tarayıcıda görünür) ve "deniz/elif" seed yorumlarıyla açılıyor. `SuggestEdit` önerileri de localStorage'a yazılıyor — sana hiçbir zaman ulaşmıyor. İkisi de gerçek bir backend istiyor (küçük bir API + moderasyon, ya da giscus benzeri hazır çözüm). Seed yorumlar yayında olmamalı.

**İki eski tasarım katmanı hâlâ pakette.** `/old-home` (Home.jsx), `/kesfet` (Aurora/QuietLayer eski chrome), `/home-preview`, `/design-preview` rotaları; Aurora, MeshBackground, FloatingArt, LineWall, Loader, MagneticButton, RevealText bileşenleri; 4 CSS dosyasında ~9.700 satır (preview.css 5.233 + index.css 2.063 + site.css 1.615 + glass-preview.css 794). HomePreview içinde hiç render edilmeyen ölü kod da var (Sidebar, WeeklyReading — üstelik grafiği tamamen uydurma, DailyQuote, HomeNav). Nav'daki "Arşiv" linki eski tasarımlı `/kesfet`e gidiyor — marka tutarsızlığı. Yayın öncesi bir temizlik turu şart.

**Elle kodlanmış editoryal veri.** `annotations` sadece 5 şarkı için, `melikePicks` / `becauseYouLiked` / `sameFeeling` / `translatorNotes` sabit slug listeleri. İçerik büyüdükçe kırılır; bu alanların admin akışına eklenmesi gerekiyor (nota/pick alanı). Ayrıca "melike" avatarı şu an Unsplash stok fotoğrafı.

**Yanıltıcı otomatik küratörlük.** `moodFor`/`genreFor` regex'le tahmin ediyor; `collections` boş kalırsa rastgele şarkılarla dolduruluyor ("Taylor Lore" koleksiyonu Taylor çevirisi olmadan da şarkı gösterebilir). Boş koleksiyonu doldurmak yerine gizlemek daha dürüst.

**`/admin` korumasız.** Rota herkese açık; API'ler dev-plugin olarak çalışıyor. Prod'a asla çıkmamalı (build'den hariç tut) ya da auth arkasına alınmalı. `.env` repo içinde — `.gitignore`'da olduğundan emin ol.

---

## 3. Eksikler ve UX iyileştirme önerileri

### İçerik / veri
- **Çevirisiz post yakalayıcı yok.** Matilda (No. 280) TR içeriği olmadan yayında — detay sayfası salt İngilizce gösteriyor. Build'e basit bir doğrulama ekle: TR satırı olmayan post varsa uyar/yayınlama. (280 postun 1'inde sorun var, ama akış bunu sessizce geçiriyor.)
- **RSS yok.** WP'nin feed'ine abone olanlar kopacak; build'de `feed.xml` üretmek yarım günlük iş.
- Canlı sitedeki **Müzik Listeleri** (Billboard vs.), **Yakında Gelecek** ve **Hakkımızda/İletişim/Reklam** sayfalarının karşılığı yok. Footer'daki "Nasıl çevriliyor / Çeviri talebi / İletişim" linklerinin üçü de placeholder olarak `/discover`a gidiyor.

### Performans
- **`posts.json` 2,5 MB ve her detay sayfası tamamını fetch ediyor.** 280 şarkıda bile mobilde ağır; içerik büyüdükçe kötüleşir. Build sırasında şarkı başına `/data/posts/<slug>.json` üret, detay sadece kendi dosyasını çeksin.
- **`postIndex.json` (576 KB) ana bundle'a import ediliyor** — `searchLines` yüzünden şişkin. Arama satırlarını ayrı, lazy yüklenen bir dosyaya taşı; index sadece kart verisi taşısın.
- Kapaklar Spotify CDN'inden hotlink; `public/covers` zaten var, build'de yerelleştirmek hem hız hem bağımsızlık kazandırır.

### Görsel / etkileşim (localhost'ta gözlenen)
- **Nav, koyu içerik üzerinde yarı saydam gri banda dönüşüyor** (scrolled state) — detay sayfasında okunabilirlik düşüyor; blur'lu koyu bir arka plan daha iyi.
- **"Popüler Çeviriler" rank rozetleri bozuk görünüyor** ("#1"in yanında "#", "#.." gibi) — truncation/CSS kontrolü gerek.
- **Başlık kısaltmaları çok agresif**: "FXCK UP TH…", "Hurry U…". Kartlarda 2 satıra izin ver.
- **Mobilde alt tab bar içerikle çakışıyor** (Yeni Çeviriler kartlarının üzerine biniyor) — sayfa altına safe-area padding ekle.
- Route değişiminde sayfanın ara sıra ortadan açılması gözlemlendi (`scrollTo(0,0)` var ama detaya geçişte tepede başlamadı) — scroll restoration'ı doğrula.
- Artist Spotlight'ta sol kolon çok boş; sanatçı görseli veya istatistik eklenebilir.

### UX fikirleri (fark yaratacak küçükler)
- Dize paylaşımını gerçek **görsel lyric card**'a çevir (canvas ile kapak + dize + logo) — Instagram hikâye boyutunda; sitenin organik dağıtım motoru olur.
- **Okuma geçmişi zaten tutuluyor** (`history.js`) ama hiçbir yerde gösterilmiyor; "Kaldığın yerden devam et" rayı ekle.
- Annotation paneli mobilde nasıl davranıyor kontrol et; alt sheet olarak açılması daha iyi olabilir.
- Karanlık/aydınlık tema kullanıcı tercihi (şu an sayfa bazlı otomatik).

---

## 4. Önerilen yol haritası

1. **Temizlik:** eski rotalar + ölü bileşenler + kullanılmayan CSS katmanları silinsin; "Arşiv" linki kaldırılsın veya yeni tasarıma taşınsın.
2. **Dürüstlük:** sahte metrik/yorum/seed'ler kaldırılsın veya gerçek altyapıya bağlansın; `/admin` build dışına alınsın.
3. **Veri:** per-slug JSON bölme + TR doğrulama + RSS.
4. **Eksik sayfalar:** Hakkımızda/İletişim, (istersen) Müzik Listeleri ve Yakında Gelecek.
5. **Cila:** nav scrolled state, rank rozetleri, truncation, mobil tab bar çakışması, scroll restoration.

Bu sırayla gidilirse 1–3 yayın engelleyicileri kapatıyor; 4–5 canlı siteyle özellik eşitliğini sağlayıp geçiyor.
