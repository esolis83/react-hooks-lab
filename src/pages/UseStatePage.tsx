import { useState, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import HookLayout from '../components/HookLayout/HookLayout';
import CodeTrace from '../components/CodeTrace/CodeTrace';
import ExplainGrid from '../components/ExplainGrid/ExplainGrid';
import type { ExplainItem } from '../components/ExplainGrid/ExplainGrid';
import { useTracer } from '../hooks/useTracer';
import { useRenderCount } from '../hooks/useRenderCount';
import type { CodeLine } from '../components/CodeTrace/CodeTrace';
import styles from './HookPage.module.css';

/* ── Code lines ────────────────────────────────────────────── */
const CODE_LINES: CodeLine[] = [
  { id: 'fn-open',     code: 'function Counter() {' },
  { id: 'state-decl',  code: "  const [count, setCount] = useState(0);",
    annotation: '① React creates a state slot initialized to 0' },
  { id: 'blank1',      code: '', blank: true },
  { id: 'handler-fn',  code: '  function handleIncrement() {',
    annotation: '② handleIncrement is called when button clicked' },
  { id: 'setcount',    code: '    setCount(count + 1);',
    annotation: '③ setCount schedules a re-render with count + 1' },
  { id: 'handler-end', code: '  }' },
  { id: 'blank2',      code: '', blank: true },
  { id: 'return',      code: '  return (' },
  { id: 'jsx-wrap',    code: '    <div className="counter">',
    annotation: '⑤ React re-renders — JSX reflects new count' },
  { id: 'jsx-display', code: '      <p>{count}</p>',
    annotation: '⑤ {count} now shows the updated value' },
  { id: 'jsx-btn',     code: '      <button onClick={handleIncrement}>',
    annotation: '① Click event received here' },
  { id: 'jsx-btn-txt', code: '        Increment' },
  { id: 'jsx-btn-end', code: '      </button>' },
  { id: 'jsx-end',     code: '    </div>' },
  { id: 'return-end',  code: '  );' },
  { id: 'fn-close',    code: '}' },
];

/* ── Trace sequences ───────────────────────────────────────── */
const INC_STEPS = [
  { lines: ['jsx-btn'],    type: 'handler'      as const, duration: 5000, annotation: '① Button receives the click event' },
  { lines: ['handler-fn'], type: 'handler'      as const, duration: 5000, annotation: '② handleIncrement() is called' },
  { lines: ['setcount'],   type: 'state-change' as const, duration: 5000, annotation: '③ setCount(count + 1) — React queues a state update' },
  { lines: ['state-decl'], type: 'hook'         as const, duration: 5000, annotation: '④ React updates the state slot — count is now the new value' },
  { lines: ['jsx-wrap', 'jsx-display', 'jsx-btn'], type: 'jsx' as const, duration: 5000, annotation: '⑤ Component re-renders — the UI reflects the new count' },
];

const RESET_STEPS = [
  { lines: ['jsx-btn'],    type: 'handler'      as const, duration: 5000, annotation: '① Reset button clicked' },
  { lines: ['handler-fn'], type: 'handler'      as const, duration: 5000, annotation: '② handleReset() is called' },
  { lines: ['setcount'],   type: 'state-change' as const, duration: 5000, annotation: '③ setCount(0) — state goes back to 0' },
  { lines: ['state-decl'], type: 'hook'         as const, duration: 5000, annotation: '④ React updates the state slot — count = 0' },
  { lines: ['jsx-wrap', 'jsx-display', 'jsx-btn'], type: 'jsx' as const, duration: 5000, annotation: '⑤ Re-render — UI resets' },
];

const EXPLAIN: ExplainItem[] = [
  {
    title: 'Why useState and not a regular variable?',
    color: '#fbbf24',
    body: `A regular variable like \`let count = 0\` resets every render.
React doesn't watch it — changing it does nothing to the UI.

useState gives you a "memory slot" that survives re-renders and
triggers a new render every time you call the setter.`,
  },
  {
    title: 'Why not useRef?',
    color: '#34d399',
    body: `useRef also survives re-renders, but changing a ref does NOT
trigger a re-render. That's useful when you need to track a value
silently (like a timer ID).

Rule of thumb: if the UI needs to show the value → useState.
If you just need to remember it quietly → useRef.`,
  },
  {
    title: 'Why not useEffect?',
    color: '#4ade80',
    body: `useEffect runs code AFTER a render as a side effect (fetching
data, subscriptions, DOM manipulation). It doesn't store values.

useState is for holding data that drives the UI.
useEffect is for actions that happen because of that data.`,
  },
];

/* ── Demo component — wrapped in memo so tracer re-renders  ──
   in the parent page don't cascade down and inflate the count. */
const CounterDemo = memo(function CounterDemo({
  onIncrement,
  onDecrement,
  onReset,
}: {
  onIncrement: () => void;
  onDecrement: () => void;
  onReset:     () => void;
}) {
  const renderCount = useRenderCount();
  const [count, setCount] = useState(0);

  function handleIncrement() { setCount(c => c + 1); onIncrement(); }
  function handleDecrement() { setCount(c => c - 1); onDecrement(); }
  function handleReset()     { setCount(0);           onReset();     }

  return (
    <div className={styles.demoCard}>
      <div className={styles.demoMeta}>
        <span className={styles.demoLabel}>Counter</span>
        <span className={styles.renderPill}>🔄 Render #{renderCount}</span>
      </div>

      <div className={styles.counterDisplay}>
        <AnimatePresence mode="popLayout">
          <motion.span
            key={count}
            className={styles.counterNum}
            initial={{ y: count > 0 ? -20 : 20, opacity: 0, scale: 0.8 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: count > 0 ? 20 : -20, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 28 }}
          >
            {count}
          </motion.span>
        </AnimatePresence>
        <span className={styles.counterState}>
          <code>count</code> = <code className={styles.stateVal}>{count}</code>
        </span>
      </div>

      <div className={styles.btnRow}>
        <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={handleDecrement}>
          − Decrement
        </button>
        <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleIncrement}>
          + Increment
        </button>
      </div>
      <button className={`${styles.btn} ${styles.btnGhost}`} onClick={handleReset}>
        ↺ Reset to 0
      </button>

      <div className={styles.stateSnapshot}>
        <span className={styles.snapshotLabel}>useState snapshot</span>
        <div className={styles.snapshotRow}>
          <span className={styles.snapshotKey}>count</span>
          <motion.span
            key={count}
            className={styles.snapshotValue}
            initial={{ scale: 1.3, color: '#fbbf24' }}
            animate={{ scale: 1,   color: '#a78bfa' }}
            transition={{ duration: 0.3 }}
          >
            {count}
          </motion.span>
        </div>
        <div className={styles.snapshotRow}>
          <span className={styles.snapshotKey}>setCount</span>
          <span className={styles.snapshotFn}>ƒ ( )</span>
        </div>
      </div>
    </div>
  );
});

