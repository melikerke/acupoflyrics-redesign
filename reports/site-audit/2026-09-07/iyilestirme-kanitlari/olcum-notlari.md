# Yerel hız doğrulaması

Bunlar canlı sitenin veya gerçek kullanıcıların ölçümleri değildir. Aynı içerikle hazırlanmış HEAD sürümü ve düzenlenmiş sürüm, aynı bilgisayarda üretim önizlemesi olarak karşılaştırıldı. Lighthouse 12.8.2 mobil profilinde her sayfa ve sürüm için üç koşunun medyanı alındı (412×823, DPR 1.75, simüle 150 ms RTT / 1.638,4 Kbit/sn / 4× CPU). Ham sonuçlar `final-vs-baseline.json` ve ilişkili Lighthouse JSON dosyalarındadır.

| Sayfa | Performans puanı | LCP | Toplam aktarım | CLS |
|---|---:|---:|---:|---:|
| Ana sayfa — temel sürüm | 67 | 6,16 sn | 1,511 MB | 0 |
| Ana sayfa — ölçülen düzenleme | 89 | 3,16 sn | 1,470 MB | 0 |
| LISA / SaWaDiKa — temel sürüm | 64 | 6,84 sn | 1,383 MB | 0,241 |
| LISA / SaWaDiKa — ölçülen düzenleme | 77 | 5,27 sn | 0,936 MB | 0 |

Ana sayfanın LCP medyanı %48,7, LISA sayfasınınki %23,0 azaldı. Ana sayfada JavaScript aktarımı yaklaşık 600,7 KB'den 77,8 KB'ye düştü; indirilen kapak görselleri arttığından toplam aktarım yalnız %2,7 azaldı. LISA sayfasında toplam aktarım %32,3 azaldı. Ana sayfanın derlenmiş JavaScript bağımlılıkları 218.152 bayt; yerel gzip tahmini 73.788 bayt. Bu dosya hesabı gerçek ağ aktarımından ayrı değerlendirilmelidir.

Her iki sayfanın LCP medyanı hâlâ 2,5 saniyenin üzerinde. Ana sayfanın son üç LCP sonucu 2,73–4,13 saniye aralığında; uzaktaki kapak sunucuları, fontlar ve çalıştırma koşulları değişkenlik oluşturur. Bu sınırlı laboratuvar örneğinden gerçek kullanıcı Core Web Vitals sonucu veya arama sıralaması garantisi çıkarılamaz.

Ölçülen sürümden sonra masaüstü kapak alanının yüksekliği ve yorum alanının renk kontrastı için yalnız CSS düzeltmeleri yapıldı. Mobil hız medyanları ölçülen sürümün parmak izine bağlı tutuldu; son CSS sürümünün erişilebilirlik kontrolü ayrı kaydedildi. `iteration-1` dosyaları, son ana sayfa veri ayrımı ve Türkçe font altkümesi öncesindeki ara aşamayı belgeler.

Son CSS sürümündeki ayrı LISA kontrolü: erişilebilirlik 100/100, iyi uygulamalar 100/100, SEO 100/100. Bu tek doğrulama, üç koşuluk performans tablosunun yerine geçmez.
