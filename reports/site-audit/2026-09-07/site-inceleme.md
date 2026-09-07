# acupoflyrics — Site incelemesi ve geliştirme planı

7 Eylül 2026 · https://www.acupoflyrics.com/

Sitenin güçlü tarafı belirgin bir görsel kimliğe ve gerçek bir çeviri arşivine sahip olması. Sıcak koyu zemin, serif başlıklar, albüm kapakları ve kişisel editoryal ton korunmaya değer. En büyük fırsat, ziyaretçinin aradığı şarkıyı bulmasını ve çeviriyi okumaya başlamasını hızlandırmak. Öncelik sırası: arama ve yönlendirme hataları → mobil açılış → SEO/veri tutarlılığı → katalog ve okuma deneyimi → yeni özellikler.

İnceleme; canlı tarayıcıda masaüstü ve 390×844 mobil görünüm, aramada ayrıca 360×800 kontrolü, temsilî sayfaların HTTP/HTML incelemesi, yerel kaynak kodunun salt okunur kontrolü ve üç Lighthouse çalıştırmasını birleştirir. Mobil inceleme ekran boyutu simülasyonudur; fiziksel iPhone/Android ve ekran klavyesi testi değildir. Kaynak kodunda canlıdan farklı içerik kayıtları bulunduğundan yerel veriler canlı sayım olarak kullanılmadı. Site kodu ve yayındaki içerik değiştirilmedi.

**Kapsam ve sınırlar.** Ana sayfa, arama, çeviri sayfaları, Keşfet, şarkı/sanatçı/albüm arşivleri, mood/tür/yıl kategorileri, listeler, Pop Günlüğü, Hakkımızda, İletişim, Gizlilik, robots ve sitemap incelendi. SEO incelemesi 41 URL isteği içerir; ayrı bağlantı örnekleminde 35 dahili ve 20 harici hedef kontrol edildi. Bu gruplar birbiriyle örtüşür; toplamları benzersiz sayfa sayısı değildir. Sitemap'teki 1.020 adresin tamamı tıklanmadı, 578 çevirinin tamamı dil bakımından doğrulanmadı. Search Console, ziyaretçi davranışı ve gerçek kullanıcı hız verileri bu incelemeye dahil değildir. Gerçek e-posta veya yorum gönderilmedi.

**Korunması gereken mevcut özellikler.** Global arama; şarkı, sanatçı, albüm, haber ve dizelerde arama yapabiliyor. Şarkı sayfalarında orijinal/çeviri/ikisi görünümü, bölüm atlama, satır arama, açıklama notları, sosyal kart oluşturma, Spotify/YouTube bağlantıları, yorum ve düzeltme önerisi var. Son baktıkların alanı ve mobil alt navigasyon da mevcut. Bu özellikleri yeniden eklemek yerine görünürlüklerini ve güvenilirliklerini iyileştirmek daha değerli.

**Öncelikli, doğrulanmış bulgular.** P1 temel bulma/okuma akışını veya ilk görünümü etkiler; P2 kullanılabilirlik, erişilebilirlik ve içerik kalitesini iyileştirir. Süreler uygulanmış çalışma değil, planlama tahminidir.

