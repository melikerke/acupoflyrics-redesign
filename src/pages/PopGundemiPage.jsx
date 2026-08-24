import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { popGundemiArticles } from "../data/popGundemi";
import { useAlbumColor } from "../lib/color";
import { popJournalPath } from "../lib/paths";
import { themeFromColor } from "../lib/theme";
import { useSeo } from "../lib/seo";
import SiteShell from "../components/site/SiteShell";
import { Icon } from "../components/site/ui";
import "../popGundemiHome.css";

function formatDate(value, options = { day: "numeric", month: "long" }) {
  return new Date(value).toLocaleDateString("tr-TR", options);
}

function articleMeta(article) {
  return `${formatDate(article.date)} · ${article.readTime} okuma`;
}

function topicFor(article) {
  const kicker = article.kicker.toLocaleLowerCase("tr-TR");
  if (kicker.includes("k-pop") || kicker.includes("asya")) return "K-pop";
  if (kicker.includes("yeni müzik")) return "Yeni müzik";
  if (kicker.includes("hafıza")) return "Müzik hafızası";
  return "Pop";
}

function monthKey(value) {
  return String(value).slice(0, 7);
}

function monthLabel(value) {
  return formatDate(`${value}-01`, { month: "long", year: "numeric" });
}

export default function PopGundemiPage() {
  const [params, setParams] = useSearchParams();
  const featured = popGundemiArticles[0];
  const secondary = popGundemiArticles.slice(1, 3);
  const archive = popGundemiArticles.slice(3);
  const topics = useMemo(() => [...new Set(popGundemiArticles.map(topicFor))], []);
  const months = useMemo(() => [...new Set(popGundemiArticles.map((article) => monthKey(article.date)))], []);
  const requestedTopic = params.get("konu") || "all";
  const requestedMonth = params.get("ay") || "all";
  const activeTopic = topics.includes(requestedTopic) ? requestedTopic : "all";
  const activeMonth = months.includes(requestedMonth) ? requestedMonth : "all";
  const isFiltering = activeTopic !== "all" || activeMonth !== "all";
  const filteredArticles = useMemo(() => popGundemiArticles.filter((article) => (
    (activeTopic === "all" || topicFor(article) === activeTopic)
    && (activeMonth === "all" || monthKey(article.date) === activeMonth)
  )), [activeMonth, activeTopic]);
  const coverColor = useAlbumColor(featured?.image, [38, 40, 56]);
  const theme = useMemo(() => themeFromColor(coverColor), [coverColor]);
  const updateFilter = (key, value) => {
    const next = new URLSearchParams(params);
    if (value === "all") next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };

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
    <SiteShell theme={theme} wide>
      <div className="pop-journal-home">
        <header className="pop-journal-masthead">
          <div>
            <span className="site-kicker">acupoflyrics editoryal</span>
            <h1 className="font-serif">Pop Günlüğü</h1>
          </div>
          <p>
            Pop ve K-pop dünyasında konuşulanları; doğrulanan, rapor edilen ve hâlâ
            bekleyen kısımları birbirinden ayırarak okuyoruz.
          </p>
          <span className="pop-journal-issue">
            {popGundemiArticles.length} dosya · Temmuz–Ağustos 2026
          </span>
        </header>

        <nav className="pop-journal-filters" aria-label="Pop Günlüğü arşiv filtreleri">
          <div className="pop-journal-filter-group">
            <span>Konu</span>
            <div>
              {["all", ...topics].map((topic) => (
                <button
                  key={topic}
                  type="button"
                  className={activeTopic === topic ? "is-active" : ""}
                  aria-pressed={activeTopic === topic}
                  onClick={() => updateFilter("konu", topic)}
                >
                  {topic === "all" ? "Tümü" : topic}
                  <small>{topic === "all" ? popGundemiArticles.length : popGundemiArticles.filter((article) => topicFor(article) === topic).length}</small>
                </button>
              ))}
            </div>
          </div>
          <div className="pop-journal-filter-group">
            <span>Dönem</span>
            <div>
              {["all", ...months].map((month) => (
                <button
                  key={month}
                  type="button"
                  className={activeMonth === month ? "is-active" : ""}
                  aria-pressed={activeMonth === month}
                  onClick={() => updateFilter("ay", month)}
                >
                  {month === "all" ? "Tüm aylar" : monthLabel(month)}
                </button>
              ))}
            </div>
          </div>
        </nav>

        {!isFiltering && <section className="pop-journal-lead" style={{ "--pop-accent": theme.vars["--acl-accent"] }}>
          <Link className="pop-journal-lead-visual" to={popJournalPath(featured)} aria-label={featured.title}>
            <img src={featured.image} alt={featured.imageAlt || `${featured.title} görseli`} />
            <span>
              <small>Manşet · {formatDate(featured.date)}</small>
              <strong>{featured.kicker}</strong>
            </span>
          </Link>
          <div className="pop-journal-lead-copy">
            <span className="site-kicker">Ayın dosyası</span>
            <h2 className="font-serif">
              <Link to={popJournalPath(featured)}>{featured.title}</Link>
            </h2>
            <p>{featured.excerpt}</p>
            <div className="pop-journal-lead-meta">
              <span>{articleMeta(featured)}</span>
              <span>{featured.sources.length} kaynak</span>
            </div>
            <Link className="pop-journal-read" to={popJournalPath(featured)}>
              Dosyayı oku <Icon name="arrow" size={15} />
            </Link>
          </div>
        </section>}

        {!isFiltering && <section className="pop-journal-section" aria-labelledby="journal-latest-title">
          <header className="pop-journal-section-head">
            <div>
              <span className="site-kicker">Gündemin devamı</span>
              <h2 id="journal-latest-title" className="font-serif">Şimdi ne konuşuyoruz?</h2>
            </div>
            <p>En yeni iki not; manşeti tekrar etmeden.</p>
          </header>
          <div className="pop-journal-secondary-grid">
            {secondary.map((article, index) => (
              <Link
                key={article.slug}
                className="pop-journal-secondary-card"
                to={popJournalPath(article)}
                style={{ "--pop-accent": article.accent }}
              >
                <div className="pop-journal-secondary-image">
                  <img src={article.image} alt="" loading="lazy" />
                  <span>{String(index + 2).padStart(2, "0")}</span>
                </div>
                <div>
                  <small>{article.kicker} · {articleMeta(article)}</small>
                  <strong className="font-serif">{article.title}</strong>
                  <p>{article.excerpt}</p>
                  <em>Okumaya devam et <Icon name="arrow" size={13} /></em>
                </div>
              </Link>
            ))}
          </div>
        </section>}

        {!isFiltering && <section className="pop-journal-section pop-journal-archive" aria-labelledby="journal-archive-title">
          <header className="pop-journal-section-head">
            <div>
              <span className="site-kicker">Arşiv akışı</span>
              <h2 id="journal-archive-title" className="font-serif">Biraz daha aşağıda</h2>
            </div>
            <p>Pop hafızası, sektör notları ve çeviri radarından kalan dosyalar.</p>
          </header>
          <div className="pop-journal-archive-list">
            {archive.map((article, index) => (
              <Link
                key={article.slug}
                className="pop-journal-archive-row"
                to={popJournalPath(article)}
                style={{ "--pop-accent": article.accent }}
              >
                <span className="pop-journal-archive-number">{String(index + 4).padStart(2, "0")}</span>
                <img src={article.image} alt="" loading="lazy" />
                <span className="pop-journal-archive-copy">
                  <small>{article.kicker} · {articleMeta(article)}</small>
                  <strong>{article.title}</strong>
                  <em>{article.excerpt}</em>
                </span>
                <Icon name="arrow" size={16} />
              </Link>
            ))}
          </div>
        </section>}

        {isFiltering && (
          <section className="pop-journal-section pop-journal-filter-results" aria-labelledby="journal-filter-title">
            <header className="pop-journal-section-head">
              <div>
                <span className="site-kicker">Seçili arşiv</span>
                <h2 id="journal-filter-title" className="font-serif">
                  {activeTopic !== "all" ? activeTopic : monthLabel(activeMonth)}
                </h2>
              </div>
              <p>{filteredArticles.length} dosya bulundu.</p>
            </header>
            {filteredArticles.length > 0 ? (
              <div className="pop-journal-archive-list">
                {filteredArticles.map((article, index) => (
                  <Link
                    key={article.slug}
                    className="pop-journal-archive-row"
                    to={popJournalPath(article)}
                    style={{ "--pop-accent": article.accent }}
                  >
                    <span className="pop-journal-archive-number">{String(index + 1).padStart(2, "0")}</span>
                    <img src={article.image} alt="" loading="lazy" />
                    <span className="pop-journal-archive-copy">
                      <small>{topicFor(article)} · {articleMeta(article)}</small>
                      <strong>{article.title}</strong>
                      <em>{article.excerpt}</em>
                    </span>
                    <Icon name="arrow" size={16} />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="pop-journal-filter-empty">
                <p className="font-serif">Bu kesişimde henüz bir dosya yok.</p>
                <button type="button" onClick={() => setParams({}, { replace: true })}>Tüm dosyaları göster</button>
              </div>
            )}
          </section>
        )}

        <section className="pop-journal-method" aria-labelledby="journal-method-title">
          <div>
            <span className="site-kicker">Editoryal ilke</span>
            <h2 id="journal-method-title" className="font-serif">Haberi büyütmeden, bağlamı küçültmeden.</h2>
          </div>
          <dl>
            <div><dt>01 · Doğrulanan</dt><dd>Resmi açıklama ve doğrudan kaynak.</dd></div>
            <div><dt>02 · Raporlanan</dt><dd>Güvenilir basının aktardığı, henüz kesinleşmeyen bilgi.</dd></div>
            <div><dt>03 · Bekleyen</dt><dd>Söylentiyle haberi birbirine karıştırmadan izlediğimiz bölüm.</dd></div>
          </dl>
        </section>
      </div>
    </SiteShell>
  );
}
