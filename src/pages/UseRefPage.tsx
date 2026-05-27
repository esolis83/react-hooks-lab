import { useState, useRef, useEffect, memo } from 'react';
import { motion } from 'framer-motion';
import HookLayout from '../components/HookLayout/HookLayout';
import CodeTrace from '../components/CodeTrace/CodeTrace';
import ExplainGrid from '../components/ExplainGrid/ExplainGrid';
import type { ExplainItem } from '../components/ExplainGrid/ExplainGrid';
import { useTracer } from '../hooks/useTracer';
import { useRenderCount } from '../hooks/useRenderCount';
import type { CodeLine } from '../components/CodeTrace/CodeTrace';
import styles from './HookPage.module.css';
import ref from './UseRef.module.css';

/* ── Code lines ─────────────────────────────────────────── */
const CODE_LINES: CodeLine[] = [
  { id: 'fn-open',     code: 'function TextEditor() {' },
  { id: 'ref-decl',    code: '  // useRef — does NOT trigger re-render',
    annotation: 'ref.current is a mutable box — changing it stays silent' },
  { id: 'input-ref',   code: '  const inputRef = useRef<HTMLInputElement>(null);',
    annotation: '① React creates a ref object: { current: null }' },
  { id: 'count-ref',   code: '  const clickCount = useRef(0);',
    annotation: 'Tracks clicks — no re-render needed for this counter' },
  { id: 'blank1',      code: '', blank: true },
  { id: 'handler',     code: '  function handleFocus() {',
    annotation: '② handleFocus is called on button click' },
  { id: 'focus-call',  code: '    inputRef.current?.focus();',
    annotation: '③ Direct DOM call — no re-render triggered' },
  { id: 'click-inc',   code: '    clickCount.current += 1;',
    annotation: '④ Mutate the ref silently — React does NOT re-render' },
  { id: 'handler-end', code: '  }' },
  { id: 'blank2',      code: '', blank: true },
  { id: 'return',      code: '  return (' },
  { id: 'jsx-input',   code: '    <input ref={inputRef} ... />',
    annotation: '① React attaches the DOM node to inputRef.current' },
  { id: 'jsx-btn',     code: '    <button onClick={handleFocus}>Focus</button>',
    annotation: '② Click triggers handleFocus' },
  { id: 'return-end',  code: '  );' },
  { id: 'fn-close',    code: '}' },
];

const FOCUS_STEPS = [
  { lines: ['jsx-btn'],    type: 'handler' as const, duration: 5000, annotation: '① Button clicked — handleFocus will be called' },
  { lines: ['handler'],    type: 'handler' as const, duration: 5000, annotation: '② handleFocus() executes' },
  { lines: ['focus-call'], type: 'hook'    as const, duration: 5000, annotation: '③ inputRef.current.focus() — direct DOM access, no re-render' },
  { lines: ['click-inc'],  type: 'hook'    as const, duration: 5000, annotation: '④ clickCount.current++ — mutates ref silently, NO re-render' },
  { lines: ['jsx-input'],  type: 'jsx'     as const, duration: 5000, annotation: '⑤ Input is focused in the DOM — zero re-renders happened' },
];

const MOUNT_STEPS = [
  { lines: ['input-ref', 'count-ref'], type: 'hook' as const, duration: 5000, annotation: '① Mount — refs created: { current: null } and { current: 0 }' },
  { lines: ['jsx-input'],              type: 'jsx'  as const, duration: 5000, annotation: '② After render — React sets inputRef.current = the <input> DOM node' },
];

const EXPLAIN: ExplainItem[] = [
  {
    title: 'useRef vs useState — the key difference',
    color: '#34d399',
    body: `Both survive re-renders, but:

useState:  changing the value → triggers a re-render → UI updates
useRef:    changing the value → nothing happens → UI stays the same

Use useRef when you need to REMEMBER something but the UI doesn't
need to show it: timer IDs, previous values, DOM elements, counters.`,
  },
  {
    title: 'DOM refs — connecting to HTML elements',
    color: '#38bdf8',
    body: `When you pass a ref to a JSX element (<input ref={inputRef} />),
React sets inputRef.current to the actual DOM node after the render.

This lets you call native DOM methods like:
  .focus(), .blur(), .scrollIntoView(), .getBoundingClientRect()

Without useRef you'd have to use document.getElementById — messy.`,
  },
  {
    title: 'The "previous value" pattern',
    color: '#a78bfa',
    body: `One classic useRef trick: store the PREVIOUS value of a state:

  const prevCount = useRef(count);
  useEffect(() => {
    prevCount.current = count;
  }); // no deps — runs after every render

After each render: prevCount.current = the last render's count.
Useful for "changed from X to Y" transition animations.`,
  },
];

