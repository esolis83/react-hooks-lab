import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import styles from './Comparison.module.css';

/* ── Hook data ───────────────────────────────────────────── */
const HOOKS = [
  {
    name: 'useState',
    to: '/use-state',
    color: '#fbbf24',
    icon: '📦',
    tagline: 'Store a value that makes the UI re-render',
    triggers: 'Re-render',
    dom: false,
    async: false,
    syntax: 'const [value, setValue] = useState(initial)',
    useCases: [
      'Form inputs (controlled)',
      'Toggle open/close',
      'Counter / score',
      'API data after fetch',
      'Active tab or step',
    ],
    notFor: [
      'Mutable values you don\'t want to display',
      'DOM node references',
      'Expensive derived data',
    ],
    mental: 'Think of it as a variable with a superpower: React watches it and re-draws the screen whenever it changes.',
  },
  {
    name: 'useEffect',
    to: '/use-effect',
    color: '#4ade80',
    icon: '⚡',
    tagline: 'Run code after render (side effects)',
    triggers: 'Nothing — runs after render',
    dom: true,
    async: true,
    syntax: 'useEffect(() => { ... return cleanup }, [deps])',
    useCases: [
      'Fetch data on mount / dep change',
      'Subscribe to events (resize, scroll)',
      'Set document.title',
      'Start / clear timers',
      'Sync external libraries (D3, maps)',
    ],
    notFor: [
      'Storing display values (use useState)',
      'DOM refs (use useRef)',
      'Expensive transforms (use useMemo)',
    ],
    mental: 'Think of it as a "side street" — the main road is render, but useEffect lets you duck into a side street to do work that doesn\'t belong in the render itself.',
  },
  {
    name: 'useRef',
    to: '/use-ref',
    color: '#34d399',
    icon: '📌',
    tagline: 'Mutable value that survives renders — silently',
    triggers: 'Nothing — changes are silent',
    dom: true,
    async: false,
    syntax: 'const ref = useRef(initialValue)',
    useCases: [
      'DOM element focus / scroll',
      'Store previous state value',
      'setTimeout / interval IDs',
      'Render counter (no extra re-renders)',
      'Store a value inside useEffect without deps',
    ],
    notFor: [
      'Values that should update the UI (use useState)',
      'Side effects (use useEffect)',
      'Cached computations (use useMemo)',
    ],
    mental: 'Think of it as a sticky note on the component\'s desk — you can write on it any time, and it stays there across renders, but React doesn\'t look at it when deciding what to draw.',
  },
  {
    name: 'useMemo',
    to: '/use-memo',
    color: '#f472b6',
    icon: '🧮',
    tagline: 'Cache an expensive computed value',
    triggers: 'Nothing — just caches a value',
    dom: false,
    async: false,
    syntax: 'const result = useMemo(() => compute(), [deps])',
    useCases: [
      'Sort / filter large arrays',
      'Heavy math / parsing',
      'Computed value passed to React.memo() child',
      'Derived value used in useEffect deps',
    ],
    notFor: [
      'Simple math / string ops (not worth it)',
      'Side effects (use useEffect)',
      'Function references (use useCallback)',
    ],
    mental: 'Think of it as a cache on a shelf — the first time, you do the work and put the answer on the shelf. Next render, you check if the inputs changed; if not, grab the answer from the shelf.',
  },
  {
    name: 'useCallback',
    to: '/use-memo',
    color: '#a78bfa',
    icon: '🔗',
    tagline: 'Cache a function reference across renders',
    triggers: 'Nothing — just stabilizes the function ref',
    dom: false,
    async: false,
    syntax: 'const fn = useCallback(() => doWork(), [deps])',
    useCases: [
      'Callback passed to React.memo() child',
      'Event handler in useEffect deps',
      'Stable ref for event listener',
    ],
    notFor: [
      'Every function (overhead > benefit)',
      'Computed values (use useMemo)',
      'DOM refs (use useRef)',
    ],
    mental: 'Like useMemo but for functions. Without it, every render creates a brand-new function object — even if the code is identical. useCallback returns the same object, preventing unnecessary child re-renders.',
  },
  {
    name: 'useContext',
    to: '/use-context',
    color: '#a78bfa',
    icon: '🌐',
    tagline: 'Read shared state anywhere in the tree — no prop drilling',
    triggers: 'Re-render (when context value changes)',
    dom: false,
    async: false,
    syntax: 'const value = useContext(MyContext)',
    useCases: [
      'Theme (dark / light mode)',
      'Current authenticated user',
      'Locale / language',
      'Feature flags',
      'Shared UI state (sidebar open, modal)',
    ],
    notFor: [
      'High-frequency updates (every consumer re-renders!)',
      'Local component state (just use useState)',
      'Complex shared state (use useReducer + context)',
    ],
    mental: 'Think of it as a TV broadcast — the Provider is the transmitter, every useContext is a receiver. Change the broadcast and every TV updates, no cables between them needed.',
  },
  {
    name: 'useReducer',
    to: '/use-reducer',
    color: '#fb923c',
    icon: '⚙️',
    tagline: 'Complex state with predictable, testable updates',
    triggers: 'Re-render (when dispatch causes state change)',
    dom: false,
    async: false,
    syntax: 'const [state, dispatch] = useReducer(reducer, init)',
    useCases: [
      'Multi-step forms',
      'Shopping cart (add / remove / clear)',
      'Task / todo list',
      'State machine (idle → loading → success → error)',
      'Shared state when paired with useContext',
    ],
    notFor: [
      'Simple single values (use useState instead)',
      'Side effects inside the reducer (it must be pure)',
      'Async operations (dispatch after the await, not inside reducer)',
    ],
    mental: 'Like a bank account — you never change the balance directly. You submit a transaction (action), the bank (reducer) applies the rules, and returns the new balance (state). Auditable, predictable, testable.',
  },
];

