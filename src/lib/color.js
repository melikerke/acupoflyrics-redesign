import { useEffect, useState } from "react";

// Pull a representative colour from the album cover (same-origin → no CORS taint),
// biased toward saturated pixels so the header takes the album's true hue.
export function useAlbumColor(src, fallback = [38, 40, 56]) {
  const [color, setColor] = useState(fallback);
  useEffect(() => {
    if (!src) return;
    let cancelled = false;
    const img = new Image();
    // Allow reading pixels from remote covers (e.g. Spotify) when the host sends
    // CORS headers; same-origin covers are unaffected. Tainted draws are caught
    // below and fall back to the default colour.
    img.crossOrigin = "anonymous";
    img.src = src;
    img.onload = () => {
      try {
        const s = 28;
        const cv = document.createElement("canvas");
        cv.width = s; cv.height = s;
        const ctx = cv.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, s, s);
        const d = ctx.getImageData(0, 0, s, s).data;
        let r = 0, g = 0, b = 0, n = 0;
        for (let i = 0; i < d.length; i += 4) {
          const R = d[i], G = d[i + 1], B = d[i + 2];
          const max = Math.max(R, G, B), min = Math.min(R, G, B);
          const sat = max - min;
          const bright = max;
          if (bright < 24) continue; // skip near-black
          const w = 1 + (sat / 48) * (bright / 255);
          r += R * w; g += G * w; b += B * w; n += w;
        }
        if (!cancelled && n > 0) setColor([Math.round(r / n), Math.round(g / n), Math.round(b / n)]);
      } catch { /* ignore */ }
    };
    return () => { cancelled = true; };
  }, [src]);
  return color;
}

export const rgb = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
export const shade = (c, f) => [Math.round(c[0] * f), Math.round(c[1] * f), Math.round(c[2] * f)];
// Perceived luminance — to pick readable text on the album colour.
export const isDark = (c) => (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) < 140;
