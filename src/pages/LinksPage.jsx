import { Link } from 'react-router-dom';
import posts from '../data/postIndex.json';
import { aboutProfileImage } from '../data/aboutContent';
import { moodLandingPages } from '../data/moodLandingPages';
import { linksHubTitle, linksHubDescription, linksHubSongs, instagramProfileUrl } from '../lib/linksHub';
import { songPath, moodPath, canonical } from '../lib/paths';
import { useSeo } from '../lib/seo';
import { trackEvent } from '../lib/analytics';
import { LIGHT_THEME } from '../lib/theme';
import SiteShell from '../components/site/SiteShell';
import './LinksPage.css';

const { featured, latest } = linksHubSongs(posts);
export default function LinksPage() {
  useSeo({ title: 'Instagram’dan Şarkı Çevirilerine | acupoflyrics', description: linksHubDescription, path: '/linkler', image: featured?.cover,
    jsonLd: { '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'acupoflyrics bağlantıları', url: canonical('/linkler'), description: linksHubDescription } });
  function trackClick(event) {
    const link = event.target.closest('a[data-hub-section]');
    if (link) trackEvent('links_hub_click', { section: link.dataset.hubSection, link_url: link.href });
  }
  return <SiteShell theme={LIGHT_THEME}>
    <div className="links-hub" onClick={trackClick}>
      <header className="links-intro">
        <img src={aboutProfileImage} width="68" height="68" alt="Melike Erke — acupoflyrics" />
        <a href={instagramProfileUrl} className="links-handle">@acupoflyrics</a>
        <h1>{linksHubTitle}</h1>
        <p>{linksHubDescription}</p>
      </header>
      <form action="/search" method="get" role="search" className="links-search">
        <label htmlFor="hub-search">Şarkı veya sanatçı ara</label>
        <div><input id="hub-search" name="q" type="search" placeholder="Şarkı ya da sanatçı adı…" required /><button type="submit">Ara <span aria-hidden="true">↗</span></button></div>
      </form>
      {featured && <section aria-labelledby="hub-weekly">
        <h2 id="hub-weekly">Haftanın çevirisi</h2>
        <Link to={songPath(featured)} className="links-featured" data-hub-section="weekly">
          <img src={featured.cover || featured.image} alt={`${featured.artist} — ${featured.song} kapak görseli`} width="120" height="120" />
          <div><span className="links-kicker">Bu haftanın seçimi</span><strong>{featured.artist} — {featured.song}</strong><span>Çeviriyi ve notları oku <span aria-hidden="true">↗</span></span></div>
        </Link>
      </section>}
      <section aria-labelledby="hub-latest">
        <h2 id="hub-latest">Son çeviriler</h2>
        <ol className="links-latest">{latest.map((post, i) => <li key={post.slug}>
          <Link to={songPath(post)} data-hub-section="latest"><span className="links-number" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span><span>{post.artist} — {post.song}</span><span aria-hidden="true">↗</span></Link>
        </li>)}</ol>
        <Link to="/sarkilar" className="links-all" data-hub-section="archive">Tüm çevirilere göz at →</Link>
      </section>
      <section aria-labelledby="hub-moods"><h2 id="hub-moods">Bugün hangi ruh hâlindesin?</h2>
        <div className="links-moods">{moodLandingPages.slice(0, 3).map(mood => <Link key={mood.slug} to={moodPath(mood)} data-hub-section="mood">{mood.name} <span aria-hidden="true">↗</span></Link>)}</div>
      </section>
    </div>
  </SiteShell>;
}
