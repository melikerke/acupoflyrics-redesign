import { Stat } from "./ui";

// One hero for every content type, all sharing the homepage's calm treatment:
// a single, heavily-blurred cover as a soft colour field behind a strong
// porcelain wash, with the text kept fully readable.
//   album  → clean square cover (left)
//   artist → round portrait (left)
//   topic  → contained 2×2 cover mosaic (right, Spotify-playlist style)
export default function PageHero({
  variant = "topic",
  bg,
  cover,
  portrait,
  collage,
  kicker,
  title,
  titleSerif = false,
  subtitle,
  meta,
  description,
  actions,
  stats,
}) {
  const media = cover ? (
    <div className="site-hero-art"><img src={cover} alt="" /></div>
  ) : portrait ? (
    <div className="site-hero-portrait"><img src={portrait} alt="" /></div>
  ) : collage && collage.length > 0 ? (
    <div className="site-hero-mosaic" aria-hidden>
      {collage.slice(0, 4).map((c, i) => <img key={i} src={c} alt="" />)}
    </div>
  ) : null;

  const copy = (
    <div className="site-hero-copy">
      {kicker && <span className="site-kicker">{kicker}</span>}
      <h1 className={titleSerif ? "font-serif" : undefined}>{title}</h1>
      {subtitle && <div className="site-hero-subtitle">{subtitle}</div>}
      {meta && meta.length > 0 && (
        <div className="site-hero-meta">
          {meta.map((m, i) => (
            <span key={i} className="site-hero-meta-item">{m}</span>
          ))}
        </div>
      )}
      {description && <p className="site-hero-desc">{description}</p>}
      {actions && <div className="site-hero-actions">{actions}</div>}
      {stats && stats.length > 0 && (
        <div className="site-stats">
          {stats.map((s, i) => <Stat key={i} value={s.value} label={s.label} icon={s.icon} />)}
        </div>
      )}
    </div>
  );

  return (
    <section className={`site-hero is-${variant}`}>
      {bg && <img className="site-hero-bg" src={bg} alt="" aria-hidden />}
      <div className="site-hero-wash" aria-hidden />
      <div className="site-hero-inner">
        {/* topic keeps text on the readable left + a contained mosaic on the right */}
        {variant === "topic" || variant === "collection" ? <>{copy}{media}</> : <>{media}{copy}</>}
      </div>
    </section>
  );
}
