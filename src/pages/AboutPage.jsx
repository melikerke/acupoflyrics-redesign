import { Link } from "react-router-dom";
import { newReleases, totalPosts } from "../lib/content";
import { discoverPath } from "../lib/paths";
import { LIGHT_THEME } from "../lib/theme";
import { useSeo } from "../lib/seo";
import SiteShell from "../components/site/SiteShell";
import PageHero from "../components/site/PageHero";
import { aboutTitle, aboutSections } from "../data/aboutContent";

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
        title={aboutTitle}
        titleSerif
        description={`acupoflyrics, 2020'den beri şarkı sözlerinin hikâyesini ve anlamını Türkçeye taşıyor — bugüne kadar ${totalPosts} çeviri.`}
      />

      <section className="acl-section" style={{ maxWidth: 720 }}>
        <div className="site-prose">
          {aboutSections.map((section, index) => <section key={section.title || index}>
            {section.title && <h2>{section.title}</h2>}
            {section.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
          </section>)}
        </div>
        <div className="site-hero-actions" style={{ marginTop: 26 }}>
          <Link className="site-btn" to={discoverPath()}>Arşivi keşfet</Link>
          <Link className="site-btn-ghost" to="/iletisim">İletişime geç</Link>
        </div>
      </section>
    </SiteShell>
  );
}