// Precomputed lookup: hook name → color
const HOOK_COLOR: Record<string, string> = Object.fromEntries(
  HOOKS.map(h => [h.name, h.color]),
);

/* ── Decision tree ───────────────────────────────────────── */
const QUESTIONS = [
  {
    q: 'Does the UI need to change when the value changes?',
    yes: 'q-shared',
    no: 'q-effect',
  },
  {
    id: 'q-shared',
    q: 'Do many components at different depths need this value?',
    yes: { answer: 'useContext', color: '#a78bfa' },
    no: 'q-complex',
  },
  {
    id: 'q-complex',
    q: 'Does the state have many sub-values or complex update logic?',
    yes: { answer: 'useReducer', color: '#fb923c' },
    no: { answer: 'useState',   color: '#fbbf24' },
  },
  {
    id: 'q-effect',
    q: 'Do you need to run code that has nothing to do with rendering?',
    yes: { answer: 'useEffect',  color: '#4ade80' },
    no: 'q-memo',
  },
  {
    id: 'q-memo',
    q: 'Is it an expensive calculation based on existing data?',
    yes: { answer: 'useMemo',    color: '#f472b6' },
    no: 'q-callback',
  },
  {
    id: 'q-callback',
    q: 'Is it a function you\'re passing as a prop to a child component?',
    yes: { answer: 'useCallback', color: '#a78bfa' },
    no: { answer: 'useRef',       color: '#34d399' },
  },
];

const HOOK_ROUTES: Record<string, string> = {
  useState:    '/use-state',
  useEffect:   '/use-effect',
  useMemo:     '/use-memo',
  useCallback: '/use-memo',
  useRef:      '/use-ref',
  useContext:  '/use-context',
  useReducer:  '/use-reducer',
};

/* ── Quick reference table ───────────────────────────────── */
const TABLE_HOOKS = [
  'useState', 'useEffect', 'useRef',
  'useMemo', 'useCallback', 'useContext', 'useReducer',
] as const;

type TableHook = typeof TABLE_HOOKS[number];