/* ── RefDemo — wrapped in memo so tracer state in the parent  ──
   page doesn't cause spurious re-renders inside the demo.     */
const RefDemo = memo(function RefDemo({
  onFocus,
  onMount,
}: {
  onFocus: () => void;
  onMount: () => void;
}) {
  const renderCount = useRenderCount();
  const inputRef    = useRef<HTMLInputElement>(null);
  const clickCount  = useRef(0);
  const [stateCount, setStateCount] = useState(0);

  // Callback ref: keeps onMount current without adding it to the dep array.
  // The effect must run exactly once (mount-only) so an empty dep array is
  // intentional — the ref pattern lets us call the latest onMount safely.
  const onMountRef = useRef(onMount);
  onMountRef.current = onMount;
  useEffect(() => { onMountRef.current(); }, []);

  // "Focus Input + trace" — focuses DOM AND triggers the code trace
  function handleFocus() {
    inputRef.current?.focus();
    clickCount.current += 1;
    onFocus();
  }

  // "Ref++ (no re-render)" — ONLY mutates the ref.
  // No state change → no re-render. The display won't update until the next
  // render caused by something else. That's the whole point — refs are silent.
  function handleRefOnly() {
    clickCount.current += 1;
  }

  function handleStateClick() {
    setStateCount(n => n + 1);
  }

  return (
    <div className={styles.demoCard}>
      <div className={styles.demoMeta}>
        <span className={styles.demoLabel}>Text Editor</span>
        <span className={styles.renderPill}>🔄 Render #{renderCount}</span>
      </div>

      <div className={styles.inputRow}>
        <input
          ref={inputRef}
          className={styles.demoInput}
          placeholder="Click 'Focus Input' to target this..."
          type="text"
        />
      </div>

      <button className={`${styles.btn} ${styles.btnGreen}`} onClick={handleFocus}>
        Focus Input + trace
      </button>

      {/* Live ref snapshot */}
      <div className={ref.refSnapshot}>
        <div className={ref.snapRow}>
          <span className={ref.snapKey}>inputRef.current</span>
          <span className={ref.snapVal}>&lt;input /&gt; DOM node</span>
        </div>
        <div className={ref.snapRow}>
          <span className={ref.snapKey}>clickCount.current</span>
          <motion.span
            key={clickCount.current}
            className={ref.snapVal}
            initial={{ color: '#34d399' }}
            animate={{ color: '#a78bfa' }}
            transition={{ duration: 0.4 }}
          >
            {clickCount.current}
          </motion.span>
        </div>
      </div>

      {/* Side-by-side: ref (silent) vs state (re-renders) */}
      <div className={styles.compareRow}>
        <div className={styles.compareBox}>
          <span className={styles.compareTitle} style={{ color: '#34d399' }}>useRef counter</span>
          <span className={styles.compareCount} style={{ color: '#34d399' }}>
            {clickCount.current}
          </span>
          <span className={styles.compareLabel}>Mutated silently — no re-render</span>
        </div>
        <div className={styles.compareBox}>
          <span className={styles.compareTitle} style={{ color: '#fbbf24' }}>useState counter</span>
          <motion.span
            key={stateCount}
            className={styles.compareCount}
            style={{ color: '#fbbf24' }}
            initial={{ scale: 1.3 }}
            animate={{ scale: 1 }}
          >
            {stateCount}
          </motion.span>
          <span className={styles.compareLabel}>State update → re-render</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button className={`${styles.btn} ${styles.btnGhost}`} onClick={handleRefOnly}>
          Ref++ (no re-render)
        </button>
        <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={handleStateClick}>
          State++ (re-render!)
        </button>
      </div>
    </div>
  );
});

/* ── Page ────────────────────────────────────────────────── */
export default function UseRefPage() {
  const focusTracer = useTracer(FOCUS_STEPS);
  const mountTracer = useTracer(MOUNT_STEPS);
  const activeTracer = focusTracer.currentStep >= 0 ? focusTracer : mountTracer;

  return (
    <HookLayout
      title="useRef"
      subtitle="Holds a mutable value that persists across renders — without triggering a re-render. Also the way to directly access DOM elements."
      tag="DOM & Persistence"
      color="#34d399"
      livePanel={
        <RefDemo
          onFocus={focusTracer.trigger}
          onMount={mountTracer.trigger}
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
              : 'Click "Focus Input + trace" to see the code flow'
          }
        />
      }
      explainPanel={<ExplainGrid items={EXPLAIN} />}
    />
  );
}
