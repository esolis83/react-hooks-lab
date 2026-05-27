import { useState, useMemo, useRef, memo } from 'react';
import { motion } from 'framer-motion';
import HookLayout from '../components/HookLayout/HookLayout';
import CodeTrace from '../components/CodeTrace/CodeTrace';
import ExplainGrid from '../components/ExplainGrid/ExplainGrid';
import type { ExplainItem } from '../components/ExplainGrid/ExplainGrid';
import { useTracer } from '../hooks/useTracer';
import { useRenderCount } from '../hooks/useRenderCount';
import type { CodeLine } from '../components/CodeTrace/CodeTrace';
import styles from './HookPage.module.css';
import memo_ from './UseMemo.module.css';

/* ── Code lines ─────────────────────────────────────────── */
const MEMO_CODE: CodeLine[] = [
  { id: 'fn-open',   code: 'function SortedList({ items, filter }) {' },
  { id: 'blank1',    code: '', blank: true },
  { id: 'memo-call', code: '  // Without useMemo — runs on EVERY render',
    annotation: 'This runs even when "filter" didn\'t change' },
  { id: 'no-memo',   code: '  const sorted = items.sort();  // ← expensive!',
    annotation: '⚠ Re-runs on every render — even unrelated ones' },
  { id: 'blank2',    code: '', blank: true },
  { id: 'with-memo', code: '  // With useMemo — cached until deps change',
    annotation: '✓ Only re-runs when [items] changes' },
  { id: 'memo-decl', code: '  const sorted = useMemo(() => {',
    annotation: '① useMemo wraps the expensive calculation' },
  { id: 'memo-body', code: '    return [...items].sort();',
    annotation: '② Runs only when items changes — cached otherwise' },
  { id: 'memo-deps', code: '  }, [items]);',
    annotation: '③ [items] is the dependency — same as useEffect' },
  { id: 'blank3',    code: '', blank: true },
  { id: 'return',    code: '  return <List data={sorted} />;',
    annotation: '④ Component renders with the cached sorted result' },
  { id: 'fn-close',  code: '}' },
];

const CB_CODE: CodeLine[] = [
  { id: 'parent-open',  code: 'function Parent() {' },
  { id: 'state',        code: '  const [count, setCount] = useState(0);' },
  { id: 'blank1',       code: '', blank: true },
  { id: 'no-cb',        code: '  // Without useCallback — new fn every render',
    annotation: '⚠ Child re-renders every time Parent re-renders' },
  { id: 'no-cb-fn',     code: '  const handleClick = () => doSomething();',
    annotation: 'New function reference on every render → Child sees "new prop"' },
  { id: 'blank2',       code: '', blank: true },
  { id: 'with-cb',      code: '  // With useCallback — stable reference',
    annotation: '✓ Same function reference unless deps change' },
  { id: 'cb-decl',      code: '  const handleClick = useCallback(() => {',
    annotation: '① useCallback memoizes the function itself' },
  { id: 'cb-body',      code: '    doSomething();',
    annotation: '② The function body is the same, just cached' },
  { id: 'cb-deps',      code: '  }, []);',
    annotation: '③ [] = never changes; [dep] = changes when dep changes' },
  { id: 'blank3',       code: '', blank: true },
  { id: 'child-jsx',    code: '  return <Child onClick={handleClick} />;',
    annotation: '④ Child receives a STABLE prop → skips re-render' },
  { id: 'parent-close', code: '}' },
];

/* ── Trace steps ─────────────────────────────────────────── */
const MEMO_MISS = [
  { lines: ['no-memo'], type: 'cleanup' as const, duration: 5000, annotation: '⚠ Without useMemo — expensive sort runs on every render' },
  { lines: ['return'],  type: 'jsx'     as const, duration: 5000, annotation: 'Component renders — but calculation wasted CPU' },
];
const MEMO_HIT = [
  { lines: ['memo-decl', 'memo-deps'], type: 'hook' as const, duration: 5000, annotation: '① useMemo checks: did [items] change?' },
  { lines: ['memo-body'],              type: 'hook' as const, duration: 5000, annotation: '② YES — items changed, so it re-runs the sort' },
  { lines: ['return'],                 type: 'jsx'  as const, duration: 5000, annotation: '③ Component renders with fresh sorted result' },
];
const MEMO_CACHED = [
  { lines: ['memo-decl', 'memo-deps'], type: 'hook' as const, duration: 5000, annotation: '① useMemo checks: did [items] change?' },
  { lines: ['memo-deps'],              type: 'hook' as const, duration: 5000, annotation: '② NO — items unchanged, returns cached result instantly' },
  { lines: ['return'],                 type: 'jsx'  as const, duration: 5000, annotation: '③ Renders with zero recalculation — cache hit ⚡' },
];

