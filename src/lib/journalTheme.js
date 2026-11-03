// A white reading surface with accents derived from the current article cover.
// Deliberately separate from the dark theme used by the rest of the site.
export function journalThemeFromColor(color) {
  const cover = Array.isArray(color) && color.length === 3 && color.every(Number.isFinite)
    ? color.map(value => Math.round(Math.max(0, Math.min(255, value))))
    : [150, 117, 87];
  const scale = Math.min(1, 110 / Math.max(1, ...cover));
  const ink = cover.map(value => Math.round(value * scale));
  const rgb = (channels, alpha) => alpha == null
    ? `rgb(${channels.join(', ')})` : `rgba(${channels.join(', ')}, ${alpha})`;
  return {
    dark: false,
    vars: {
      '--acl-bg': '#ffffff',
      '--acl-bg-soft': '#ffffff',
      '--acl-surface': 'rgba(255, 255, 255, 0.78)',
      '--acl-card': 'rgba(255, 255, 255, 0.72)',
      '--acl-text': '#202024',
      '--acl-muted': '#57575f',
      '--acl-faint': '#6b6b73',
      '--acl-border': 'rgba(32, 32, 36, 0.13)',
      '--acl-accent': rgb(ink),
      '--acl-accent-soft': rgb(cover, 0.1),
      '--acl-glow': rgb(cover, 0.18),
      '--acl-shadow': 'rgba(32, 32, 36, 0.07)',
      '--journal-tint': rgb(cover),
    },
  };
}
