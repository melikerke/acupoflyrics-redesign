# acupoflyrics — yalnızca hız ve SEO

7 Eylül 2026 — Kullanıcının son yönlendirmesine göre kapsam daraltıldı.

Tasarım, arama ve kullanıcı akışı değişiklikleri geri alındı. [Yerel önizleme](http://127.0.0.1:4173/).

## Korunan iyileştirmeler

- Ana sayfa, aynı bölüm ve kartları göstermek için bütün kataloğu yüklemiyor. Görünür içerik derleme sırasında küçük bir veri dosyasına ayrılıyor. Günün şarkısı ve alıntısı ziyaretçinin takvim gününe göre değişmeye devam ediyor.
- Sanatçı ve yazı kartları hafif indekslerden yükleniyor; uzun yazı gövdeleri ilk pakete girmiyor. Dize ve yazı içeriği araması ihtiyaç olduğunda yükleniyor.
- Aynı fontlar yerelden yükleniyor ve önbelleğe alınıyor. Türkçe karakter alt kümesi için gereken font dosyası 85.272 bayttan 3.096 bayta düşürüldü. Orijinal font aileleri, yazı ağırlıkları ve tema korundu.
- Şarkı kartları uygun boyutlu görseller kullanıyor. Geçmişteki şarkı kartları bütün arşivi yüklemeden gösteriliyor.
- Analitik yüklemesi izin verilene kadar erteleniyor; izinle gerçek kullanıcı hız ölçümleri alınabilecek altyapı korunuyor.
- Türkçe sayfa açıklamalarına İngilizce dolgu eklenmesi ve sayfa geçişinde eski sosyal görselin kalması düzeltildi.
- Canonical adresler, albüm/sanatçı metadata bilgileri, albüm parça şeması, boş kategori indeksleme kararları ve ilk HTML'deki içerik/bağlantılar iyileştirildi.
- Ruh hali ve tür arşivlerinin ilk HTML'deki içerikleri çalışan siteyle eşleştirildi; eski albüm/kategori yönlendirmeleri doğrulandı.

## Eski haline dönenler

Ana sayfa tasarımı ve tüm rafları, otomatik seçki geçişi, renkler, menüler, mobil alt menü, arama penceresi ve sonuç sayfası, katalog sayfaları, okuyucu görünümü, albüm/sanatçı sayfalarının görünen düzeni eski haline getirildi. Son çalışmada eklenen arama alanı, yeni filtre arayüzleri, kaydetme, okuma ayarları, talep formları ve talep yönetimi kaldırıldı.

## Doğrulama

- Orijinal ana sayfanın aynı içerikle ürettiği ekran HTML'si, hızlandırılmış ana sayfanın HTML'siyle aynı çıktı. React 18'deki yükleme önceliği özniteliğinin büyük/küçük harfi karşılaştırmada normalize edildi.
- Arama penceresi, arama sonuçları, şarkı/sanatçı/albüm arşivleri, Keşfet, iletişim, listeler, yönetim, ortak başlık bileşeni, tema ve üç ana CSS dosyası önceki sürümle birebir aynı.
- Mobilde 390 pikselde yatay taşma yok; alt menü yeniden Ana sayfa / Keşfet / Ara / Listeler. Aramada şarkı, yazı, dize, sanatçı ve albüm sonuçları kontrol edildi.
- Üretim derlemesi ve 4 hız/geçmiş testi geçti. SEO regresyonları 339 albümü, sanatçı metadata bilgilerini, 10 ruh hali ve 8 türü, 31 yazının kaynak/çeviri bağlantılarını kapsıyor.
- 1.309 HTML sayfası / 1.023 indekslenebilir adres: kırık iç bağlantı, erişilemeyen rota ve metadata denetimi hatası 0. Yönlendirme kontrolü geçti.
- Fontların 1.622 karakter kapsamı ve örnek glif çizimleri doğrulandı.
- Çalışma başındaki şarkı, sanatçı, liste ve gündem içerik değişiklikleri aynen korundu.

Ana sayfanın bağımlılık grafiğinde 322.953 bayt JavaScript var; yerel gzip tahmini 88.791 bayt. Bu bir ağ veya açılış süresi ölçümü değildir. Önceki tasarıma ait Lighthouse hız/erişilebilirlik sonuçları bu son sürüme uygulanamaz; yeni sürüm için yeniden zaman ölçümü yapılmadı.

Güncel kanıtlar: `hiz-seo-yalniz/`. `iyilestirme-kanitlari/` önceki, geri alınan tasarım çalışmasının tarihsel ölçümleridir.

Canlıya yayın yapılmadı. Güncel sürüm yerel projede ve önizlemede hazır.
