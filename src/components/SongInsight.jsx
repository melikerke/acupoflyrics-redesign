import { songInsights } from '../data/songInsights.js';
import { editorialSeoUpdatedAt } from '../data/songEditorialSeo.js';
import { readablePublicationDate } from '../lib/songPublication.js';
import './SongInsight.css';
import { meaningHeadings } from '../lib/songInsightPresentation.js';

export function SongIntro({ slug }) {
  const insight = songInsights[slug];
  return insight?.summaryPlacement === 'intro' ? <p className="song-insight-intro">{insight.summary}</p> : null;
}

export default function SongInsight({ slug }) {
  const insight = songInsights[slug];
  if (!insight) return null;
  const updatedAt = insight.updatedAt || editorialSeoUpdatedAt;
  const meaningHeading = meaningHeadings[slug];
  const questions = meaningHeading ? insight.faq.slice(1) : insight.faq;
  return <section className="song-insight" aria-label="Şarkının anlamı ve sık sorulan sorular">
    {insight.summaryPlacement !== 'intro' && <>
    <span className="song-insight-kicker">Şarkının arka planı</span>
    <h2 className="font-serif">Şarkı ne anlatıyor?</h2>
    <p className="song-insight-summary">{insight.summary}</p>
    </>}
    <p className="song-insight-meta">Sözlere dayalı editoryal yorum · Güncelleme: <time dateTime={updatedAt}>{readablePublicationDate(updatedAt)}</time></p>
    {meaningHeading && <><h2 className="font-serif">{meaningHeading}</h2><p className="song-insight-summary">{insight.faq[0].answer}</p></>}
    <h2 className="song-insight-faq-title font-serif">Sık sorulan sorular</h2>
    <div className="song-insight-faq">{questions.map(item => <details key={item.question}>
      <summary><span>{item.question}</span><span className="song-insight-toggle" aria-hidden="true" /></summary>
      <p>{item.answer}</p>
    </details>)}</div>
    <footer className="song-insight-sources">
    <h3>Kaynaklar</h3>
    <p>Yayın bilgileri ve açıklamalar için:</p>
    <ul>{insight.sources.map(source => <li key={source.url}><a href={source.url} rel="noopener noreferrer">{source.label}</a></li>)}</ul>
    </footer>
  </section>;
}
