import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { getPopGundemiArticle, popGundemiArticles } from "../data/popGundemi";
import { getPost, postPath } from "../lib/content";
import { useAlbumColor } from "../lib/color";
import { ORIGIN, artistPath, popJournalPath } from "../lib/paths";
import { themeFromColor } from "../lib/theme";
import { useSeo } from "../lib/seo";
import SiteShell from "../components/site/SiteShell";
import { Breadcrumbs, Icon } from "../components/site/ui";
import NotFound from "../components/site/NotFound";
import "../popGundemiArticle.css";

function formatDate(value) {
  return new Date(value).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
}

function formatEdition(value) {
  return new Date(value).toLocaleDateString("tr-TR", { month: "long", year: "numeric" });
}

function colorFromHex(value, fallback = [214, 69, 122]) {
  const hex = String(value || "").replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(hex)) return fallback;
  return [
    Number.parseInt(hex.slice(0, 2), 16),
    Number.parseInt(hex.slice(2, 4), 16),
    Number.parseInt(hex.slice(4, 6), 16),
  ];
}

export default function PopGundemiArticlePage() {
  const { slug } = useParams();
  const article = getPopGundemiArticle(slug);
  const articlePath = article ? popJournalPath(article) : popJournalPath();
  const articleUrl = `${ORIGIN}${articlePath}`;
  const fallbackColor = useMemo(() => colorFromHex(article?.accent), [article?.accent]);
  const coverColor = useAlbumColor(article?.image, fallbackColor);
  const storyTheme = useMemo(() => themeFromColor(coverColor), [coverColor]);
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
  const articleIndex = popGundemiArticles.findIndex((item) => item.slug === article.slug);
  const newerArticle = articleIndex > 0 ? popGundemiArticles[articleIndex - 1] : null;
  const olderArticle = articleIndex < popGundemiArticles.length - 1 ? popGundemiArticles[articleIndex + 1] : null;
  const hasSections = article.sections?.length > 0;
  const edition = article.edition || formatEdition(article.date);
  const issueLabel = article.issue || "Pop Günlüğü";
  const relatedTranslations = (article.relatedTranslations || []).map(getPost).filter(Boolean);
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
    <SiteShell theme={storyTheme} wide>
      <article
        className={`pop-article pop-story pop-story--editorial${article.layout ? ` pop-story--${article.layout}` : ""}`}
        style={{ "--pop-accent": storyTheme.vars["--acl-accent"] }}
      >
        <Breadcrumbs
          items={[
            { name: "Ana sayfa", path: "/" },
            { name: "Pop Günlüğü", path: popJournalPath() },
            { name: article.shortTitle, path: popJournalPath(article) },
          ]}
        />

        <header className="pop-story-hero">
          <div className="pop-story-heading">
            <div className="pop-story-meta">
              <span className="site-kicker">{article.kicker} · {formatDate(article.date)} · {article.readTime}</span>
              <span className="pop-story-edition">{issueLabel}</span>
            </div>
            <h1 className="font-serif">{article.title}</h1>
            <p>{article.dek}</p>
          </div>
          <figure className="pop-story-visual">
            <img src={article.image} alt={article.imageAlt || ""} />
            <figcaption className="pop-story-cover-stamp">
              <span>{edition}</span>
              <strong>{article.kicker}</strong>
            </figcaption>
            {article.imageSource ? (
              <a href={article.imageSource} target="_blank" rel="noopener noreferrer">
                {article.imageCredit || "acupoflyrics"}
              </a>
            ) : (
              <span>{article.imageCredit || "acupoflyrics"}</span>
            )}
          </figure>
        </header>

        <div className={`pop-story-reading${hasSections ? " pop-story-reading--with-rail" : ""}`}>
          {hasSections && (
            <aside className="pop-story-rail" aria-label="Yazı içeriği">
              <span className="site-kicker">Bu dosyada</span>
              <nav>
                {article.sections.map((section, index) => (
                  <a key={section.heading} href={`#bolum-${index + 1}`}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    {section.heading}
                  </a>
                ))}
              </nav>
              <p>{article.readTime} okuma</p>
            </aside>
          )}

          <div className="pop-story-content">
            {article.summary?.length > 0 && (
              <section className="pop-story-summary" aria-labelledby="story-summary-title">
                <div className="pop-story-summary-heading">
                  <span>60 saniyede</span>
                  <h2 id="story-summary-title" className="font-serif">Ayın kısa özeti</h2>
                </div>
                <ol>
                  {article.summary.map((item, index) => (
                    <li key={item}>
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <p>{item}</p>
                    </li>
                  ))}
                </ol>
              </section>
            )}

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
                {article.sections.map((section, index) => (
                  <section
                    className="pop-story-section"
                    id={`bolum-${index + 1}`}
                    key={section.heading}
                  >
                    <span className="pop-story-section-number">{String(index + 1).padStart(2, "0")}</span>
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
                    {index === 1 && article.pullQuote && (
                      <aside className="pop-story-pullquote">
                        <span>Radar notu</span>
                        <p className="font-serif">{article.pullQuote}</p>
                      </aside>
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

            {relatedTranslations.length > 0 && (
              <section className="pop-story-related" aria-labelledby="related-translations-title">
                <div className="pop-story-related-heading">
                  <span className="site-kicker">Haberde geçen sesler</span>
                  <h2 id="related-translations-title" className="font-serif">Radardan çeviri arşivine</h2>
                  <p>Haberi okudun; şimdi aynı dünyadan şarkıların sözlerine biraz daha yaklaş.</p>
                </div>
                <div className="pop-story-related-grid">
                  {relatedTranslations.map((post) => (
                    <Link key={post.slug} to={postPath(post)} className="pop-story-related-card">
                      <img src={post.cover || post.image} alt="" loading="lazy" />
                      <span>
                        <small>{post.artist}</small>
                        <strong>{post.song}</strong>
                        <em>Türkçe çeviriyi aç <Icon name="arrow" size={13} /></em>
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            <footer className="pop-story-footer">
              <section className="pop-story-sources">
                <span className="site-kicker">Meraklısına kaynaklar</span>
                <div>
                  {article.sources.map((source, index) => (
                    <a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer">
                      <span>{String(index + 1).padStart(2, "0")}</span>
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

              {(newerArticle || olderArticle) && (
                <nav className="pop-story-pagination" aria-label="Pop Günlüğü yazıları arasında gezin">
                  {newerArticle ? (
                    <Link to={popJournalPath(newerArticle)} className="pop-story-pagination-card is-newer">
                      <img src={newerArticle.image} alt="" loading="lazy" />
                      <span>
                        <small>← Daha yeni dosya</small>
                        <strong className="font-serif">{newerArticle.shortTitle || newerArticle.title}</strong>
                      </span>
                    </Link>
                  ) : <span />}
                  {olderArticle && (
                    <Link to={popJournalPath(olderArticle)} className="pop-story-pagination-card is-older">
                      <span>
                        <small>Daha eski dosya →</small>
                        <strong className="font-serif">{olderArticle.shortTitle || olderArticle.title}</strong>
                      </span>
                      <img src={olderArticle.image} alt="" loading="lazy" />
                    </Link>
                  )}
                </nav>
              )}
            </footer>
          </div>
        </div>
      </article>
    </SiteShell>
  );
}
