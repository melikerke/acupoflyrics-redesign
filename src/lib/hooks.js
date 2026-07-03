import { useEffect, useRef, useState } from "react";

export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const fn = (e) => setReduced(e.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);
  return reduced;
}

// Magnetic pull toward the cursor within a radius. Returns a ref to attach.
export function useMagnetic(strength = 0.4, radius = 90) {
  const ref = useRef(null);
  const reduced = usePrefersReducedMotion();
  useEffect(() => {
    const el = ref.current;
    if (!el || reduced) return;
    let raf;
    const onMove = (e) => {
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.hypot(dx, dy);
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (dist < radius) {
          const pull = 1 - dist / radius;
          el.style.transform = `translate(${dx * pull * strength}px, ${dy * pull * strength}px)`;
        } else {
          el.style.transform = "translate(0,0)";
        }
      });
    };
    const reset = () => { el.style.transform = "translate(0,0)"; };
    window.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", reset);
    return () => {
      window.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", reset);
      cancelAnimationFrame(raf);
    };
  }, [strength, radius, reduced]);
  return ref;
}

// Smoothed, normalized pointer position (0..1) for the whole window.
export function usePointer() {
  const pos = useRef({ x: 0.5, y: 0.5, sx: 0.5, sy: 0.5 });
  useEffect(() => {
    const onMove = (e) => {
      pos.current.x = e.clientX / window.innerWidth;
      pos.current.y = e.clientY / window.innerHeight;
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);
  return pos;
}