/* ── Slow sort (artificially expensive to make the demo clear) */
function slowSort(arr: number[]): number[] {
  const start = performance.now();
  while (performance.now() - start < 40) { /* intentional spin */ }
  return [...arr].sort((a, b) => a - b);
}

/* ── MemoDemo — wrapped in memo so tracer state changes in the ──
   parent page don't cascade down and inflate the render count. */
const MemoDemo = memo(function MemoDemo({
  onMiss,
  onHit,
  onCached,
}: {
  onMiss:   () => void;
  onHit:    () => void;
  onCached: () => void;
}) {
  const renderCount = useRenderCount();
  const [items,    setItems]    = useState([5, 2, 8, 1, 9, 3]);
  const [unrelated, setUnrelated] = useState(0);
  const [useMemoOn, setUseMemoOn] = useState(false);

  const noMemoRender = useRef(0);
  const memoRender   = useRef(0);
  const cacheHits    = useRef(0);
  const prevItems    = useRef(items);

  const itemsChanged = items !== prevItems.current;
  if (itemsChanged) prevItems.current = items;

  if (!useMemoOn) {
    noMemoRender.current += 1;
  } else {
    memoRender.current += 1;
    if (!itemsChanged) cacheHits.current += 1;
  }

  // useMemo is always called (hooks must not be conditional), but the demo
  // toggle controls which stats are tracked and which trace fires.
  const sorted = useMemo(() => slowSort(items), [items]);

  function handleShuffleItems() {
    setItems(arr => [...arr].sort(() => Math.random() - 0.5));
    if (useMemoOn) onHit(); else onMiss();
  }
  function handleUnrelated() {
    setUnrelated(n => n + 1);
    if (useMemoOn) onCached(); else onMiss();
  }

  return (
    <div className={styles.demoCard}>
      <div className={styles.demoMeta}>
        <span className={styles.demoLabel}>Sorted List</span>
        <span className={styles.renderPill}>🔄 Render #{renderCount}</span>
      </div>

      <div className={styles.toggleRow}>
        <label className={styles.toggle}>
          <input
            type="checkbox"
            checked={useMemoOn}
            onChange={e => setUseMemoOn(e.target.checked)}
          />
          <span className={styles.toggleSlider} />
        </label>
        <span className={styles.toggleLabel}>
          {useMemoOn
            ? '✓ useMemo ON — calculation cached'
            : '✗ useMemo OFF — recalculates every render'}
        </span>
      </div>

      <div className={memo_.sortedBox}>
        <span className={memo_.sortedLabel}>Sorted result:</span>
        <div className={memo_.sortedItems}>
          {sorted.map((n, i) => (
            <motion.span key={i} className={memo_.sortedItem} layout>{n}</motion.span>
          ))}
        </div>
        <span
          className={memo_.cacheTag}
          style={{ color: useMemoOn ? '#4ade80' : '#f87171' }}
        >
          {useMemoOn
            ? `⚡ Cache hits: ${cacheHits.current}`
            : '⚠ Re-sorted on every render'}
        </span>
      </div>

      <div className={styles.compareRow}>
        <div className={styles.compareBox}>
          <span className={styles.compareTitle} style={{ color: '#f87171' }}>Without memo</span>
          <span className={styles.compareCount} style={{ color: '#f87171' }}>{noMemoRender.current}</span>
          <span className={styles.compareLabel}>sort() calls (every render)</span>
        </div>
        <div className={styles.compareBox}>
          <span className={styles.compareTitle} style={{ color: '#4ade80' }}>With useMemo</span>
          <span className={styles.compareCount} style={{ color: '#4ade80' }}>
            {memoRender.current - cacheHits.current}
          </span>
          <span className={styles.compareLabel}>actual sort() calls (rest cached)</span>
        </div>
      </div>

      <div className={styles.btnRow}>
        <button
          className={`${styles.btn} ${styles.btnAccent}`}
          onClick={handleShuffleItems}
        >
          Shuffle Items ↻
        </button>
        <button
          className={`${styles.btn} ${styles.btnSecondary}`}
          onClick={handleUnrelated}
        >
          Unrelated update ({unrelated})
        </button>
      </div>
    </div>
  );
});