const TABLE_ROWS: Array<{ feature: string } & Record<TableHook, string>> = [
  { feature: 'Triggers re-render',     useState: '✓', useEffect: '—', useRef: '—', useMemo: '—', useCallback: '—', useContext: '✓', useReducer: '✓' },
  { feature: 'Runs after render',       useState: '—', useEffect: '✓', useRef: '—', useMemo: '—', useCallback: '—', useContext: '—', useReducer: '—' },
  { feature: 'Persists across renders', useState: '✓', useEffect: '—', useRef: '✓', useMemo: '✓', useCallback: '✓', useContext: '✓', useReducer: '✓' },
  { feature: 'DOM access',              useState: '—', useEffect: '✓', useRef: '✓', useMemo: '—', useCallback: '—', useContext: '—', useReducer: '—' },
  { feature: 'Dependency array',        useState: '—', useEffect: '✓', useRef: '—', useMemo: '✓', useCallback: '✓', useContext: '—', useReducer: '—' },
  { feature: 'Cleanup function',        useState: '—', useEffect: '✓', useRef: '—', useMemo: '—', useCallback: '—', useContext: '—', useReducer: '—' },
  { feature: 'For async/fetch',         useState: '—', useEffect: '✓', useRef: '—', useMemo: '—', useCallback: '—', useContext: '—', useReducer: '—' },
  { feature: 'For performance',         useState: '—', useEffect: '—', useRef: '—', useMemo: '✓', useCallback: '✓', useContext: '—', useReducer: '—' },
  { feature: 'Cross-tree sharing',      useState: '—', useEffect: '—', useRef: '—', useMemo: '—', useCallback: '—', useContext: '✓', useReducer: '—' },
  { feature: 'Multi-action state',      useState: '—', useEffect: '—', useRef: '—', useMemo: '—', useCallback: '—', useContext: '—', useReducer: '✓' },
];