| Öncelik | Önce — gözlenen durum | Sonra — önerilen davranış | Neden / doğrulama |
| --- | --- | --- | --- |
| P1 | Global aramada `LISA` için sonuç yok; `lisa` için şarkılar ve 18 çevirilik sanatçı sonucu var. | Sorgu ve içerikte aynı büyük/küçük harf ve aksan normalizasyonu. | Canlıda iki sorguyla doğrulandı. Yerel kod Türkçe ve standart küçültmeyi farklı uyguluyor. Kullanıcı mevcut içeriği yok sanabilir. |
| P1 | `/search?q=the` içindeyken global aramadan `bts` aranırsa sonuçlar BTS olurken ana arama kutusunda `the` kalıyor. | Adres, arama alanı, sonuçlar ve geri/ileri gezinme aynı sorguyu yansıtsın. | Canlıda tekrar üretildi; 360 piksel görünümde de eski sorgu kaldı. |
| P1 | `/discover#moods` yükleme tamamlandıktan sonra sayfanın tepesinde kalıyor. | İçerik hazır olunca ilgili başlığa, sabit üst menü payıyla kaydırsın. | 390 pikselde Mood bölümü yaklaşık 14.605 piksel aşağıdaydı. İki bağımsız tarayıcı kontrolü aynı sonucu verdi. |
| P1 | Ana sayfa mobil LCP 9,1 sn; örnek şarkıda 8,8 sn. | İlk ekrandaki içerik daha erken görünsün; veri ve görseller ihtiyaç sırasıyla yüklensin. | Tek çalıştırmalı, yavaşlatılmış Lighthouse ölçümleri; ayrıntılar aşağıda. |
| P1 | Happy kategorisi ilk HTML'de 0, çalışan sayfada 23 şarkı gösteriyor. | İlk HTML ve ekranda aynı sınıflandırma ve içerik kullanılsın. | `/mood/happy` HTTP yanıtı ile canlı DOM karşılaştırıldı. İndeks kaybı ölçülmedi; doğrulanan sorun içerik tutarsızlığı. |
| P1 | Türkçe meta açıklamaları İngilizce otomatik cümlelerle devam ediyor. | Her sayfanın dilinde, doğal ve içeriğe özgü açıklama. | Keşfet, Şarkılar, İletişim, Gizlilik ve 2026 koleksiyonunda doğrulandı. Yerel kod marka adındaki `lyrics` sözcüğünü dil işareti sayıyor. |
| P2 | Billboard 200 içindeki `petal` ve `This & That` albüm satırları tek şarkı çevirisine gidiyor. | Albüm listesi albüm sayfasına, şarkı listesi şarkıya bağlansın. | Canlı Billboard 200 sekmesinde hedef adresler incelendi. Eşleşme sanatçı + içerik adı + içerik türüne dayanmalı. |
| P2 | Geniş aramada Şarkılar 36 ile sınırlı, devam düğmesi yok. | Gerçek toplam + sayfalama veya daha fazla yükleme. | Canlı `the` araması 36 şarkı gösteriyor; yerel kaynakta açık `.slice(0,36)` sınırı var. Yereldeki tam eşleşme sayısı canlıya mal edilmedi. |
| P2 | Mobil arama panelinde sağ üstte yalnız `esc` yazısı var. | Dokunulabilir, erişilebilir adı olan belirgin kapatma düğmesi. | Canlı panelde kapatma düğmesi yok; örtüye tıklama kapanışı yerel kaynakta mevcut. |
| P2 | Bazı ana düğmelerde metin kontrastı düşük. | Marka paletini koruyarak metin/zemin ayrımını artır. | Lighthouse ana sayfa “Çeviriyi oku” için 3,3:1; normal metin için 4,5:1 eşiğinin altında. |
| P2 | Keşfet üstündeki “10 sanatçı” değeri tüm arşiv sayısı izlenimi veriyor. | Gerçek toplam veya “öne çıkan 10 sanatçı” etiketi. | Canlı değer görüldü; kaynakta seçilmiş sanatçı rafının uzunluğu kullanılıyor. |
| P2 | Pop Günlüğü başlığı Temmuz–Ağustos 2026 derken Eylül yazıları ve filtresi var. | Tarih aralığı içerikten otomatik hesaplansın. | Canlı arşivde doğrulandı. |

**Tasarım ve bilgi hiyerarşisi.** Mevcut görsel dil sitenin ayırt edici tarafı. Geliştirme yönü bu kimliği koruyup aramayı, güncel çevirileri ve okuma alanını öne çıkarmak olmalı.

