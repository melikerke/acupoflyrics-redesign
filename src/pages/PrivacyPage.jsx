import { Link } from "react-router-dom";
import SiteShell from "../components/site/SiteShell";
import PageHero from "../components/site/PageHero";
import { newReleases } from "../lib/content";
import { useSeo } from "../lib/seo";
import { LIGHT_THEME } from "../lib/theme";

function openConsentPreferences() {
  window.dispatchEvent(new CustomEvent("acupoflyrics:open-consent"));
}

export default function PrivacyPage() {
  useSeo({
    title: "Gizlilik ve çerezler | acupoflyrics",
    description: "acupoflyrics üzerindeki Google Analytics ölçümü, çerez tercihi ve veri kullanımı hakkında bilgi.",
    path: "/gizlilik",
    breadcrumbs: [
      { name: "Ana sayfa", path: "/" },
      { name: "Gizlilik ve çerezler", path: "/gizlilik" },
    ],
  });

  return (
    <SiteShell theme={LIGHT_THEME}>
      <PageHero
        variant="topic"
        bg={newReleases[1]?.cover || newReleases[0]?.cover}
        collage={newReleases.slice(1, 5).map((post) => post.cover)}
        kicker="Gizlilik"
        title="Ölçüm açık, tercih senin."
        titleSerif
        description="Sitedeki analitik ölçümün ne yaptığını ve tercihini nasıl değiştirebileceğini burada açıklıyoruz."
      />

      <section className="acl-section" style={{ maxWidth: 720 }}>
        <div className="site-prose">
          <h2>Hangi araçları kullanıyoruz?</h2>
          <p>
            Site performansını ve hangi sayfaların ilgi gördüğünü anlamak için Google
            Tag Manager ile Google Analytics 4 kullanıyoruz. Sayfa görüntülemeleri,
            arama sonuçları ve çeviri okuma gibi temel kullanım hareketleri ölçülebilir.
            Reklam kişiselleştirmesi kapalıdır.
          </p>

          <h2>Tercihin nasıl çalışıyor?</h2>
          <p>
            Analitiğe izin verirsen Google Analytics ölçümü etkinleşir. Reddedersen
            analitik çerezleri yazılmaz; Google Consent Mode kapsamında sınırlı,
            çerezsiz sinyaller işlenebilir. Tercihin yalnızca bu tarayıcıda saklanır
            ve dilediğin zaman değiştirilebilir.
          </p>

          <h2>Daha fazla bilgi</h2>
          <p>
            Google’ın verileri nasıl işlediği hakkında{" "}
            <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">
              Google Gizlilik Politikası
            </a>
            ’nı inceleyebilirsin. Bu sayfayla ilgili bir sorunda{" "}
            <Link to="/iletisim">iletişim sayfasından</Link> bize ulaşabilirsin.
          </p>
        </div>

        <div className="site-hero-actions" style={{ marginTop: 26 }}>
          <button type="button" className="site-btn" onClick={openConsentPreferences}>
            Çerez tercihimi değiştir
          </button>
          <Link className="site-btn-ghost" to="/">Ana sayfaya dön</Link>
        </div>
      </section>
    </SiteShell>
  );
}
