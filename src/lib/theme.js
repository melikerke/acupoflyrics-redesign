import { isDark, rgb, shade } from "./color";

// Brand garnet — "the seam", the one ownable accent.
export const SEAM = [214, 69, 122];

// Boost saturation and brightness of a color to make it a vibrant accent in dark mode,
// or a readable dark color in light mode.
function deriveAccent(c, isDarkTheme) {
  const max = Math.max(c[0], c[1], c[2]);
  if (max === 0) return isDarkTheme ? [244, 94, 132] : [214, 69, 122];

  if (isDarkTheme) {
    const scale = Math.max(1, 210 / max);
    let r = Math.min(255, Math.round(c[0] * scale));
    let g = Math.min(255, Math.round(c[1] * scale));
    let b = Math.min(255, Math.round(c[2] * scale));
    const sat = Math.max(r, g, b) - Math.min(r, g, b);
    if (sat < 50) {
      r = Math.min(255, r + 30);
      b = Math.min(255, b + 20);
    }
    return [r, g, b];
  } else {
    const scale = Math.min(1, 130 / max);
    let r = Math.round(c[0] * scale);
    let g = Math.round(c[1] * scale);
    let b = Math.round(c[2] * scale);
    const sat = Math.max(r, g, b) - Math.min(r, g, b);
    if (sat < 40) {
      r = Math.min(255, r + 25);
    }
    return [r, g, b];
  }
}

// Derive the full --acl-* token set from an album colour. Album & artist pages
// use this so the chrome takes on the record's hue (premium, Spotify-like);
// shared with the homepage hero treatment.
export function themeFromColor(color) {
  const dark = true;
  const accent = deriveAccent(color, dark);
  const glow = isDark(color) ? color : shade(color, 0.68);

  return {
    dark,
    vars: {
      "--acl-bg": "#071012",
      "--acl-bg-soft": "#0b1518",
      "--acl-surface": "rgba(16, 24, 28, 0.72)",
      "--acl-card": "rgba(22, 30, 35, 0.66)",
      "--acl-text": "#f7f3ec",
      "--acl-muted": "rgba(247, 243, 236, 0.70)",
      "--acl-faint": "rgba(247, 243, 236, 0.52)",
      "--acl-border": "rgba(255, 255, 255, 0.09)",
      "--acl-accent": rgb(accent),
      "--acl-accent-soft": rgb(accent, 0.18),
      "--acl-glow": rgb(glow, 0.24),
      "--acl-shadow": "rgba(0, 0, 0, 0.34)",
    },
  };
}

// Fixed dark editorial theme for browse pages (discover, search, mood, genre,
// collection) so the product shell stays coherent. The lyric reader can still
// use a contained paper surface for long-form reading.
export const LIGHT_THEME = {
  dark: true,
  vars: {
    "--acl-bg": "#071012",
    "--acl-bg-soft": "#0b1518",
    "--acl-surface": "rgba(16, 24, 28, 0.72)",
    "--acl-card": "rgba(22, 30, 35, 0.66)",
    "--acl-text": "#f7f3ec",
    "--acl-muted": "rgba(247, 243, 236, 0.70)",
    "--acl-faint": "rgba(247, 243, 236, 0.52)",
    "--acl-border": "rgba(255, 255, 255, 0.09)",
    "--acl-accent": rgb(SEAM),
    "--acl-accent-soft": rgb(SEAM, 0.18),
    "--acl-glow": rgb(SEAM, 0.18),
    "--acl-shadow": "rgba(0, 0, 0, 0.34)",
  },
};
