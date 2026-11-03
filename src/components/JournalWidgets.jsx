import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getPost, postPath } from '../lib/content';
import { chartBadge, journalDate, releaseCalendar, spotifyTrackId } from '../lib/journal.js';

export function JournalCharts({ charts }) {
  if (!charts?.length) return null;
  return <section className="journal-pulse" aria-labelledby="journal-pulse-title">
    <div className="journal-block-heading"><h2 id="journal-pulse-title">Liste nabzı</h2><span>Haftanın dikkat çeken hareketleri</span></div>
    <div className="journal-charts">{charts.map(chart => <a key={chart.target} className="journal-chart journal-glass" href={`#${chart.target}`}>
      <div className="journal-chart-top"><span className="journal-rank">{String(chart.rank).padStart(2, '0')}</span><span className={`journal-badge journal-badge--${chart.badge}`}>{chartBadge(chart)}</span></div>
      <h3>{chart.artist} — {chart.title}</h3>
      <p>{chart.line}</p>
      {chart.weeksAtOne && <div className="journal-weeks" aria-label={`${chart.weeksAtOne} hafta zirvede`}>{Array.from({ length: Math.min(chart.weeksAtOne, 60) }, (_, i) => <i key={i} aria-hidden="true" />)}</div>}
      <small>{chart.chartName}<br />{chart.chartDate ? `Liste tarihi: ${journalDate(chart.chartDate)}` : `Duyuru: ${journalDate(chart.announcedAt)}`}</small>
      <span className="journal-chart-arrow" aria-hidden="true">↗</span>
    </a>)}</div>
  </section>;
}

function KpopReleases({ journal, sources }) {
  const [filter, setFilter] = useState('all');
  return <section id="kpop" className="journal-side-card journal-glass" aria-labelledby="journal-kpop-title">
    <span className="journal-eyebrow">Yayın takvimi</span><h2 id="journal-kpop-title">Bu haftanın K-pop çıkışları</h2>
    <div className="journal-filters" role="group" aria-label="K-pop çıkışlarını filtrele">
      {[['all', 'Hepsi'], ['group', 'Grup'], ['solo', 'Solo']].map(([value, label]) => <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</button>)}
    </div>
    <div aria-live="polite">{journal.kpop.filter(release => filter === 'all' || release.type === filter).map(release => {
      const calendar = releaseCalendar(release, journal.sourcesCheckedAt);
      const source = sources[release.sourceIndex];
      return <div className="journal-release" key={release.id}>
        <h3>{release.artist} — {release.release}</h3><p>{release.format}</p>
        <time dateTime={release.releaseAtKST}>{journalDate(release.releaseAtKST, true)} · Türkiye</time>
        <div className="journal-release-actions">
          {calendar && <a className="journal-button" download={`${release.id}.ics`} href={`data:text/calendar;charset=utf-8,${encodeURIComponent(calendar)}`}>Takvime ekle <span aria-hidden="true">+</span></a>}
          {source && <a href={source.url} target="_blank" rel="noopener noreferrer" aria-label={`${release.artist} — ${release.release} yayın kaynağı`}>Kaynak ↗</a>}
        </div>
      </div>;
    })}</div>
    {journal.calendarHref && <Link className="journal-text-link" to={journal.calendarHref}>Kasım takviminin tamamı →</Link>}
  </section>;
}

export function JournalSidebar({ article, journal }) {
  const summary = journal.tldr || article.summary?.map((text, i) => ({ text, target: journal.stories[Math.min(i, journal.stories.length - 1)]?.id }));
  const items = summary?.length ? summary : journal.stories.map(story => ({ target: story.id, text: story.heading }));
  const itemList = (entries, offset = 0) => <ol>{entries.map((item, i) => <li key={i}><span aria-hidden="true">{String(i + offset + 1).padStart(2, '0')}</span><a href={`#${item.target}`}>{item.text}</a></li>)}</ol>;
  return <aside className="journal-sidebar" aria-label="Yazının özeti ve çıkışlar">
    <section className="journal-side-card journal-tldr journal-glass">
      <h2>{journal.tldr ? '30 saniyede bu hafta' : summary?.length ? article.summaryTitle || 'Kısa özet' : 'Bu yazıda'}</h2>
      <nav aria-label="Yazı bölümleri">{itemList(items.slice(0, 7))}{items.length > 7 && <details><summary>Tüm bölümler ({items.length})</summary>{itemList(items.slice(7), 7)}</details>}</nav>
    </section>
    {journal.kpop?.length > 0 && <KpopReleases journal={journal} sources={article.sources} />}
  </aside>;
}

