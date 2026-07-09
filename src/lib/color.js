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

function distance(a, b) {
  return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);
}

function pushDistinct(palette, color) {
  if (palette.some((item) => distance(item, color) < 76)) return;
  palette.push(color);
}

export function useAlbumPalette(src, fallback = [[38, 40, 56], [218, 60, 120], [30, 215, 96]]) {
  const [palette, setPalette] = useState(fallback.slice(0, 3));
  useEffect(() => {
    if (!src) {
      setPalette(fallback.slice(0, 3));
      return;
    }
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = src;
    img.onload = () => {
      try {
        const s = 42;
        const cv = document.createElement("canvas");
        cv.width = s; cv.height = s;
        const ctx = cv.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, s, s);
        const d = ctx.getImageData(0, 0, s, s).data;
        const buckets = new Map();
        for (let i = 0; i < d.length; i += 4) {
          const R = d[i], G = d[i + 1], B = d[i + 2], A = d[i + 3];
          if (A < 180) continue;
          const max = Math.max(R, G, B), min = Math.min(R, G, B);
          if (max < 28 || max > 246 || max - min < 18) continue;
          const key = `${Math.round(R / 28)},${Math.round(G / 28)},${Math.round(B / 28)}`;
          const bucket = buckets.get(key) || { r: 0, g: 0, b: 0, score: 0, count: 0 };
          const saturation = max - min;
          const score = 1 + saturation / 32;
          bucket.r += R * score;
          bucket.g += G * score;
          bucket.b += B * score;
          bucket.score += score;
          bucket.count += 1;
          buckets.set(key, bucket);
        }
        const ranked = [...buckets.values()]
          .map((bucket) => ({
            color: [
              Math.round(bucket.r / bucket.score),
              Math.round(bucket.g / bucket.score),
              Math.round(bucket.b / bucket.score),
            ],
            weight: bucket.score * Math.log(bucket.count + 1),
          }))
          .sort((a, b) => b.weight - a.weight);
        const next = [];
        for (const item of ranked) {
          pushDistinct(next, item.color);
          if (next.length === 3) break;
        }
        for (const item of fallback) {
          pushDistinct(next, item);
          if (next.length === 3) break;
        }
        if (!cancelled) setPalette(next.slice(0, 3));
      } catch {
        if (!cancelled) setPalette(fallback.slice(0, 3));
      }
    };
    img.onerror = () => {
      if (!cancelled) setPalette(fallback.slice(0, 3));
    };
    return () => { cancelled = true; };
  }, [src]);
  return palette;
}

export const rgb = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
export const shade = (c, f) => [Math.round(c[0] * f), Math.round(c[1] * f), Math.round(c[2] * f)];
// Perceived luminance — to pick readable text on the album colour.
export const isDark = (c) => (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) < 140;