/* ── Explain ─────────────────────────────────────────────── */
const EXPLAIN: ExplainItem[] = [
  {
    title: 'useMemo — cache a computed VALUE',
    color: '#f472b6',
    body: `useMemo(() => expensiveCalc(), [deps])

Memoizes a RETURN VALUE. Useful when:
• A calculation is CPU-expensive (sorting 10k items, parsing data)
• You pass the result to a React.memo() child component
• The result is used in another hook's deps array

NOT worth it for simple values — the overhead exceeds the savings.`,
  },
  {
    title: 'useCallback — cache a FUNCTION',
    color: '#a78bfa',
    body: `useCallback(() => doSomething(), [deps])

Memoizes a FUNCTION REFERENCE. Useful when:
• Passing a callback to a React.memo() child — stable ref = skip re-render
• The function is in a useEffect deps array

Rule: useMemo(() => fn, deps) ≡ useCallback(fn, deps)
They're the same mechanism, different return types.`,
  },
  {
    title: 'When NOT to memoize',
    color: '#38bdf8',
    body: `Memoization has a cost — storing the cache, comparing deps.
Skip it when:
• The calculation is cheap (add two numbers, filter a 5-item array)
• The component only renders once or rarely
• No child component cares about referential equality

Rule of thumb: measure first. If renders are fast, leave it alone.
Premature optimization is the root of all evil.`,
  },
];

/* ── Page ────────────────────────────────────────────────── */
export default function UseMemoPage() {
  const [activeCode, setActiveCode] = useState<'memo' | 'cb'>('memo');
  const missTracer   = useTracer(MEMO_MISS);
  const hitTracer    = useTracer(MEMO_HIT);
  const cachedTracer = useTracer(MEMO_CACHED);

  let activeTracer = missTracer;
  if (hitTracer.currentStep    >= 0) activeTracer = hitTracer;
  if (cachedTracer.currentStep >= 0) activeTracer = cachedTracer;

  return (
    <HookLayout
      title="useMemo + useCallback"
      subtitle="Cache expensive computations (useMemo) or function references (useCallback) so React skips unnecessary re-work when dependencies haven't changed."
      tag="Performance"
      color="#f472b6"
      livePanel={
        <MemoDemo
          onMiss={missTracer.trigger}
          onHit={hitTracer.trigger}
          onCached={cachedTracer.trigger}
        />
      }
      codePanel={
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, height: '100%' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className={`${styles.btn} ${activeCode === 'memo' ? styles.btnAccent : styles.btnGhost}`}
              style={{ flex: 1, fontSize: '0.75rem', padding: '6px' }}
              onClick={() => setActiveCode('memo')}
            >
              useMemo
            </button>
            <button
              className={`${styles.btn} ${activeCode === 'cb' ? styles.btnAccent : styles.btnGhost}`}
              style={{ flex: 1, fontSize: '0.75rem', padding: '6px' }}
              onClick={() => setActiveCode('cb')}
            >
              useCallback
            </button>
          </div>
          <div style={{ flex: 1 }}>
            <CodeTrace
              lines={activeCode === 'memo' ? MEMO_CODE : CB_CODE}
              activeLines={activeTracer.activeLines}
              traceType={activeTracer.currentType}
              annotation={activeTracer.currentAnnotation}
              stepLabel={
                activeTracer.currentStep >= 0
                  ? `Step ${activeTracer.currentStep + 1} / ${activeTracer.totalSteps}`
                  : 'Toggle useMemo and click buttons to trace'
              }
            />
          </div>
        </div>
      }
      explainPanel={<ExplainGrid items={EXPLAIN} />}
    />
  );
}
