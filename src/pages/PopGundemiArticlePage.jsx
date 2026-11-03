import { useMemo } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { articleAliases } from '../data/articleAliases.js';
import { getPopGundemiArticle, popGundemiArticles } from "../data/popGundemi";
import { getPost, postPath, allPosts } from "../lib/content";
import { articleSchema } from '../lib/articleSchema.js';
import { articleLinkHref, articleSongSegments } from '../lib/articleSongLinks.js';
import { useAlbumColor } from "../lib/color";
import { ORIGIN, artistPath, popJournalPath } from "../lib/paths";
import { journalThemeFromColor } from "../lib/journalTheme.js";
import { useSeo } from "../lib/seo";
import { articleMetaTitle } from '../lib/meta.js';
import SiteShell from "../components/site/SiteShell";
import { Breadcrumbs, Icon } from "../components/site/ui";
import NotFound from "../components/site/NotFound";
import { JournalCharts, JournalSidebar, JournalStoryTools } from '../components/JournalWidgets';
import { journalFor, journalDate } from '../lib/journal.js';
import "../popGundemiArticle.css";
import '../journal.css';

function formatDate(value) {
  return new Date(value).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
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
  const fallbackColor = useMemo(() => colorFromHex(article?.accent), [article?.accent]);
  const coverColor = useAlbumColor(article?.image, fallbackColor);
  const storyTheme = useMemo(() => journalThemeFromColor(coverColor), [coverColor]);
  useSeo({
    title: article ? articleMetaTitle(article) : "Pop Günlüğü | acupoflyrics",
    preserveTitle: article?.preserveSeoTitle,
    description: article?.metaDescription || article?.excerpt,
    path: articlePath,
    image: article?.image,
    type: "article",
    noindex: !article,
    breadcrumbs: [
      { name: "Ana sayfa", path: "/" },
      { name: "Pop Günlüğü", path: popJournalPath() },
      { name: article?.shortTitle || "Yazı", path: article ? popJournalPath(article) : popJournalPath() },
    ],
    jsonLd: article ? articleSchema(article, ORIGIN) : null,
  });

  if (articleAliases[slug]) return <Navigate to={`/pop-gunlugu/${articleAliases[slug]}`} replace />;
  if (!article) return <NotFound />;
  const articleIndex = popGundemiArticles.findIndex((item) => item.slug === article.slug);
  const newerArticle = articleIndex > 0 ? popGundemiArticles[articleIndex - 1] : null;
  const olderArticle = articleIndex < popGundemiArticles.length - 1 ? popGundemiArticles[articleIndex + 1] : null;
  const hasSections = article.sections?.length > 0;
  const issueLabel = article.issue || "Pop Günlüğü";
  const relatedTranslations = (article.relatedTranslations || []).map(getPost).filter(Boolean);
  const livePanel = article.livePanel;
  const journal = journalFor(article);
  // The edition/date already appears above the headline, as in the supplied template.
  // Keep the complete title for SEO and the underlying editorial record.
  const displayTitle = journal.period ? article.title.replace(/^Haftanın Müzik Gündemi\s*\([^)]*\):\s*/, '') : article.title;
  const linkedText = text => articleSongSegments(text, article, allPosts).map((part, index) => {
    const href = articleLinkHref(part);
    if (!href) return part.text;
    return href.startsWith('/') ? <Link key={index} to={href}>{part.text}</Link>
      : <a key={index} href={href} target="_blank" rel="noopener noreferrer">{part.text}</a>;
  });

  return (
    <SiteShell theme={storyTheme} wide>
      <article
        className={`pop-article pop-story pop-story--editorial journal${article.layout ? ` pop-story--${article.layout}` : ""}`}
        style={{ "--pop-accent": storyTheme.vars["--acl-accent"] }}
      >
        <Breadcrumbs
          items={[
            { name: "Ana sayfa", path: "/" },
            { name: "Pop Günlüğü", path: popJournalPath() },
            { name: article.shortTitle, path: popJournalPath(article) },
          ]}
        />

        <header className={`pop-story-hero journal-hero--text${article.image ? ' journal-hero--with-cover' : ''}`}>
          <div className="pop-story-heading">
            <div className="pop-story-meta">
              <span className="pop-story-edition">{issueLabel}</span>
              <span className="site-kicker">{journal.period || formatDate(article.date)} · {article.readTime} okuma</span>
            </div>
          {article.image && <figure className="journal-cover">
            {article.imageSource ? (
              <a href={article.imageSource} target="_blank" rel="noopener noreferrer" aria-label={`Görsel kaynağı: ${article.imageCredit || article.title}`}>
                <img src={article.image} alt={article.imageAlt || `${article.title} görseli`} width="600" height="600" fetchPriority="high" />
              </a>
            ) : (
              <img src={article.image} alt={article.imageAlt || `${article.title} görseli`} width="600" height="600" fetchPriority="high" />
            )}
            {article.imageCredit && <figcaption>{article.imageCredit}</figcaption>}
          </figure>}
            <h1>{displayTitle}</h1>
            <p>{article.dek}</p>
            <div className="journal-byline"><span>Melike Erke</span><span>Yayın: {formatDate(article.date)}</span></div>
          </div>
        </header>

        <JournalCharts charts={journal.charts} />

        <div className={`pop-story-reading${hasSections ? " pop-story-reading--with-rail" : ""}`}>
          {hasSections && <JournalSidebar key={article.slug} article={article} journal={journal} />}

          <div className="pop-story-content">
            {article.updateNotice && (
              <section className="pop-story-summary pop-story-update" aria-label={article.updateNotice.label}>
                <div className="pop-story-summary-heading">
                  <h2 className="font-serif">{article.updateNotice.label}</h2>
                </div>
                <p>{article.updateNotice.text} <Link to={article.updateNotice.href}>{article.updateNotice.linkText} →</Link></p>
                <p>{article.updateNotice.archiveNote}</p>
              </section>
            )}

            {livePanel?.items?.length > 0 && <section className="pop-story-now" aria-label="Güncel durum">
              <div className="pop-story-now-heading">
                <span>{livePanel.label}</span>
                <h2>{livePanel.title}</h2>
              </div>
              <div className="pop-story-now-items">
                {livePanel.items.map((item) => (
                  <p key={`${item.label}-${item.text}`}><strong>{item.label}</strong>{item.text}</p>
                ))}
              </div>
            </section>}

            {article.sections?.length > 0 && (
              <div className="pop-story-body">
                {journal.stories.map((section, index) => (
                  <article
                    className="pop-story-section"
                    id={section.id}
                    key={section.heading}
                  >
                    {section.id !== section.legacyId && <span className="journal-anchor" id={section.legacyId} />}
                    <div className="journal-story-meta"><span className={`journal-badge${section.tag === 'tartışma' ? ' journal-badge--new' : ''}`}>{section.tag || `${String(index + 1).padStart(2, '0')} · ${article.kicker}`}</span>{section.eventDate && <time dateTime={section.eventDate}>Olay: {journalDate(section.eventDate)}</time>}</div>
                    <h2>{section.heading}</h2>
                    {(section.body || []).map(paragraph => <p key={paragraph}>{linkedText(paragraph)}</p>)}
                    {section.list?.length > 0 && <ul>{section.list.map(item => <li key={item}>{linkedText(item)}</li>)}</ul>}
                    {section.table && (
                      <div className="pop-story-table-scroll" role="region" aria-label={section.table.caption} tabIndex={0}>
                        <table className="pop-story-table">
                          <caption>{section.table.caption}</caption>
                          <thead><tr>{section.table.columns.map(column => <th key={column} scope="col">{column}</th>)}</tr></thead>
                          <tbody>{section.table.rows.map((row, rowIndex) => (
                            <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex}>{linkedText(cell)}</td>)}</tr>
                          ))}</tbody>
                        </table>
                      </div>
                    )}
                    {(section.afterTable || []).map(paragraph => <p key={paragraph}>{linkedText(paragraph)}</p>)}
                    {(section.afterList || []).map(paragraph => <p key={paragraph}>{linkedText(paragraph)}</p>)}
                    {(section.questions || []).map(({ question, answer }) => <div key={question}><h3>{question}</h3><p>{linkedText(answer)}</p></div>)}
                    {section.image && (
                      <figure className="pop-story-inline-figure">
                        {section.imageSource ? (
                          <a href={section.imageSource} target="_blank" rel="noopener noreferrer">
                            <img src={section.image} alt={section.imageAlt || `${section.heading} görseli`} loading="lazy" />
                          </a>
                        ) : (
                          <img src={section.image} alt={section.imageAlt || `${section.heading} görseli`} loading="lazy" />
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
                    {section.facts?.length > 0 && <ul className="journal-facts">{section.facts.map(fact => <li key={fact}>{fact}</li>)}</ul>}
                    <JournalStoryTools key={`${article.slug}-${section.id}`} story={section} />
                    {section.sourceIndexes?.length > 0 && <div className="journal-story-sources">{section.sourceIndexes.map(i => article.sources[i]).filter(Boolean).map(source => <a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer">{source.name} ↗</a>)}</div>}
                  </article>
                ))}
              </div>
            )}

            {article.socialCta && (
              <aside className="pop-story-social-cta" aria-label={article.socialCta.label || "Sosyal medya"}>
                <div>
                  <span className="site-kicker">{article.socialCta.label}</span>
                  <h2 className="font-serif">{article.socialCta.title}</h2>
                  <p>{article.socialCta.text}</p>
                </div>
                <a
                  className="site-btn"
                  href={article.socialCta.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {article.socialCta.buttonLabel} <Icon name="arrow" size={14} />
                </a>
              </aside>
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
                  <h2 id="related-translations-title" className="font-serif">{article.relatedTitle || "Şimdi sözlerine dalma zamanı"}</h2>
                  <p>{article.relatedDescription || "Yazıda geçen şarkıların Türkçe çevirilerini keşfet."}</p>
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
              <p className="journal-checked">Kaynak kontrolü: <time dateTime={journal.sourcesCheckedAt || article.updatedAt || article.date}>{formatDate(journal.sourcesCheckedAt || article.updatedAt || article.date)}</time></p>
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

              {article.sourceNote && <p>{article.sourceNote}</p>}

              <div className="site-hero-actions pop-story-actions">
                {article.artistSlug && (
                  <Link className="site-btn" to={artistPath(article.artistSlug)}>
                    {article.artistLinkLabel || `${article.artistName || "Sanatçı"} çevirilerini keşfet`}
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