| Önce — mevcut düzen | Sonra — önerilen düzen | Neden |
| --- | --- | --- |
| Masaüstünde yedi ana menü seçeneği; Keşfet/Mood ve farklı arşivler benzer işleri bölüştürüyor. | Birincil menü: Keşfet, Çeviriler, Müzik Listeleri, Pop Günlüğü. Çeviriler altında Şarkılar/Sanatçılar/Albümler. | İçerik korunur, ilk karar basitleşir. |
| Ana sayfanın ilk ekranını büyük haftanın çevirisi alanı kaplıyor; arama küçük bir düğme. | Görünür bir “Şarkı, sanatçı veya bir dize ara” alanı; daha kompakt editoryal seçki; hemen ardından Yeni Çeviriler. | Hem aradığını bilen hem keşfetmek isteyen ziyaretçiye giriş sunar. |
| Mobilde kartların tek sütunda büyük kapaklarla sıralanması uzun sonuç listeleri üretiyor. | Arama ve katalogda küçük kapak + şarkı + sanatçı içeren kompakt liste; seçkilerde büyük kart. | Aynı ekranda daha fazla sonucu karşılaştırmak mümkün olur. |
| Keşfet'te yıllar, türler ve mood bölümleri çok uzun tek sayfada. | Üstte açık kısa yollar; yıl seçimi için kompakt seçici; her rafta sınırlı içerik ve kendi arşivine bağlantı. | Özellikle Mood'a erişim ciddi biçimde kısalır. |
| “Mood”, “Artist Spotlight”, “Lyrics Quote”, “Community” gibi karışık arayüz dili. | “Ruh haline göre”, “Sanatçı odağı”, “Günün dizesi”, “Okur katkısı” gibi tutarlı Türkçe. | Şarkı/sanatçı adlarını değiştirmeden arayüz daha anlaşılır olur. |

Önerilen ana sayfa sırası: **arama → haftanın seçkisi → yeni çeviriler → son baktıkların → ruh haline göre kısa yollar → tek güncel Pop Günlüğü yazısı → sanatçı/albüm seçkisi**. Alt bölümler katalogdaki her içeriği ana sayfaya taşımamalı. “Yeni Çeviriler” altındaki “Tümünü gör” bağlantısı şu anda geniş Keşfet sayfasına gidiyor; yeni sıralanmış şarkı arşivine götürmesi daha açık bir beklenti yaratır.

**Mobil okuma ve erişilebilirlik.** 390 pikselde incelenen okuma alanında, 360 pikselde arama sayfasında yatay sayfa taşması görülmedi. Mobil alt navigasyon mevcut ve erişilebilir bir konumda. Buna karşılık “İkisi” görünümü uzun bir orijinal kıtanın tamamını, ardından Türkçe kıtanın tamamını gösteriyor. Dilleri karşılaştırmak için ileri geri kaydırmak gerekiyor. Bu, o oturumda seçili görünümün gözlemidir; tüm yeni ziyaretçilerin varsayılan görünümü olarak yorumlanmamalı.

Öneri: Türkçe/orijinal/ikisi seçimine ek olarak **satır satır eşleştirme**; yazı boyutu ve satır aralığı ayarı; okuma sırasında kolay erişilen bölüm/dil kontrolü. Seçilen ayarlar aynı cihazda korunmalı. Şarkı sayfasındaki video bloğu çeviriden önce yer alıyor; okuma niyetiyle gelen ziyaretçi için çeviri yukarı taşınabilir, video “Dinle/İzle” altında açılabilir. Mevcut “Çeviriyi oku” atlama bağlantısı korunmalı.

Arama panelindeki soluk bölüm etiketleri ve kapatma ipucu belirginleştirilmeli. Küçük “Kart oluştur” düğmelerinde dokunma alanı büyütülmeli; mobil ürün hedefi olarak 44–48 piksel düşünülebilir. Bu değer, her kontrol için ölçülmüş bir WCAG ihlali iddiası değildir. WCAG 2.2 minimum hedef boyutu kuralı 24×24 CSS piksel ve istisnalar içerir. [W3C hedef boyutu açıklaması](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).