export function JournalStoryVisual({ story, article }) {
  if (!story.visual) return null;
  const post = getPost(story.translationId);
  const lead = story.visual === 'lead';
  const image = lead ? article.image : post?.cover;
  if (!image) return null;
  const label = post ? `${post.artist} — ${post.song}` : article.shortTitle;
  const source = lead ? article.imageSource : post?.spotify?.trackUrl;
  return <figure className={`journal-story-visual journal-story-visual--${story.visual}`}>
    <img src={image} alt={`${label} kapak görseli`} width="400" height="400" loading="lazy" />
    <figcaption>{source ? <a href={source} target="_blank" rel="noopener noreferrer">{label} ↗</a> : label}</figcaption>
  </figure>;
}

export function JournalStoryTools({ story }) {
  const post = getPost(story.translationId);
  const trackId = spotifyTrackId(post);
  const [playing, setPlaying] = useState(false);
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (!open || preview || !post) return;
    const controller = new AbortController();
    setError(false);
    fetch(`/data/posts/${post.slug}.json`, { signal: controller.signal })
      .then(response => { if (!response.ok) throw new Error('preview'); return response.json(); })
      .then(data => setPreview((data.blocks || []).filter(block => !block.original).flatMap(block => block.lines || []).filter(Boolean).slice(0, 2)))
      .catch(err => { if (err.name !== 'AbortError') setError(true); });
    return () => controller.abort();
  }, [open, preview, post]);
  if (!post) return null;
  const name = `${post.artist} — ${post.song}`;
  return <div className="journal-story-tools">
    {trackId && <div className="journal-player">
      <div className="journal-player-heading">
        <button type="button" className="journal-play-button" aria-label={`${name}: ${playing ? 'oynatıcıyı kapat' : 'Spotify oynatıcıyı aç'}`} aria-expanded={playing} aria-controls={`player-${story.id}`} onClick={() => setPlaying(!playing)}><span aria-hidden="true">{playing ? '×' : '▶'}</span></button>
        <span><strong>{name}</strong><small>{playing ? 'Spotify oynatıcı açık' : 'Dinlemek için bas'}</small></span><small>Spotify</small>
      </div>
      {playing && <div id={`player-${story.id}`}><iframe src={`https://open.spotify.com/embed/track/${trackId}?theme=0`} title={`${name} Spotify oynatıcı`} width="100%" height="152" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" /><a href={post.spotify.trackUrl} target="_blank" rel="noopener noreferrer">Spotify’da aç ↗</a></div>}
    </div>}
    <div className="journal-story-actions">
      <Link className="journal-button journal-button--primary" to={postPath(post)} aria-label={`${name} Türkçe çevirisini oku`}>Çevirisini oku <span aria-hidden="true">↗</span></Link>
      <button type="button" className="journal-button" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls={`preview-${story.id}`}>{open ? 'Önizlemeyi kapat' : 'Çeviriden bir parça'}</button>
    </div>
    {open && <div className="journal-preview" id={`preview-${story.id}`} aria-live="polite"><span className="journal-eyebrow">Türkçe çeviriden</span>
      {error ? <p>Önizleme yüklenemedi. Çevirinin tamamını aşağıdan açabilirsin.</p> : preview ? preview.length ? <blockquote>{preview.map((line, i) => <p key={i}>{line}</p>)}</blockquote> : <p>Önizleme bulunamadı.</p> : <p>Yükleniyor…</p>}
      <Link to={postPath(post)}>Çevirinin tamamını oku →</Link>
    </div>}
  </div>;
}
