import { songInsights } from '../data/songInsights.js';
import { editorialSeoUpdatedAt } from '../data/songEditorialSeo.js';
import { readablePublicationDate } from '../lib/songPublication.js';

export default function SongInsight({ slug }) {
  const insight = songInsights[slug];
  if (!insight) return null;
  return <section className="site-prose" aria-label="Şarkının anlamı ve sık sorulan sorular" style={{ marginBottom: 32 }}>
    <h2>Şarkı ne anlatıyor?</h2>
    <p>{insight.summary}</p>
    <p><small>Sözlere dayalı editoryal yorum · Güncelleme: <time dateTime={editorialSeoUpdatedAt}>{readablePublicationDate(editorialSeoUpdatedAt)}</time></small></p>
    <h2>Sık sorulan sorular</h2>
    {insight.faq.map(item => <details key={item.question}>
      <summary>{item.question}</summary>
      <p>{item.answer}</p>
    </details>)}
    <p><small>Yayın bilgileri ve açıklamalar için kaynaklar:</small></p>
    <ul>{insight.sources.map(source => <li key={source.url}><a href={source.url} rel="noopener noreferrer">{source.label}</a></li>)}</ul>
  </section>;
}
