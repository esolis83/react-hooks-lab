import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { tokenize } from './tokenizer';
import type { TraceType } from '../../hooks/useTracer';
import styles from './CodeTrace.module.css';

export interface CodeLine {
  id: string;
  code: string;
  indent?: number;
  annotation?: string;  // shown inline on the active line
  blank?: boolean;      // renders an empty spacer row
}

interface CodeTraceProps {
  lines: CodeLine[];
  activeLines: string[];
  traceType?: TraceType;
  title?: string;
  annotation?: string;  // step annotation from tracer (shown in footer bar)
  stepLabel?: string;   // e.g. "Step 2 / 5"
}

const TYPE_CLASS: Record<TraceType, string> = {
  default:        styles.typeDefault,
  hook:           styles.typeHook,
  handler:        styles.typeHandler,
  'state-change': styles.typeState,
  effect:         styles.typeEffect,
  cleanup:        styles.typeCleanup,
  jsx:            styles.typeJsx,
};

export default function CodeTrace({
  lines,
  activeLines,
  traceType = 'default',
  title = 'Code Flow',
  annotation,
  stepLabel,
}: CodeTraceProps) {
  // Memoize the set so we don't rebuild it on every render
  const activeSet = useMemo(() => new Set(activeLines), [activeLines]);

  return (
    <div className={styles.root}>
      {/* ── Window chrome ───────────────────────────────── */}
      <div className={styles.header}>
        <div className={styles.dots} aria-hidden="true">
          <span /><span /><span />
        </div>
        <span className={styles.title}>{title}</span>
        {stepLabel && (
          <span className={styles.stepLabel} aria-live="polite">
            {stepLabel}
          </span>
        )}
      </div>

      {/* ── Code lines ──────────────────────────────────── */}
      {/*
        Using <div> instead of <pre> because the children are block-level
        <div> elements — <pre> only allows phrasing content (inline elements).
        Monospace / whitespace styling is applied via the .pre CSS class.
      */}
      <div className={styles.pre} role="region" aria-label="Code trace">
        {lines.map((line, idx) => {
          const isActive = activeSet.has(line.id);

          if (line.blank) {
            return <div key={line.id} className={styles.blankLine} aria-hidden="true" />;
          }

          return (
            <motion.div
              key={line.id}
              className={`${styles.line} ${isActive ? styles.lineActive : ''} ${isActive ? TYPE_CLASS[traceType] : ''}`}
              animate={isActive ? { opacity: 1 } : { opacity: 0.45 }}
              transition={{ duration: 0.25 }}
            >
              {/* Line number gutter */}
              <span className={styles.lineNum} aria-hidden="true">{idx + 1}</span>

              {/* Execution step dot */}
              <span className={`${styles.dot} ${isActive ? styles.dotActive : ''}`} aria-hidden="true" />

              {/* Syntax-highlighted code */}
              <code
                className={styles.code}
                style={line.indent ? { paddingLeft: `${line.indent * 0.55}rem` } : undefined}
              >
                {tokenize(line.code).map((tok, i) => (
                  <span key={i} className={`tok-${tok.type}`}>
                    {tok.text}
                  </span>
                ))}
              </code>

              {/* Inline annotation — appears when the line is active */}
              <AnimatePresence>
                {isActive && line.annotation && (
                  <motion.span
                    className={styles.lineAnnotation}
                    initial={{ opacity: 0, x: 6 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {line.annotation}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* ── Step annotation footer ───────────────────────── */}
      <AnimatePresence mode="wait">
        {annotation && (
          <motion.div
            key={annotation}
            className={`${styles.annotationBar} ${TYPE_CLASS[traceType]}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            role="status"
            aria-live="polite"
          >
            <span className={styles.annotationIcon} aria-hidden="true">▶</span>
            {annotation}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
