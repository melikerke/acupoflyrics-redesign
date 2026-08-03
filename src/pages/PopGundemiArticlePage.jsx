import { Link, useParams } from "react-router-dom";
import { getPopGundemiArticle } from "../data/popGundemi";
import { ORIGIN, artistPath, popJournalPath } from "../lib/paths";
import { LIGHT_THEME } from "../lib/theme";
import { useSeo } from "../lib/seo";
import SiteShell from "../components/site/SiteShell";
import { Breadcrumbs, Icon } from "../components/site/ui";
import NotFound from "../components/site/NotFound";
import "../popGundemiArticle.css";

function formatDate(value) {
  return new Date(value).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
}

export default function PopGundemiArticlePage() {
  const { slug } = useParams();
  const article = getPopGundemiArticle(slug);
  const articlePath = article ? popJournalPath(article) : popJournalPath();
  const articleUrl = `${ORIGIN}${articlePath}`;
  const articleKeywords = article
    ? [
        article.artistName,
        article.shortTitle,
        article.kicker,
        "Pop Günlüğü",
        "müzik gündemi",
        "Türkçe çeviri",
      ].filter(Boolean)
    : [];

  useSeo({
    title: article ? `${article.shortTitle} | Pop Günlüğü` : "Pop Günlüğü | acupoflyrics",
    description: article?.excerpt,
    path: articlePath,
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
          "@type": "Article",
          mainEntityOfPage: { "@type": "WebPage", "@id": articleUrl },
          headline: article.title,
          alternativeHeadline: article.shortTitle,
          description: article.excerpt,
          url: articleUrl,
          image: [article.image],
          thumbnailUrl: article.image,
          inLanguage: "tr-TR",
          isAccessibleForFree: true,
          articleSection: article.kicker,
          keywords: articleKeywords,
          datePublished: article.date,
          dateModified: article.updatedAt,
          author: { "@type": "Organization", name: "acupoflyrics", url: ORIGIN },
          publisher: { "@type": "Organization", name: "acupoflyrics", url: ORIGIN },
          about: article.artistName
            ? [{ "@type": "MusicGroup", name: article.artistName }]
            : undefined,
          citation: article.sources?.map((source) => source.url),
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
      <article className="pop-article pop-story" style={{ "--pop-accent": article.accent }}>
        <Breadcrumbs
          items={[
            { name: "Ana sayfa", path: "/" },
            { name: "Pop Günlüğü", path: popJournalPath() },
            { name: article.shortTitle, path: popJournalPath(article) },
          ]}
        />

        <header className="pop-story-hero">
          <div className="pop-story-heading">
            <span className="site-kicker">{article.kicker} · {formatDate(article.date)} · {article.readTime}</span>
            <h1 className="font-serif">{article.title}</h1>
            <p>{article.dek}</p>
          </div>
          <figure className="pop-story-visual">
            <img src={article.image} alt={article.imageAlt || ""} />
            {article.imageSource ? (
              <a href={article.imageSource} target="_blank" rel="noopener noreferrer">
                {article.imageCredit || "acupoflyrics"}
              </a>
            ) : (
              <span>{article.imageCredit || "acupoflyrics"}</span>
            )}
          </figure>
        </header>

        <div className="pop-story-reading">
          <section className="pop-story-now" aria-label="Güncel durum">
            <div className="pop-story-now-heading">
              <span>{livePanel.label}</span>
              <h2>{livePanel.title}</h2>
            </div>
            <div className="pop-story-now-items">
              {livePanel.items.map((item) => (
                <p key={`${item.label}-${item.text}`}><strong>{item.label}</strong>{item.text}</p>
              ))}
            </div>
          </section>

          {article.sections?.length > 0 && (
            <div className="pop-story-body">
              {article.sections.map((section) => (
                <section className="pop-story-section" key={section.heading}>
                  <h2 className="font-serif">{section.heading}</h2>
                  {section.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                  {section.image && (
                    <figure className="pop-story-inline-figure">
                      {section.imageSource ? (
                        <a href={section.imageSource} target="_blank" rel="noopener noreferrer">
                          <img src={section.image} alt={section.imageAlt || ""} loading="lazy" />
                        </a>
                      ) : (
                        <img src={section.image} alt={section.imageAlt || ""} loading="lazy" />
                      )}
                      {section.imageCaption && <figcaption>{section.imageCaption}</figcaption>}
                    </figure>
                  )}
                </section>
              ))}
            </div>
          )}

          {article.memberStatus?.length > 0 && (
            <section className="pop-story-recap" aria-label="Son durum özeti">
              <span className="site-kicker">Hızlıca toparlayalım</span>
              {article.memberStatus.map((member) => (
                <div key={member.name}>
                  <strong>{member.name}</strong>
                  <p>{member.detail}</p>
                  <span>{member.status}</span>
                </div>
              ))}
            </section>
          )}

          <footer className="pop-story-footer">
            <section className="pop-story-sources">
              <span className="site-kicker">Meraklısına kaynaklar</span>
              <div>
                {article.sources.map((source) => (
                  <a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer">
                    {source.name} <Icon name="arrow" size={14} />
                  </a>
                ))}
              </div>
            </section>

            <div className="site-hero-actions pop-story-actions">
              {article.artistSlug && (
                <Link className="site-btn" to={artistPath(article.artistSlug)}>
                  {article.artistName || "Sanatçı"} çevirilerini keşfet
                </Link>
              )}
              <Link className="site-btn-ghost" to={popJournalPath()}>Pop Günlüğü'ne dön</Link>
            </div>
          </footer>
        </div>
      </article>
    </SiteShell>
  );
}
