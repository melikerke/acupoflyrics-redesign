import { Link } from "react-router-dom";
import { popGundemiArticles } from "../data/popGundemi";
import { popJournalPath } from "../lib/paths";
import { LIGHT_THEME } from "../lib/theme";
import { useSeo } from "../lib/seo";
import { MobileTabBar, SiteFooter, SiteNav } from "../components/site/SiteShell";
import { Icon } from "../components/site/ui";
import "../preview.css";
import "../site.css";

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
    <div className={`acl-home ${LIGHT_THEME.dark ? "is-dark" : "is-light"}`} style={LIGHT_THEME.vars}>
      <SiteNav />
      <main className="acl-shell">
        <div className="acl-main-column" style={{ position: "relative" }}>
          <div className="hero-ambient-glow" />
          <div className="hero-ambient-glow-2" />

          <section className="acl-hero pop-home-hero">
            <img className="acl-hero-bg" src={featured.image} alt="" aria-hidden />
            <div className="acl-hero-vignette" aria-hidden />
            <div className="acl-hero-copy">
              <div className="acl-kicker">
                <span>Son Haber</span>
                <i />
              </div>
              <h1 className="font-serif">Pop gündemini bağlamıyla oku.</h1>
              <p className="acl-original">
                K-pop ve pop müzikte konuşulanları; doğrulanan, rapor edilen ve bekleyen
                kısımları ayırarak topluyoruz.
              </p>
              <p className="acl-meta">{popGundemiArticles.length} not · Kaynaklı gündem · Kısa okuma</p>
              <div className="acl-hero-actions">
                <Link to={popJournalPath(featured)} className="acl-primary-btn">
                  Son gündemi oku
                  <Icon name="arrow" size={16} />
                </Link>
              </div>
            </div>
            <Link to={popJournalPath(featured)} className="acl-hero-art pop-home-art" aria-label={featured.shortTitle}>
              <img src={featured.image} alt={featured.shortTitle} />
              <span>
                <small>{featured.kicker} · {new Date(featured.date).toLocaleDateString("tr-TR")}</small>
                <strong>{featured.shortTitle}</strong>
              </span>
            </Link>
          </section>

          <section className="acl-section">
            <div className="acl-section-head">
              <h2>Son gündemler</h2>
              <Link to={popJournalPath(featured)}>Tümünü gör <Icon name="arrow" size={15} /></Link>
            </div>
            <div className="acl-cover-row pop-home-row">
              {popGundemiArticles.map((article) => (
                <Link
                  key={article.slug}
                  to={popJournalPath(article)}
                  className="acl-cover-card pop-home-card"
                  style={{ "--pop-accent": article.accent }}
                >
                  <img src={article.image} alt="" loading="lazy" />
                  <strong>{article.shortTitle}</strong>
                  <span>{article.kicker}</span>
                  <small>{new Date(article.date).toLocaleDateString("tr-TR")} · {article.readTime}</small>
                </Link>
              ))}
            </div>
          </section>

          <section className="acl-section">
            <div className="pop-home-note">
              <span>Nasıl okuyoruz?</span>
              <p>
                Gündemdeki haberleri doğrudan kopyalamıyoruz; resmi açıklama, basın
                raporu ve sosyal medya söylentisini ayırıp kısa bir okuma notuna çeviriyoruz.
              </p>
            </div>
          </section>
        </div>
      </main>
      <SiteFooter />
      <MobileTabBar />
    </div>
  );
}
