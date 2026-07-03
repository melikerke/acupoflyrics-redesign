import { useState } from "react";
import { motion } from "framer-motion";

export default function Loader() {
  // Brand signature on first visit only — skip it on subsequent navigations.
  const [show] = useState(() => {
    try {
      if (sessionStorage.getItem("apl_loaded")) return false;
      sessionStorage.setItem("apl_loaded", "1");
    } catch { /* ignore */ }
    return true;
  });
  if (!show) return null;

  return (
    <motion.div
      initial={{ opacity: 1 }} animate={{ opacity: 0 }}
      transition={{ duration: 0.5, delay: 0.95, ease: "easeOut" }}
      style={{ position: "fixed", inset: 0, zIndex: 100, background: "#f4f6fa", display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}
    >
      <svg width="240" height="60" viewBox="0 0 240 60">
        <motion.text x="120" y="40" textAnchor="middle" fontFamily="Fraunces, serif" fontSize="32" fontStyle="italic" fontWeight="300"
          fill="none" stroke="#14171f" strokeWidth="0.5"
          initial={{ strokeDashoffset: 640 }} animate={{ strokeDashoffset: 0, fill: "#14171f" }}
          transition={{ strokeDashoffset: { duration: 0.95, ease: "easeInOut" }, fill: { duration: 0.4, delay: 0.7 } }}
          style={{ strokeDasharray: 640 }}>
          acupoflyrics
        </motion.text>
        <motion.line x1="120" y1="14" x2="120" y2="50" stroke="#d6457a" strokeWidth="1.5"
          initial={{ opacity: 0 }} animate={{ opacity: [0, 0.9, 0] }} transition={{ duration: 1.1, delay: 0.2 }} />
      </svg>
    </motion.div>
  );
}