/* ── Component ───────────────────────────────────────────── */
export default function ComparisonPage() {
  const [activeHook, setActiveHook] = useState(0);
  const [treeStep,   setTreeStep]   = useState(0);
  const [treeAnswer, setTreeAnswer] = useState<string | null>(null);
  const hook = HOOKS[activeHook];

  function handleTreeAnswer(choice: 'yes' | 'no') {
    const q      = QUESTIONS[treeStep];
    const result = choice === 'yes' ? q.yes : q.no;
    if (typeof result === 'object' && 'answer' in result) {
      setTreeAnswer(result.answer);
    } else if (typeof result === 'string') {
      const nextIdx = QUESTIONS.findIndex(q_ => q_.id === result);
      if (nextIdx >= 0) setTreeStep(nextIdx);
    }
  }

  function resetTree() {
    setTreeStep(0);
    setTreeAnswer(null);
  }

  const answerColor = treeAnswer ? HOOK_COLOR[treeAnswer] : undefined;

  return (
    <motion.div
      className={styles.page}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <div className={styles.pageHeader}>
        <Link to="/" className={styles.back}>← All Hooks</Link>
        <div>
          <h1 className={styles.title}>Hook Comparison</h1>
          <p className={styles.subtitle}>
            Side-by-side: what each hook does, when to use it, and how to pick the right one.
          </p>
        </div>
      </div>

      {/* ── Decision Tree ──────────────────────────────────── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>🌿 Which hook do I need?</h2>
        <div className={styles.tree}>
          <AnimatePresence mode="wait">
            {treeAnswer ? (
              <motion.div
                key="answer"
                className={styles.treeAnswer}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
              >
                <span className={styles.treeAnswerLabel}>You need</span>
                <code className={styles.treeAnswerHook} style={{ color: answerColor }}>
                  {treeAnswer}
                </code>
                <div className={styles.treeAnswerActions}>
                  <Link
                    to={HOOK_ROUTES[treeAnswer]}
                    className={styles.treeLink}
                    style={{ borderColor: answerColor, color: answerColor }}
                  >
                    Explore {treeAnswer} →
                  </Link>
                  <button className={styles.treeReset} onClick={resetTree}>
                    ↺ Start over
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key={treeStep}
                className={styles.treeQuestion}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <p className={styles.treeQ}>
                  <span className={styles.treeQNum}>{treeStep + 1}.</span>{' '}
                  {QUESTIONS[treeStep].q}
                </p>
                <div className={styles.treeButtons}>
                  <button
                    className={`${styles.treeBtn} ${styles.treeBtnYes}`}
                    onClick={() => handleTreeAnswer('yes')}
                  >
                    Yes
                  </button>
                  <button
                    className={`${styles.treeBtn} ${styles.treeBtnNo}`}
                    onClick={() => handleTreeAnswer('no')}
                  >
                    No
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* ── Side-by-side cards ─────────────────────────────── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>🔬 Hook deep-dive</h2>

        <div className={styles.tabs}>
          {HOOKS.map((h, i) => (
            <button
              key={h.name}
              className={`${styles.tab} ${i === activeHook ? styles.tabActive : ''}`}
              style={i === activeHook
                ? { color: h.color, borderColor: h.color, background: `${h.color}12` }
                : undefined
              }
              onClick={() => setActiveHook(i)}
            >
              <code>{h.name}</code>
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={hook.name}
            className={styles.hookDetail}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22 }}
          >
            <div className={styles.hookHeader}>
              <span className={styles.hookIcon}>{hook.icon}</span>
              <div>
                <h3 className={styles.hookName} style={{ color: hook.color }}>
                  <code>{hook.name}</code>
                </h3>
                <p className={styles.hookTagline}>{hook.tagline}</p>
              </div>
              <Link
                to={hook.to}
                className={styles.exploreBtn}
                style={{ borderColor: hook.color, color: hook.color }}
              >
                Interactive demo →
              </Link>
            </div>

            <pre
              className={styles.hookSyntax}
              style={{ borderColor: `${hook.color}40` }}
            >
              <code>{hook.syntax}</code>
            </pre>

            <div className={styles.chipRow}>
              <span
                className={styles.chip}
                style={{ background: `${hook.color}15`, color: hook.color, borderColor: `${hook.color}40` }}
              >
                {hook.triggers === 'Re-render' || hook.triggers.startsWith('Re-render')
                  ? `🔄 ${hook.triggers}`
                  : hook.triggers}
              </span>
              {hook.dom && (
                <span className={styles.chip} style={{ background: 'rgba(56,189,248,0.1)', color: '#38bdf8', borderColor: 'rgba(56,189,248,0.3)' }}>
                  🌐 DOM access
                </span>
              )}
              {hook.async && (
                <span className={styles.chip} style={{ background: 'rgba(74,222,128,0.1)', color: '#4ade80', borderColor: 'rgba(74,222,128,0.3)' }}>
                  ⚡ Async-safe
                </span>
              )}
            </div>

            <div className={styles.caseGrid}>
              <div className={styles.caseBox}>
                <span className={styles.caseTitle} style={{ color: hook.color }}>✓ Use for</span>
                <ul className={styles.caseList}>
                  {hook.useCases.map(u => <li key={u}>{u}</li>)}
                </ul>
              </div>
              <div className={styles.caseBox}>
                <span className={styles.caseTitle} style={{ color: '#f87171' }}>✗ Not for</span>
                <ul className={styles.caseList} style={{ color: 'var(--text-muted)' }}>
                  {hook.notFor.map(n => <li key={n}>{n}</li>)}
                </ul>
              </div>
            </div>

            <div className={styles.mental}>
              <span className={styles.mentalLabel}>💡 Mental model</span>
              <p className={styles.mentalText}>{hook.mental}</p>
            </div>
          </motion.div>
        </AnimatePresence>
      </section>

      {/* ── Quick reference table ──────────────────────────── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>📊 Quick reference</h2>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.thFeature}>Feature</th>
                {TABLE_HOOKS.map(name => (
                  <th key={name} className={styles.th} style={{ color: HOOK_COLOR[name] }}>
                    <code>{name}</code>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TABLE_ROWS.map(row => (
                <tr key={row.feature} className={styles.tr}>
                  <td className={styles.tdFeature}>{row.feature}</td>
                  {TABLE_HOOKS.map(name => (
                    <td
                      key={name}
                      className={`${styles.td} ${row[name] === '✓' ? styles.tdYes : styles.tdNo}`}
                    >
                      {row[name]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </motion.div>
  );
}
