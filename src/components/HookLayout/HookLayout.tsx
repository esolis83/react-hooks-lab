import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import styles from './HookLayout.module.css';

interface HookLayoutProps {
  title: string;
  subtitle: string;
  tag: string;         // e.g. "State Management"
  color: string;       // CSS color for the accent strip
  livePanel: ReactNode;
  codePanel: ReactNode;
  explainPanel?: ReactNode;
}

export default function HookLayout({
  title,
  subtitle,
  tag,
  color,
  livePanel,
  codePanel,
  explainPanel,
}: HookLayoutProps) {
  return (
    <motion.div
      className={styles.page}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.35 }}
    >
      {/* ── Page header ───────────────────────────────────── */}
      <div className={styles.header}>
        <Link to="/" className={styles.back}>← All Hooks</Link>
        <div className={styles.meta}>
          <span
            className={styles.tag}
            style={{ color, borderColor: color, background: `${color}15` }}
          >
            {tag}
          </span>
          <h1 className={styles.title} style={{ color }}>{title}</h1>
          <p className={styles.subtitle}>{subtitle}</p>
        </div>
      </div>

      {/* ── Split-screen main area ─────────────────────────── */}
      <div className={styles.split}>
        {/* Left — live interactive demo */}
        <section className={styles.panel}>
          <div className={styles.panelLabel}>
            <span className={styles.dot} style={{ background: '#4ade80' }} />
            Live Preview
          </div>
          <div className={styles.panelBody}>{livePanel}</div>
        </section>

        {/* Right — code trace */}
        <section className={styles.panel}>
          <div className={styles.panelLabel}>
            <span className={styles.dot} style={{ background: '#a78bfa' }} />
            Code Flow
          </div>
          <div className={styles.panelBodyCode}>{codePanel}</div>
        </section>
      </div>

      {/* ── Explanation section ───────────────────────────── */}
      {explainPanel && (
        <div className={styles.explain}>{explainPanel}</div>
      )}
    </motion.div>
  );
}
