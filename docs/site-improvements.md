# Hız ve SEO bakım notları

Güncel kapsam yalnızca hız ve SEO'dur. Önceki çalışmanın tasarım/arama değişiklikleri ve yeni kaydetme, okuyucu ayarları, talep formları/yönetimi kaldırıldı.

## Derleme ve kontroller

- `npm run build`: şarkı/sanatçı/yazı indeksleri, orijinal ana sayfa veri seçkisi, yönlendirmeler, Vite üretim derlemesi ve SEO HTML üretimi.
- `npm run test:seo-performance`: ana sayfanın katalog bağımsızlığı, görünür veri, geçmiş kartları ve SEO regresyonları.
- `npm run audit:seo` ve `npm run audit:redirects`: oluşturulan sayfa ve yönlendirme denetimleri.
- `npm run audit:payload`: rota bağımlılıklarının dosya boyutları ve yerel gzip tahminleri; gerçek kullanıcı hız ölçümü değildir.

Ana sayfa görünümü `HomePreview.jsx` içinde korunur; yalnızca veri seçimi `scripts/lib/homeIndex.js` tarafından derleme sırasında hazırlanır. Bölüm sırası ve içerik seçimi değiştirilmemelidir. Günlük iki kart için ayın 31 günü hazırlanır; ziyaretçinin yerel tarihiyle seçilir. İçerik değişikliklerinden sonra yeniden derleme yapılmalıdır.

Görseller aynı kapakların uygun çözünürlüklerini kullanır. Yerel font dosyalarının kaynağı/lisansı `public/fonts/README.md` içinde; font testi `scripts/testFontCoverage.py` içinde bulunur. Font testi için Python fontTools ve brotli gerekir, üretim derlemesinin Python bağımlılığı yoktur.

Analitik aynı izin arayüzünü kullanır. Google etiketleri izin verilmeden yüklenmez. İzin varsa LCP/INP/CLS olayları yüklenir; bu ölçümlerin canlı sonuçları ayrıca değerlendirilmelidir.

Önizleme: `npm run preview -- --host 127.0.0.1 --port 4173`. Bu statik önizlemedir; mevcut yorum/yönetim API'leri için geliştirme veya Vercel ortamı gerekir. Bu değişiklikler canlıya yayınlanmadı.

Güncel rapor: `reports/site-audit/2026-09-07/uygulanan-duzenlemeler.md`. Önceki genel tasarım çalışmasının ölçümleri son sürüm için geçerli değildir.