Kaynak incelemesinde arama/kart pencerelerinin klavye odağı yönetimi ve yorum alanlarının etiketlenmesi ayrıca iyileştirme adayıdır. Bunlar kapsamlı ekran okuyucu sertifikasyonunun sonucu değildir. Düzeltme sonrası klavye, VoiceOver ve fiziksel mobil cihazlarla odak sırası, Escape, açılır pencere kapanışı ve alt menünün içerikle çakışması kontrol edilmeli.

**Hız: ölçülen durum.** FCP ilk içeriğin, LCP en büyük görünür öğenin belirme süresidir. TBT yükleme sırasında ana iş parçacığının uzun görevlerle engellenmesini, CLS içerik kaymalarını ölçer.

| Sayfa / test | Performans | FCP | LCP | TBT | CLS |
| --- | ---: | ---: | ---: | ---: | ---: |
| Ana sayfa — mobil | 56/100 | 4,5 sn | 9,1 sn | 230 ms | 0 |
| Ana sayfa — masaüstü | 95/100 | 0,7 sn | 1,5 sn | 20 ms | 0 |
| LISA — SaWaDiKa — mobil | 60/100 | 4,9 sn | 8,8 sn | 20 ms | 0 |

Her profil bir kez çalıştırıldı. Lighthouse 12.8.2 / Chrome 152; mobil 412×823, 150 ms gecikme, yaklaşık 1,6 Mbps bağlantı ve 4× işlemci yavaşlatması; masaüstü 1350×940, 40 ms / yaklaşık 10 Mbps. Bunlar laboratuvar sonuçlarıdır, ziyaretçilerin tamamının beklediği süreler değildir. CLS=0 bu açılış testleriyle sınırlıdır. PageSpeed API kota hatası verdiğinden CrUX alan verisi alınamadı. Otomatik SEO kontrolünün 100 çıkması tüm SEO'nun kusursuz olduğu anlamına gelmez.

Sunucu yanıtı örnek üç HTTP ölçümünde yaklaşık 182–194 ms ve önbellek HIT. Ana HTML yaklaşık 5 KB sıkıştırılmış; başlangıç JS 58 KB, CSS 19 KB. Buna rağmen sonraki veri paketi yaklaşık 223 KB transfer / 1 MB açılmış boyuta ulaşıyor. Mobil ana sayfada fontlar yaklaşık 284 KB, GTM + gtag yaklaşık 297 KB. Bunlar darboğazın nerede araştırılacağını gösterir; doğrudan her birinin bütün gecikmeye neden olduğunu kanıtlamaz.

Önerilen uygulama sırası:

1. İlk görünümün büyük ortak verinin tamamını beklememesini sağla; ana sayfa verisi, arama indeksi ve şarkı detayı verilerini ayır.
2. Ana görselin görünmesini geciktiren render ve dönen seçki davranışını düzelt. Ana hero için yüksek öncelik/eager yükleme zaten var; aynı ayarı tekrar eklemek tek başına çözüm değil.
3. LISA mobil testinde LCP olan video önizlemesi ilk HTML'de yok ve lazy yükleniyor. İlk ekranda kalacaksa erken keşfedilsin; okuma düzeni değişecekse video aşağı taşınsın. Bütün videoları erken yüklemek önerilmiyor.
4. Font ağırlıklarını ve gerçekten kullanılan karakter setlerini azalt. Türkçe karakterler ve içerikte gereken diğer diller korunmalı. Font `swap` ayarı zaten mevcut.
5. Kapakları ekran ve piksel yoğunluğuna uygun boyutlarda sun; kontrol edilen görsellerde modern format/sıkıştırma uygula. Harici kapaklarda platformun sunduğu varyantları kullan.
6. Analitik etiketlerin gerekliliğini ve yükleme zamanını gözden geçir. GTM ile gtag'ın birlikte bulunması tek başına çift sayım kanıtı değildir.

