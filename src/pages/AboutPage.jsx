import { Link } from "react-router-dom";
import { newReleases, totalPosts } from "../lib/content";
import { discoverPath } from "../lib/paths";
import { LIGHT_THEME } from "../lib/theme";
import { useSeo } from "../lib/seo";
import SiteShell from "../components/site/SiteShell";
import PageHero from "../components/site/PageHero";

export default function AboutPage() {
  useSeo({
    title: "Hakkımızda | acupoflyrics",
    description: "acupoflyrics, 2020'den beri şarkı sözlerinin hikâyesini ve anlamını Türkçeye taşıyan bağımsız bir çeviri arşividir.",
    path: "/hakkimizda",
    breadcrumbs: [
      { name: "Ana sayfa", path: "/" },
      { name: "Hakkımızda", path: "/hakkimizda" },
    ],
  });

  return (
    <SiteShell theme={LIGHT_THEME}>
      <PageHero
        variant="topic"
        bg={newReleases[0]?.cover}
        collage={newReleases.slice(0, 4).map((p) => p.cover)}
        kicker="Hakkımızda"
        title="İki dil arasında bir okuma alanı."
        titleSerif
        description={`acupoflyrics, 2020'den beri şarkı sözlerinin hikâyesini ve anlamını Türkçeye taşıyor — bugüne kadar ${totalPosts} çeviri.`}
      />

      <section className="acl-section" style={{ maxWidth: 720 }}>
        <div className="site-prose">
          <p>
            Burada çeviri, kelimeleri değiştirmek değil; bir şarkının bıraktığı hissi
            Türkçede yeniden kurmak olarak anlaşılır. Her çeviri tek tek elle yapılır,
            zor tercihlerin gerekçesi çevirmen notlarıyla açıklanır.
          </p>
          <p>
            Sözlerin telifi sanatçılarına ve yayıncılarına aittir; bu sitedeki metinler
            eğitim ve kültürel paylaşım amacıyla, kaynağına bağlantı verilerek sunulur.
            Spotify ve YouTube bağlantıları ilgili platformlara gider.
          </p>
          <p>
            Bir düzeltme önerin ya da çevrilmesini istediğin bir şarkı varsa{" "}
            <Link to="/iletisim">iletişim sayfasından</Link> yazabilirsin.
          </p>
        </div>
        <div className="site-hero-actions" style={{ marginTop: 26 }}>
          <Link className="site-btn" to={discoverPath()}>Arşivi keşfet</Link>
          <Link className="site-btn-ghost" to="/iletisim">İletişime geç</Link>
        </div>
      </section>
    </SiteShell>
  );
}
