import { Link } from "react-router-dom";
import { motion } from "motion/react";

export default function Breadcrumb({ current }) {
  return (
    <motion.nav
      className="mb-6 flex items-center gap-2.5 text-sm"
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link
        to="/"
        className="font-medium transition-colors"
        style={{ color: "var(--text-muted)" }}
        onMouseEnter={(e) => (e.target.style.color = "var(--text-primary)")}
        onMouseLeave={(e) => (e.target.style.color = "var(--text-muted)")}
      >
        Dashboard
      </Link>
      <span style={{ color: "var(--border-strong)" }}>/</span>
      <span className="font-semibold" style={{ color: "var(--accent)" }}>
        {current}
      </span>
    </motion.nav>
  );
}
