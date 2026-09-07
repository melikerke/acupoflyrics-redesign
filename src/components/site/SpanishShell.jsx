import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Icon } from "./ui";
import { LIGHT_THEME } from "../../lib/theme";
import "../../preview.css";
import "../../site.css";
import "../../spanish.css";

export function SpanishNav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 18);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return <>
    <header className={`acl-nav ${scrolled ? "is-scrolled" : ""}`}>
      <Link to="/es" className="acl-logo font-serif">acupoflyrics</Link>
      <nav className="acl-menu" aria-label="Navegación principal">
        <Link to="/es">Canciones en español</Link>
        <Link to="/" lang="tr">Türkçe</Link>
      </nav>
      <div className="acl-nav-actions"><Link to="/es#buscar" className="acl-search" aria-label="Buscar"><Icon name="search" size={15} /><span>Buscar</span></Link></div>
    </header>
    <nav className="acl-mobile-tabs" aria-label="Navegación móvil">
      <Link to="/es" className="acl-mobile-tab"><Icon name="disc" size={18} /><span>Canciones</span></Link>
      <Link to="/es#buscar" className="acl-mobile-tab"><Icon name="search" size={18} /><span>Buscar</span></Link>
      <Link to="/" className="acl-mobile-tab" lang="tr"><Icon name="note" size={18} /><span>Türkçe</span></Link>
    </nav>
  </>;
}

export function SpanishFooter() {
  return <footer className="site-footer">
    <div className="site-footer-inner">
      <div className="site-footer-brand"><Link to="/es" className="acl-logo font-serif">acupoflyrics</Link><p>Letras traducidas al español.</p></div>
      <div className="site-footer-col"><div className="site-footer-col-title">Explorar</div><ul>
        <li><Link to="/es">Todas las canciones</Link></li>
        <li><Link to="/es#buscar">Buscar</Link></li>
        <li><Link to="/" lang="tr">Türkçe</Link></li>
      </ul></div>
    </div>
    <div className="site-footer-base"><span>© {new Date().getFullYear()} acupoflyrics</span><button type="button" className="site-footer-consent" onClick={() => window.dispatchEvent(new CustomEvent("acupoflyrics:open-consent"))}>Preferencias de cookies</button></div>
  </footer>;
}

export default function SpanishShell({ children }) {
  return <div className="acl-home is-dark" lang="es" style={LIGHT_THEME.vars}>
    <SpanishNav /><main className="site-main is-wide">{children}</main><SpanishFooter />
  </div>;
}
