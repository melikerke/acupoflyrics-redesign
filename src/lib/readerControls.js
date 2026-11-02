// Navigation groups never alter the underlying lyric sections or their text.
export function sectionNavigation(sections, locale = 'tr') {
  if (sections.length < 5) return [];
  const labels = {
    chorus: { tr: 'Nakarat', en: 'Chorus', es: 'Estribillo' },
    'pre-chorus': { tr: 'Ön Nakarat', en: 'Pre-Chorus', es: 'Preestribillo' },
    'post-chorus': { tr: 'Nakarat Sonrası', en: 'Post-Chorus', es: 'Postestribillo' },
  };
  const items = [];
  const groups = new Map();
  sections.forEach((section, index) => {
    const name = section.label.toLowerCase().trim().replace(/[–—]/g, '-');
    const match = name.match(/^(chorus|pre[- ]chorus|post[- ]chorus|nakarat|ön nakarat|nakarat sonrası|estribillo)(?:\s*\d+)?(?:\s*[:(].*)?$/);
    const aliases = { nakarat: 'chorus', estribillo: 'chorus', 'ön nakarat': 'pre-chorus', 'nakarat sonrası': 'post-chorus' };
    const key = match ? (aliases[match[1]] || match[1].replace(' ', '-')) : null;
    if (key && groups.has(key)) {
      groups.get(key).indices.push(index);
    } else {
      const item = { index, indices: [index], label: key ? labels[key][locale] || labels[key].en : section.label };
      items.push(item);
      if (key) groups.set(key, item);
    }
  });
  return items;
}

export function cardEntries(section, language, languages) {
  const entries = kind => (section[kind] || []).filter(Boolean).map(text => ({ text, language: languages[kind] }));
  if (language === 'both') return [...entries('original'), ...entries('translation')];
  return entries(language === languages.original ? 'original' : 'translation');
}

export function defaultCardSelection(entries, language, limit = 3) {
  if (language !== 'both') return entries.slice(0, limit).map((_, index) => index);
  // Select each language independently: paragraph lengths need not match.
  const seen = new Set();
  return entries.flatMap((entry, index) => {
    if (seen.has(entry.language)) return [];
    seen.add(entry.language);
    return [index];
  }).slice(0, limit);
}
