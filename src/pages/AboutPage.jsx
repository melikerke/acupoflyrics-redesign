import { Link } from "react-router-dom";
import { newReleases, totalPosts } from "../lib/content";
import { discoverPath } from "../lib/paths";
import { LIGHT_THEME } from "../lib/theme";
import { useSeo } from "../lib/seo";
import SiteShell from "../components/site/SiteShell";
import PageHero from "../components/site/PageHero";
import { aboutTitle, aboutSections, aboutSchema, aboutProfileImage } from "../data/aboutContent";

export default function AboutPage() {
  useSeo({
    title: "Hakkımızda | acupoflyrics",
    description: "acupoflyrics, 2020'den beri şarkı sözlerinin hikâyesini ve anlamını Türkçeye taşıyan bağımsız bir çeviri arşividir.",
    path: "/hakkimizda",
    jsonLd: aboutSchema,
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
        title={aboutTitle}
        titleSerif
        description={`acupoflyrics, 2020'den beri şarkı sözlerinin hikâyesini ve anlamını Türkçeye taşıyor — bugüne kadar ${totalPosts} çeviri.`}
      />

      <section className="acl-section" style={{ maxWidth: 720 }}>
        <figure style={{ margin: '0 0 24px' }}>
          <img src={aboutProfileImage} alt="Melike Erke — acupoflyrics Instagram profil fotoğrafı" width="100" height="100" style={{ borderRadius: '50%', objectFit: 'cover' }} />
          <figcaption><a href="https://www.instagram.com/acupoflyrics/">Melike Erke · @acupoflyrics</a></figcaption>
        </figure>
        <div className="site-prose">
          {aboutSections.map((section, index) => <section key={section.title || index}>
            {section.title && <h2>{section.title}</h2>}
            {section.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
          </section>)}
        </div>
        <div className="site-hero-actions" style={{ marginTop: 26 }}>
          <Link className="site-btn" to={discoverPath()}>Arşivi keşfet</Link>
          <Link className="site-btn-ghost" to="/iletisim">İletişime geç</Link>
          <Link className="site-btn-ghost" to="/es">İspanyolca çeviriler</Link>
        </div>
      </section>
    </SiteShell>
  );
}
