import { songInsights } from '../data/songInsights.js';

export function withSongFaq(recording, slug) {
  const insight = songInsights[slug];
  if (!insight?.faqSchema || !insight.faq?.length) return recording;
  return {
    '@context': 'https://schema.org',
    '@graph': [recording, {
      '@type': 'FAQPage', '@id': `${recording.url}#faq`, url: recording.url, inLanguage: 'tr',
      mainEntity: insight.faq.map(({ question, answer }) => ({
        '@type': 'Question', name: question,
        acceptedAnswer: { '@type': 'Answer', text: answer },
      })),
    }],
  };
}