/* ── Page ────────────────────────────────────────────────── */
export default function UseStatePage() {
  // useTracer.trigger is wrapped in useCallback([]) — stable reference, so
  // CounterDemo's memo bail-out holds across tracer-driven re-renders.
  const incTracer   = useTracer(INC_STEPS);
  const resetTracer = useTracer(RESET_STEPS);

  const activeTracer = resetTracer.currentStep >= 0 ? resetTracer : incTracer;

  return (
    <HookLayout
      title="useState"
      subtitle="Stores a value in a component. When the value changes, React re-renders the component so the UI stays in sync."
      tag="State Management"
      color="#fbbf24"
      livePanel={
        <CounterDemo
          onIncrement={incTracer.trigger}
          onDecrement={incTracer.trigger}
          onReset={resetTracer.trigger}
        />
      }
      codePanel={
        <CodeTrace
          lines={CODE_LINES}
          activeLines={activeTracer.activeLines}
          traceType={activeTracer.currentType}
          annotation={activeTracer.currentAnnotation}
          stepLabel={
            activeTracer.currentStep >= 0
              ? `Step ${activeTracer.currentStep + 1} / ${activeTracer.totalSteps}`
              : 'Click a button to trace'
          }
        />
      }
      explainPanel={<ExplainGrid items={EXPLAIN} />}
    />
  );
}
