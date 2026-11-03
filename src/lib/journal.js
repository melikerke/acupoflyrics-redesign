import { journalEditions } from '../data/journalEditions.js';

export function journalFor(article) {
  const edition = article.journal || journalEditions[article.slug] || {};
  return {
    ...edition,
    sourcesCheckedAt: edition.sourcesCheckedAt || article.updatedAt || article.date,
    stories: (article.sections || []).map((section, index) => ({ ...section, ...edition.stories?.[index], legacyId: `bolum-${index + 1}`, id: section.id || edition.stories?.[index]?.id || `bolum-${index + 1}` })),
  };
}

export function chartBadge(chart) {
  if (chart.weeksAtOne) return `${chart.weeksAtOne}. hafta zirvede`;
  if (chart.badge === 'new') return 'Yeni giriş';
  if (chart.previousRanks?.length) return [...chart.previousRanks, chart.rank].map(rank => rank ?? 'Yeni').join(' → ');
  return { up: 'Yükselişte', down: 'Geriledi', hold: 'Yerini korudu', record: 'Rekor' }[chart.badge] || '';
}

export function journalDate(value, withTime = false) {
  return new Intl.DateTimeFormat('tr-TR', { timeZone: 'Europe/Istanbul', day: 'numeric', month: 'long', ...(withTime ? { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' } : {}) }).format(new Date(value));
}

export function spotifyTrackId(post) {
  const url = post?.spotify?.trackUrl || post?.spotify?.track?.url || '';
  return url.match(/^https:\/\/open\.spotify\.com\/(?:intl-[^/]+\/)?track\/([a-zA-Z0-9]{22})(?:[?#]|$)/)?.[1] || null;
}

// UTC instants avoid floating-time ambiguity; calendar clients display local time.
export function releaseCalendar(release, checkedAt) {
  const start = new Date(release.releaseAtKST);
  if (!Number.isFinite(start.getTime())) return null;
  const stamp = date => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const escape = value => String(value).replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/[,;]/g, '\\$&');
  // Fold by UTF-8 octets (RFC 5545), not JS character count.
  const fold = line => {
    let result = '', size = 0;
    for (const char of line) {
      const width = new TextEncoder().encode(char).length;
      if (size + width > 75) { result += '\r\n '; size = 1; }
      result += char; size += width;
    }
    return result;
  };
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//acupoflyrics//Pop Gunlugu//TR', 'CALSCALE:GREGORIAN', 'X-WR-TIMEZONE:Europe/Istanbul', 'BEGIN:VEVENT', `UID:${escape(release.id)}@acupoflyrics.com`, `DTSTAMP:${stamp(new Date(checkedAt))}`, `DTSTART:${stamp(start)}`, `DTEND:${stamp(new Date(start.getTime() + 3600000))}`, `SUMMARY:${escape(`${release.artist} — ${release.release}`)}`, `DESCRIPTION:${escape(`${release.format}. Türkiye saati: ${journalDate(release.releaseAtKST, true)}.`)}`, 'END:VEVENT', 'END:VCALENDAR'].map(fold).join('\r\n') + '\r\n';
}
