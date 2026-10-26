// Plain text in data; safe React/static renderers add only catalog-backed links.
export function articleSongSegments(text, article, posts) {
  const songs = (article.relatedTranslations || []).map(slug => posts.find(p => p.slug === slug)).filter(Boolean);
  const labels = songs.map(p => ({ label: `${p.artist} — ${p.song}`, slug: p.slug })).sort((a, b) => b.label.length - a.label.length);
  const segments = [];
  let remaining = text;
  while (remaining) {
    const match = labels.map(p => ({ ...p, index: remaining.indexOf(p.label) })).filter(p => p.index >= 0).sort((a, b) => a.index - b.index || b.label.length - a.label.length)[0];
    if (!match) { segments.push({ text: remaining }); break; }
    if (match.index) segments.push({ text: remaining.slice(0, match.index) });
    segments.push({ text: match.label, slug: match.slug });
    remaining = remaining.slice(match.index + match.label.length);
  }
  return segments;
}
