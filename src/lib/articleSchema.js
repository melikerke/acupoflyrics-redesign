// Keep browser and first-HTML structured data identical.
export function articleSchema(article, origin) {
  const url = `${origin}/pop-gunlugu/${article.slug}`;
  const story = {
    '@context': 'https://schema.org',
    '@type': article.schemaType || 'Article',
    '@id': `${url}#article`,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    headline: article.title,
    alternativeHeadline: article.shortTitle,
    description: article.metaDescription || article.excerpt,
    url, image: [article.image], thumbnailUrl: article.image,
    inLanguage: 'tr-TR', isAccessibleForFree: true,
    articleSection: article.kicker,
    keywords: [article.artistName, article.shortTitle, article.kicker, 'Pop Günlüğü', 'müzik gündemi', 'Türkçe çeviri'].filter(Boolean),
    datePublished: article.date,
    dateModified: article.updatedAt || article.date,
    author: { '@type': 'Person', name: 'Melike Erke', url: `${origin}/hakkimizda` },
    publisher: { '@type': 'Organization', name: 'acupoflyrics', url: origin },
    about: article.artistName ? [{ '@type': article.artistType || 'MusicGroup', name: article.artistName }] : undefined,
    citation: article.sources?.map(source => source.url),
  };
  const questions = (article.sections || []).flatMap(section => section.questions || []);
  if (!questions.length) return story;
  return {
    '@context': 'https://schema.org',
    '@graph': [story, {
      '@type': 'FAQPage', '@id': `${url}#faq`,
      mainEntity: questions.map(({ question, answer }) => ({
        '@type': 'Question', name: question,
        acceptedAnswer: { '@type': 'Answer', text: answer },
      })),
    }],
  };
}
