import { Link } from "react-router-dom";
import { popGundemiArticles } from "../data/popGundemi";
import { popJournalPath } from "../lib/paths";
import { LIGHT_THEME } from "../lib/theme";
import { useSeo } from "../lib/seo";
import SiteShell from "../components/site/SiteShell";
import PageHero from "../components/site/PageHero";
import { Icon, Section } from "../components/site/ui";

export default function PopGundemiPage() {
  const featured = popGundemiArticles[0];

  useSeo({
    title: "Pop Günlüğü | acupoflyrics",
    description: "K-pop ve pop müzik gündeminde konuşulanları kaynaklarıyla, sakin ve anlaşılır notlarla takip et.",
    path: popJournalPath(),
    image: featured?.image,
    breadcrumbs: [
      { name: "Ana sayfa", path: "/" },
      { name: "Pop Günlüğü", path: popJournalPath() },
    ],
  });

  return (
    <SiteShell theme={LIGHT_THEME} wide>
      <PageHero
        variant="topic"
        bg={featured?.image}
        collage={popGundemiArticles.slice(0, 4).map((article) => article.image)}
        kicker="Pop Günlüğü"
        title="Pop gündemini panikle değil, bağlamıyla oku."
        titleSerif
        description="K-pop ve pop müzikte konuşulan haberleri; iddia, resmi açıklama ve fan gündemi ayrımıyla kısa ama kaynaklı şekilde topluyoruz."
        stats={[
          { value: popGundemiArticles.length, label: "not", icon: "note" },
          { value: "Kaynaklı", label: "gündem", icon: "search" },
          { value: "Kısa", label: "okuma", icon: "clock" },
        ]}
      />

      <Section title="Son gündemler" kicker="Kaynaklı notlar">
        <div className="pop-journal-grid">
          {popGundemiArticles.map((article) => (
            <Link
              key={article.slug}
              to={popJournalPath(article)}
              className="pop-journal-card"
              style={{ "--pop-accent": article.accent }}
            >
              <span className="pop-journal-thumb">
                <img src={article.image} alt="" loading="lazy" />
              </span>
              <span className="site-kicker">{article.kicker} · {new Date(article.date).toLocaleDateString("tr-TR")}</span>
              <strong>{article.shortTitle}</strong>
              <em>{article.excerpt}</em>
              <span className="pop-journal-read">
                Oku <Icon name="arrow" size={15} />
              </span>
            </Link>
          ))}
        </div>
      </Section>
    </SiteShell>
  );
}
