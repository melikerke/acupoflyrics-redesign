import { Link } from "react-router-dom";
import { LIGHT_THEME } from "../../lib/theme";
import SiteShell from "./SiteShell";

export default function NotFound({ theme = LIGHT_THEME, title = "Sayfa bulunamadı.", children }) {
  return (
    <SiteShell theme={theme}>
      <div className="site-empty" style={{ minHeight: "52vh", display: "grid", placeContent: "center" }}>
        <p className="font-serif">{title}</p>
        {children || <Link className="site-btn-ghost" to="/discover" style={{ margin: "0 auto" }}>Keşfet'e dön</Link>}
      </div>
    </SiteShell>
  );
}
