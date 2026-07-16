import { Link, useParams } from "react-router-dom";
import { getPopGundemiArticle } from "../data/popGundemi";
import { artistPath, popJournalPath } from "../lib/paths";
import { LIGHT_THEME } from "../lib/theme";
import { useSeo } from "../lib/seo";
import SiteShell from "../components/site/SiteShell";
import { Breadcrumbs, Icon } from "../components/site/ui";
import NotFound from "../components/site/NotFound";

function formatDate(value) {
  return new Date(value).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
}

export default function PopGundemiArticlePage() {
  const { slug } = useParams();
  const article = getPopGundemiArticle(slug);

  useSeo({
    title: article ? `${article.shortTitle} | Pop Günlüğü` : "Pop Günlüğü | acupoflyrics",
    description: article?.excerpt,
    path: article ? popJournalPath(article) : popJournalPath(),
    image: article?.image,
    type: "article",
    noindex: !article,
    breadcrumbs: [
      { name: "Ana sayfa", path: "/" },
      { name: "Pop Günlüğü", path: popJournalPath() },
      { name: article?.shortTitle || "Yazı", path: article ? popJournalPath(article) : popJournalPath() },
    ],
    jsonLd: article
      ? {
          "@context": "https://schema.org",
          "@type": "NewsArticle",
          headline: article.title,
          description: article.excerpt,
          image: article.image,
          datePublished: article.date,
          dateModified: article.updatedAt,
          author: { "@type": "Organization", name: "acupoflyrics" },
          publisher: { "@type": "Organization", name: "acupoflyrics" },
        }
      : null,
  });

  if (!article) return <NotFound />;
  const livePanel = article.livePanel || {
    label: "14 Temmuz 2026 itibarıyla",
    title: "Son durum",
    items: [
      { label: "Resmi açıklama", text: "JYP, görüşmelerin sürdüğünü söylüyor." },
      { label: "Yeni rapor", text: "JoyNews24, Jihyo'nun bireysel olarak ayrılabileceğini yazdı." },
      { label: "Grup tarafı", text: "Haberlere göre TWICE üyeliğinin sürmesi bekleniyor." },
    ],
  };

  return (
    <SiteShell theme={LIGHT_THEME} wide>
      <article className="pop-article" style={{ "--pop-accent": article.accent }}>
        <Breadcrumbs
          items={[
            { name: "Ana sayfa", path: "/" },
            { name: "Pop Günlüğü", path: popJournalPath() },
            { name: article.shortTitle, path: popJournalPath(article) },
          ]}
        />

        <header className="pop-article-hero">
          <div className="pop-article-copy">
            <span className="site-kicker">{article.kicker} · {formatDate(article.date)} · {article.readTime}</span>
            <h1 className="font-serif">{article.shortTitle}</h1>
            <p className="pop-article-subtitle">{article.title}</p>
            <p>{article.dek}</p>
          </div>
          <div className="pop-article-visual">
            <img src={article.image} alt="" />
            <span>acupoflyrics</span>
          </div>
        </header>

        <section className="pop-live-panel" aria-label="Güncel durum">
          <div>
            <span className="site-kicker">{livePanel.label}</span>
            <h2>{livePanel.title}</h2>
          </div>
          <div className="pop-live-items">
            {livePanel.items.map((item) => (
              <p key={`${item.label}-${item.text}`}><strong>{item.label}:</strong> {item.text}</p>
            ))}
          </div>
        </section>

        <section className="pop-brief">
          <div>
            <span className="site-kicker">Özet</span>
            <h2>Kısa özet</h2>
          </div>
          <ul>
            {article.summary.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </section>

        <section className="pop-member-status" aria-label="Üye bazlı durum">
          {article.memberStatus.map((member) => (
            <div key={member.name}>
              <span>{member.status}</span>
              <strong>{member.name}</strong>
              <p>{member.detail}</p>
            </div>
          ))}
        </section>

        <section className="pop-sources">
          <span className="site-kicker">Kaynaklar</span>
          <div>
            {article.sources.map((source) => (
              <a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer">
                {source.name} <Icon name="arrow" size={14} />
              </a>
            ))}
          </div>
        </section>

        <div className="site-hero-actions pop-article-actions">
          {article.artistSlug && (
            <Link className="site-btn" to={artistPath(article.artistSlug)}>
              {article.artistName || "Sanatçı"} çevirilerini keşfet
            </Link>
          )}
          <Link className="site-btn-ghost" to={popJournalPath()}>Pop Günlüğü</Link>
        </div>
      </article>
    </SiteShell>
  );
}
