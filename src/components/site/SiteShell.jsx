import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { totalPosts } from "../../lib/content";
import { discoverPath, searchPath } from "../../lib/paths";
import { Icon } from "./ui";
import "../../preview.css";
import "../../site.css";

function openSearch() {
  window.dispatchEvent(new CustomEvent("acupoflyrics:open-search"));
}

export function SiteNav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 18);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`acl-nav ${scrolled ? "is-scrolled" : ""}`}>
      <Link to="/" className="acl-logo font-serif">acupoflyrics</Link>
      <nav className="acl-menu" aria-label="Ana navigasyon">
        <Link to={discoverPath()}>Keşfet</Link>
        <Link to="/albumler">Albümler</Link>
        <Link to={`${discoverPath()}#artists`}>Sanatçılar</Link>
        <Link to={`${discoverPath()}#moods`}>Mood</Link>
        <Link to="/listeler">Listeler</Link>
      </nav>
      <div className="acl-nav-actions">
        <button className="acl-search" type="button" aria-label="Ara" onClick={openSearch}>
          <Icon name="search" size={15} />
          <span>Ara</span>
          <kbd>⌘K</kbd>
        </button>
      </div>
    </header>
  );
}

export function MobileTabBar() {
  const location = useLocation();
  const path = location.pathname;
  const items = [
    ["Ana sayfa", "/", "disc"],
    ["Keşfet", discoverPath(), "sparkle"],
    ["Ara", searchPath(), "search"],
    ["Listeler", "/listeler", "note"],
  ];

  return (
    <nav className="acl-mobile-tabs" aria-label="Mobil navigasyon">
      {items.map(([label, to, icon]) => {
        const active = to === "/" ? path === "/" : path.startsWith(to);
        if (icon === "search") {
          return (
            <button key={label} type="button" className="acl-mobile-tab" onClick={openSearch} aria-label="Ara">
              <Icon name="search" size={18} />
              <span>{label}</span>
            </button>
          );
        }
        return (
          <Link key={label} to={to} className={`acl-mobile-tab${active ? " is-active" : ""}`} aria-current={active ? "page" : undefined}>
            <Icon name={icon} size={18} />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="site-footer-brand">
          <div className="acl-logo font-serif" style={{ fontSize: 22 }}>acupoflyrics</div>
          <p>Özenli Türkçe çeviriler — {totalPosts} şarkı.</p>
        </div>
        <FooterCol title="Keşfet" items={[["Keşfet", discoverPath()], ["Arama", searchPath()], ["Müzik Listeleri", "/listeler"]]} />
        <FooterCol title="İçerik" items={[["Mood", `${discoverPath()}#moods`], ["Türler", `${discoverPath()}#genres`], ["Albümler", "/albumler"]]} />
        <FooterCol title="Acupoflyrics" items={[["Hakkımızda", "/hakkimizda"], ["Çeviri talebi", "/iletisim"], ["İletişim", "/iletisim"]]} />
      </div>
      <div className="site-footer-base">
        <span>© {new Date().getFullYear()} acupoflyrics · İki dil arasında.</span>
        <span>Kaynak bağlantıları ilgili platformlara gider.</span>
      </div>
    </footer>
  );
}

function FooterCol({ title, items }) {
  return (
    <div className="site-footer-col">
      <div className="site-footer-col-title">{title}</div>
      <ul>
        {items.map(([label, to]) => (
          <li key={label}><Link to={to}>{label}</Link></li>
        ))}
      </ul>
    </div>
  );
}

// The page frame: applies the --acl-* theme, renders nav + content + footer.
// `theme` is { dark, vars } from theme.js (LIGHT_THEME or themeFromColor()).
export default function SiteShell({ theme, children, wide = false }) {
  return (
    <div className={`acl-home ${theme.dark ? "is-dark" : "is-light"}`} style={theme.vars}>
      <SiteNav />
      <main className={`site-main ${wide ? "is-wide" : ""}`}>{children}</main>
      <SiteFooter />
      <MobileTabBar />
    </div>
  );
}
