import { useMemo } from "react";
import { Link } from "react-router-dom";
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

export default function PopGundemiPage() {
  const featured = popGundemiArticles[0];
  const secondary = popGundemiArticles.slice(1, 3);
  const archive = popGundemiArticles.slice(3);
  const coverColor = useAlbumColor(featured?.image, [38, 40, 56]);
  const theme = useMemo(() => themeFromColor(coverColor), [coverColor]);

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
            {popGundemiArticles.length} dosya · {formatDate(featured.date, { month: "long", year: "numeric" })}
          </span>
        </header>

        <section className="pop-journal-lead" style={{ "--pop-accent": theme.vars["--acl-accent"] }}>
          <Link className="pop-journal-lead-visual" to={popJournalPath(featured)} aria-label={featured.title}>
            <img src={featured.image} alt={featured.imageAlt || ""} />
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
        </section>

        <section className="pop-journal-section" aria-labelledby="journal-latest-title">
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
        </section>

        <section className="pop-journal-section pop-journal-archive" aria-labelledby="journal-archive-title">
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
        </section>

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
