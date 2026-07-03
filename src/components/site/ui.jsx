import { Link } from "react-router-dom";

// ---- Icons (stroke, currentColor) ----
const PATHS = {
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
  arrow: <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
  back: <><path d="M19 12H5" /><path d="m11 18-6-6 6-6" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></>,
  calendar: <><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>,
  disc: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="2.5" /></>,
  note: <><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></>,
  headphones: <><path d="M3 18v-6a9 9 0 0 1 18 0v6" /><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" /></>,
  sparkle: <><path d="M12 3v6M12 15v6M3 12h6M15 12h6" /><path d="m6 6 3 3M15 15l3 3M18 6l-3 3M9 15l-3 3" /></>,
  shuffle: <><path d="M16 3h5v5" /><path d="M4 20 21 3" /><path d="M21 16v5h-5" /><path d="M15 15l6 6M4 4l5 5" /></>,
  flame: <><path d="M12 2c1 4 4 5 4 9a4 4 0 0 1-8 0c0-2 1-3 1-3 1 2 3 2 3-1 0-2-1-3 0-5z" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  grid: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
  heart: <path d="M20.8 5.6a5 5 0 0 0-7 0L12 7.4l-1.8-1.8a5 5 0 1 0-7 7L12 21l8.8-8.4a5 5 0 0 0 0-7z" />,
  play: <path d="M8 5v14l11-7z" />,
};

export function Icon({ name, size = 16, fill = false, ...rest }) {
  const p = PATHS[name];
  if (!p) return null;
  if (name === "play") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden {...rest}>{p}</svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...rest}>
      {p}
    </svg>
  );
}

// ---- Breadcrumbs (matches the BreadcrumbList in useSeo) ----
export function Breadcrumbs({ items }) {
  return (
    <nav className="site-crumbs" aria-label="Breadcrumb">
      {items.map((c, i) => (
        <span key={c.path}>
          {i > 0 && <i aria-hidden>/</i>}
          {i === items.length - 1 ? (
            <span aria-current="page">{c.name}</span>
          ) : (
            <Link to={c.path}>{c.name}</Link>
          )}
        </span>
      ))}
    </nav>
  );
}

// ---- Section + header ----
export function SectionHead({ title, kicker, to, action = "Tümünü gör" }) {
  return (
    <div className="acl-section-head">
      <div>
        {kicker && <span className="site-kicker">{kicker}</span>}
        <h2>{title}</h2>
      </div>
      {to && (
        <Link to={to}>{action} <Icon name="arrow" size={15} /></Link>
      )}
    </div>
  );
}

export function Section({ title, kicker, to, action, children, id, className = "" }) {
  return (
    <section className={`acl-section ${className}`} id={id}>
      {title && <SectionHead title={title} kicker={kicker} to={to} action={action} />}
      {children}
    </section>
  );
}

// ---- Grid: responsive auto-fill grid of cards ----
export function Grid({ children, min = 180, className = "" }) {
  return (
    <div className={`site-grid ${className}`} style={{ "--grid-min": `${min}px` }}>
      {children}
    </div>
  );
}

// ---- Shelf: horizontal scroller ----
export function Shelf({ children, wide = false }) {
  return <div className={`acl-cover-row ${wide ? "is-wide" : ""}`}>{children}</div>;
}

// ---- Filter pills ----
export function FilterBar({ options, value, onChange, label = "Sırala" }) {
  return (
    <div className="site-filters" role="group" aria-label={label}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className={`site-filter ${value === opt.value ? "is-active" : ""}`}
          aria-pressed={value === opt.value}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ---- A single labelled statistic ----
export function Stat({ value, label, icon }) {
  return (
    <div className="site-stat">
      {icon && <Icon name={icon} size={16} />}
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

export function Empty({ title, children }) {
  return (
    <div className="site-empty">
      <p className="font-serif">{title}</p>
      {children}
    </div>
  );
}
