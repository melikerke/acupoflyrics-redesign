import { LIGHT_THEME } from "../lib/theme";
import { useSeo } from "../lib/seo";
import SiteShell from "../components/site/SiteShell";
import PageHero from "../components/site/PageHero";
import { Icon } from "../components/site/ui";

const EMAIL = "acupoflyrics55@gmail.com";

export default function ContactPage() {
  useSeo({
    title: "İletişim | acupoflyrics",
    description: "Çeviri talebi, düzeltme önerisi ya da iş birliği için acupoflyrics ile iletişime geç.",
    path: "/iletisim",
    breadcrumbs: [
      { name: "Ana sayfa", path: "/" },
      { name: "İletişim", path: "/iletisim" },
    ],
  });

  return (
    <SiteShell theme={LIGHT_THEME}>
      <PageHero
        variant="topic"
        kicker="İletişim"
        title="Yaz, okuyorum."
        titleSerif
        description="Çeviri talebi, düzeltme önerisi, iş birliği ya da sadece selam — hepsi aynı kutuya düşüyor."
      />

      <section className="acl-section" style={{ maxWidth: 720 }}>
        <div className="site-contact-cards">
          <a className="site-contact-card" href={`mailto:${EMAIL}?subject=${encodeURIComponent("acupoflyrics — iletişim")}`}>
            <Icon name="arrow" size={16} />
            <div>
              <strong>E-posta</strong>
              <span>{EMAIL}</span>
            </div>
          </a>
          <a className="site-contact-card" href="https://instagram.com/acupoflyrics" target="_blank" rel="noopener noreferrer">
            <Icon name="heart" size={16} />
            <div>
              <strong>Instagram</strong>
              <span>@acupoflyrics</span>
            </div>
          </a>
        </div>
        <p style={{ marginTop: 24, fontSize: 13, color: "var(--acl-muted, #666)" }}>
          Çeviri taleplerinde şarkı adı ve sanatçıyı yazman yeterli. Reklam ve iş
          birliği için e-posta tercih edilir.
        </p>
      </section>
    </SiteShell>
  );
}