Gerçek kullanıcı hedefleri 75. yüzdelikte **LCP ≤2,5 sn, INP ≤200 ms, CLS ≤0,1** olmalı. Bu incelemede INP ölçülmedi; TBT onun yerine raporlanmamalı. [Google Web Vitals rehberi](https://web.dev/articles/vitals).

**SEO ve içerik yapısı.** Temel yapı çalışıyor: robots.txt ve sitemap mevcut; sitemap 1.020 benzersiz URL içeriyor. Dağılım: 578 şarkı, 289 sanatçı, 57 albüm, 30 yazı, 29 yıl koleksiyonu, 10 mood, 5 tür, 13 şarkı arşiv sayfası ve 9 diğer kök sayfa. Sitemap'teki albüm sayısı kullanıcıya görünen toplam albüm sayısıyla aynı olmak zorunda değil; bazı dar albüm sayfaları bilinçli olarak noindex bırakılmış. Canonical, gerçek sayfalama, MusicRecording/Article/Breadcrumb verileri mevcut. Denenen bilinmeyen sayfa doğru HTTP 404 verdi.

İlk SEO işi daha fazla etiket eklemek değil, **ilk HTML ile çalışan sayfanın aynı bilgiyi vermesi**. Happy örneğindeki farkın yanı sıra Listeler/Hakkımızda/İletişim/Gizlilik ilk yanıtında sayfa gövdesi yok; JavaScript çalıştıktan sonra içerik geliyor. 2 Eylül Pop Günlüğü yazısında canlı görünümde 15 ilgili çeviri ve 17 kaynak bağlantısı var, fakat bunlar ilk HTML gövdesinde bulunmuyor. İçerik ve kalıcı bağlantılar ilk yanıta da dahil edilmeli. Google JavaScript işleyebilir; bu bulgular “Google siteyi okuyamıyor” sonucunu desteklemez. [Google JavaScript SEO açıklaması](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics).

Türkçe meta açıklamaları doğal biçimde yeniden üretilmeli; sırf karakter alt sınırını doldurmak için İngilizce ek veya tekrarlı cümle kullanılmamalı. Google sonuç özetini sayfa içeriğinden de oluşturabilir; meta açıklamanın aynen gösterilmesi garanti değildir. [Google açıklama rehberi](https://developers.google.com/search/docs/appearance/snippet).

İçerikte büyüme yönü:

- Şarkının başında, editoryal olarak hazırlanmış kısa “Şarkı ne anlatıyor?” özeti. Mevcut açıklama notları bu özetle bağlantılı olsun.
- Sanatçı sayfalarında özgün kısa tanıtım, başlangıç için seçilen şarkılar, albüm dönemleri ve ilgili gündem yazıları.
- Albüm sayfalarında doğru parça sırası ve “kaç parçanın çevirisi var?” kapsamı. “Albüm”, “EP” ve “single” ayrımı açık olsun.
- Mood kategorilerinde anlaşılır Türkçe adlar ve editoryal etiket kontrolü. Sözde geçen bir kelimeyi tek başına ruh hali saymamak gerekir; mevcut sınıflandırmanın doğruluğu örnekli gözden geçirilmeli.
- Pop Günlüğü özetlerinde okurun ihtiyacı öne çıksın. Ana sayfada görünen aday tablo/arşiv işleyişi açıklamaları yerine şarkının neden konuşulduğu anlatılsın.
- “Günün/Şu an” alanlarında son güncelleme net görünsün. İnceleme günü 7 Eylül iken görünen son gündem 2 Eylül'dü. Bu beş günlük fark açıkça sunulmalı; gerçek zamanlılık izlenimi verilmemeli.

Dar veya tek içerikli kategori sayfası otomatik olarak SEO hatası sayılmaz. Kategoriye özgü yarar ve arama niyeti üzerinden indeks kararı verilmeli. Yeni tasarımda mevcut çeviri URL'leri korunmalı; zorunlu değişikliklerde tek adımlı kalıcı yönlendirme, canonical ve sitemap birlikte güncellenmeli.

**Linkler ve kullanıcı akışları.** Bağlantı örneklemindeki 35 dahili ve 20 harici hedef son durumda HTTP 200 verdi. Bu kontrol tüm siteyi veya videoların her ülkede oynatılabildiğini kapsamaz. Bir linkin açılması doğru hedefe ulaştırdığı anlamına gelmediği için Mood ve Billboard 200 sorunları ayrıca önceliklendirildi.

| Kullanıcı amacı | Mevcut engel / durum | Önerilen akış |
| --- | --- | --- |
| Bildiği bir şarkıyı bulmak | Büyük harf hatası, aynı sayfada eski sorgu, geniş aramada kesilen sonuçlar. | Arama → doğru eşleşme → çeviri başlangıcı. Sanatçı eşleşmeleri üstte, diğer içerik türleri açık gruplarda. |
| Bir dizeden şarkıyı bulmak | Dize sonucu mevcut; kaynakta hedef sadece şarkı sayfası. | Şarkıyı açınca eşleşen bölüm/satıra git ve kısa süre vurgula. Bu geliştirme kaynak incelemesine dayanır. |
| Ruh haline göre keşfetmek | Mood bölümü çok aşağıda, doğrudan bağlantı tepeye açılıyor. | Ruh hali seçimi → filtreli kısa liste → çeviri → benzer 3 öneri. |
| Sanatçı veya albüm arşivini gezmek | Şarkı arşivinde birleşik yıl/tür/dil filtresi yok; sanatçı A–Z söylemi gerçek sıralamayla uyumsuz. | Arama + A–Z/sıralama + filtreler; seçimler URL'de ve geri dönüşte korunsun. |
| Güncel listeden çeviriye geçmek | Albüm/şarkı ayrımı hedeflerde korunmuyor. | Liste türü → doğru albüm/şarkı → çeviri varsa oku, yoksa önceden doldurulmuş talep. |
| Çeviri talep etmek | İletişim sayfası e-posta ve Instagram'a yönlendiriyor. | Site içinde kısa talep formu; şarkı/sanatçı hazır; gönderim sonucu açık. Mevcut e-posta alternatifi korunabilir. |
| Okuduktan sonra devam etmek | Son baktıkların ve öneriler mevcut. | Aynı sanatçı + benzer anlam + aynı albüm önerilerinin gerekçesini görünür kıl. |

Alternative/EDM/Indie türlerinin ilk HTML'i sıfır içerik gösteriyor ve noindex. Happy'de bulunan ilk HTML/çalışan sayfa farkı nedeniyle bunlar canlı görünüm teyidi olmadan kesin boş kullanıcı sayfası sayılmadı. Düzeltme aşamasında gerçek içerik kontrol edilmeli; gerçekten boşlarsa ana keşif menüsünden kaldırılmalı veya dolu yakın kategorilere yönlendirilmeliler.

**Yeni özellik önerileri — değer ve maliyet sırasıyla.**

| Sıra | Yenilik | Kullanıcı değeri | Yaklaşık efor |
| --- | --- | --- | --- |
| 1 | Birleşik şarkı filtresi: sanatçı, yıl, dil, tür, ruh hali | Arşiv içinde aradığını daha kısa yoldan bulma. | Orta |
| 2 | Satır satır karşılaştırma + yazı boyutu/okuma tercihi | Mobilde anlamı karşılaştırarak rahat okuma. | Orta |
| 3 | Site içi çeviri/düzeltme talebi ve açık teslim sonucu | E-posta uygulaması gerektirmeden katkı. | Orta |
| 4 | Hesap gerektirmeyen favoriler / “Sonra oku” | Son ziyaret edilenlerden ayrı, bilinçli kişisel seçki. | Küçük–orta |
| 5 | Şarkı anlamı ve kültürel bağlam mini dosyaları | Çeviri arşivinin editoryal farkını güçlendirme. | Sürekli editoryal emek |
| 6 | Sanatçı/tema seçkileri: “buradan başla”, “bir albümün hikâyesi” | Yeni şarkı keşfi ve sayfalar arası devam. | Orta + editoryal |

Sosyal kart üretimi ve son okunanlar zaten var. Yeni yatırım önce bunların paylaşılabilirliğini ve bulunabilirliğini geliştirmeli. Hesap sistemi, zaman eşlemeli karaoke, tam kişiselleştirilmiş öneri motoru veya özel mobil uygulama daha yüksek maliyetli ikinci aşama seçenekleri; mevcut bulma/okuma sorunları çözüldükten sonra kullanım verisiyle değerlendirilmeliler.

**Önerilen 30 günlük çalışma sırası.**

| Dönem | İş | Tamamlandı sayılma ölçütü |
| --- | --- | --- |
| İlk 2–3 iş günü | LISA harf hatası, sorgu senkronu, Mood kaydırma, meta dil hatası, albüm hedefleri, tarih/sayı etiketleri. | Belirtilen canlı tekrar adımları hatasız; mevcut URL'ler korunmuş. |
| İlk hafta | İlk HTML/veri sınıflandırmasını ortaklaştırma; mobil LCP ve veri/font/görsel yükünü azaltma. | Happy HTML/ekran aynı liste; aynı profilde birkaç ölçümün medyanıyla hız kazanımı doğrulanmış. |
| İkinci hafta | Ana sayfa hiyerarşisi, kompakt mobil arama/katalog, kısa yollar, kapatma/kontrast/odak düzeltmeleri. | 360/390/430 piksel ve fiziksel cihazlarda arama → okuma ile keşif → okuma akışı rahat. |
| Üçüncü–dördüncü hafta | Filtreler, okuma ayarları, site içi talepler ve seçilmiş içerik iyileştirmeleri. | Filtreler geri dönüşte korunuyor; talepler doğru kayda ulaşıyor; içerik kapsamı açık. |

Bu takvim ekip kapasitesi bilinmeden hazırlanmış bir taslaktır; teslim taahhüdü değildir. Her adım küçük bir kapsamla yayına alınabilir.

Başarıyı izlemek için başlangıç ölçümü alınmalı: sonuçsuz arama oranı, aramadan şarkıya geçiş, çeviri alanına ulaşma, ilgili çeviriye geçiş, talep tamamlanması, geri dönen ziyaretçi ve mobil gerçek kullanıcı LCP/INP/CLS. Search Console'da sorgu ve sayfa bazında gösterim/tıklama, indeks kapsamı ve özet dili ayrıca kontrol edilmeli. Bu incelemede trafik veya sıralama artışı yüzdesi hesaplanmadı.

**Kanıtlar.** Aynı klasördeki `kanitlar` dizini üç ham Lighthouse raporunu, dahili/harici bağlantı sonuçlarını ve SEO örneklem özetlerini içerir. Ölçülen canlı sayfa örnekleri: [ana sayfa](https://www.acupoflyrics.com/), [arama](https://www.acupoflyrics.com/search?q=the), [Mood bağlantısı](https://www.acupoflyrics.com/discover#moods), [Happy](https://www.acupoflyrics.com/mood/happy), [listeler](https://www.acupoflyrics.com/listeler), [örnek şarkı](https://www.acupoflyrics.com/lisa-sawadika-turkce-ceviri/), [örnek gündem yazısı](https://www.acupoflyrics.com/pop-gunlugu/2-eylul-2026-muzik-gundemi), [iletişim](https://www.acupoflyrics.com/iletisim), [sitemap](https://www.acupoflyrics.com/sitemap.xml).
