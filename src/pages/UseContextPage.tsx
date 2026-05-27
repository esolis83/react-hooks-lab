import { useState, useContext, createContext, useRef, useEffect, memo } from 'react';
import { motion } from 'framer-motion';
import HookLayout from '../components/HookLayout/HookLayout';
import CodeTrace from '../components/CodeTrace/CodeTrace';
import ExplainGrid from '../components/ExplainGrid/ExplainGrid';
import type { ExplainItem } from '../components/ExplainGrid/ExplainGrid';
import { useTracer } from '../hooks/useTracer';
import { useRenderCount } from '../hooks/useRenderCount';
import type { CodeLine } from '../components/CodeTrace/CodeTrace';
import styles from './HookPage.module.css';
import ctx from './UseContext.module.css';

/* ── Context (module-level — shared between Provider & consumers) */
type Theme = 'dark' | 'light';
const ThemeContext = createContext<Theme>('dark');

/* ── Code lines ─────────────────────────────────────────── */
const CODE_LINES: CodeLine[] = [
  { id: 'create',       code: "const ThemeContext = createContext('dark');",
    annotation: '① createContext() creates the channel — default value = "dark"' },
  { id: 'blank1',       code: '', blank: true },
  { id: 'app-open',     code: 'function App() {' },
  { id: 'state',        code: "  const [theme, setTheme] = useState('dark');",
    annotation: 'useState owns the current value — Provider just broadcasts it' },
  { id: 'blank2',       code: '', blank: true },
  { id: 'provider',     code: '  return (' },
  { id: 'provider-tag', code: '    <ThemeContext.Provider value={theme}>',
    annotation: '② Provider makes "theme" available to every nested component' },
  { id: 'child-a',      code: '      <Header />',
    annotation: 'No theme prop — context handles it' },
  { id: 'child-b',      code: '      <Card />',
    annotation: 'Same — zero prop drilling at any depth' },
  { id: 'child-c',      code: '      <Footer />' },
  { id: 'toggle',       code: "      <button onClick={() => setTheme(t => ...)}>",
    annotation: '③ Changing state → Provider re-broadcasts → all consumers update' },
  { id: 'provider-end', code: '    </ThemeContext.Provider>' },
  { id: 'blank3',       code: '', blank: true },
  { id: 'consumer-fn',  code: 'function Header() {' },
  { id: 'use-ctx',      code: '  const theme = useContext(ThemeContext);',
    annotation: '④ useContext subscribes to the nearest matching Provider above it' },
  { id: 'consumer-ret', code: '  return <header className={theme}>...</header>;',
    annotation: '⑤ Re-renders automatically whenever the context value changes' },
  { id: 'consumer-end', code: '}' },
];

/* ── Trace sequences ─────────────────────────────────────── */
const TOGGLE_STEPS = [
  { lines: ['toggle'],                            type: 'handler'      as const, duration: 5000, annotation: '① Toggle button clicked — setTheme queues an update' },
  { lines: ['state'],                             type: 'state-change' as const, duration: 5000, annotation: '② useState updates — App re-renders with new theme value' },
  { lines: ['provider-tag'],                      type: 'effect'       as const, duration: 5000, annotation: '③ Provider receives new value — broadcasts to all subscribers' },
  { lines: ['use-ctx'],                           type: 'hook'         as const, duration: 5000, annotation: '④ useContext in Header, Card, Footer detects the change' },
  { lines: ['consumer-ret', 'child-a', 'child-b', 'child-c'], type: 'jsx' as const, duration: 5000, annotation: '⑤ All consumers re-render with the new theme — zero prop drilling' },
];

const MOUNT_STEPS = [
  { lines: ['create'],       type: 'hook'   as const, duration: 5000, annotation: '① createContext() runs — context object created with default "dark"' },
  { lines: ['provider-tag'], type: 'effect' as const, duration: 5000, annotation: '② Provider mounts — starts broadcasting to the component tree' },
  { lines: ['use-ctx'],      type: 'hook'   as const, duration: 5000, annotation: '③ useContext in each consumer subscribes — they\'ll update on every change' },
];

/* ── Consumer components (defined OUTSIDE the demo so they look
   realistically "distant" from the Provider)                 */
function ThemedConsumer({ name }: { name: string }) {
  const theme = useContext(ThemeContext);
  const renders = useRenderCount();
  const isLight = theme === 'light';

  return (
    <motion.div
      className={`${ctx.consumer} ${isLight ? ctx.consumerLight : ''}`}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <span className={ctx.consumerName}>{name}</span>
      <motion.span
        key={theme}
        className={`${ctx.themeChip} ${isLight ? ctx.themeLight : ctx.themeDark}`}
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1,    opacity: 1 }}
        transition={{ duration: 0.25 }}
      >
        {isLight ? '☀️ light' : '🌙 dark'}
      </motion.span>
      <span className={ctx.consumerPill}>render #{renders}</span>
    </motion.div>
  );
}

/* ── ContextDemo ─────────────────────────────────────────── */
const ContextDemo = memo(function ContextDemo({
  onToggle,
  onMount,
}: {
  onToggle: () => void;
  onMount:  () => void;
}) {
  const renderCount = useRenderCount();
  const [theme, setTheme] = useState<Theme>('dark');

  // Callback ref — runs onMount once without putting it in the dep array
  const onMountRef = useRef(onMount);
  onMountRef.current = onMount;
  useEffect(() => { onMountRef.current(); }, []);

  function handleToggle() {
    setTheme(t => (t === 'dark' ? 'light' : 'dark'));
    onToggle();
  }

  return (
    <div className={styles.demoCard}>
      <div className={styles.demoMeta}>
        <span className={styles.demoLabel}>Theme Context</span>
        <span className={styles.renderPill}>🔄 Render #{renderCount}</span>
      </div>

      {/* Provider wrapping consumers — no props passed */}
      <ThemeContext.Provider value={theme}>
        <div className={ctx.providerBox}>
          <code className={ctx.providerLabel}>
            ThemeContext.Provider value=&quot;{theme}&quot;
          </code>
          <ThemedConsumer name="<Header />" />
          <ThemedConsumer name="<Card />"   />
          <ThemedConsumer name="<Footer />" />
        </div>
      </ThemeContext.Provider>

      {/* No prop drilling callout */}
      <div className={ctx.noPropsBadge}>
        <span>✓</span>
        <span>
          None of these components receive a <code>theme</code> prop —
          they read it directly from context.
        </span>
      </div>

      <button
        className={`${styles.btn} ${styles.btnAccent}`}
        onClick={handleToggle}
      >
        Toggle {theme === 'dark' ? '☀️ Light' : '🌙 Dark'} Mode
      </button>

      {/* Without vs with context */}
      <div className={styles.compareRow}>
        <div className={styles.compareBox}>
          <span className={styles.compareTitle} style={{ color: '#f87171' }}>
            Without context
          </span>
          <span className={styles.compareLabel} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}>
            App→Page→Section→Widget
          </span>
          <span className={styles.compareLabel}>props at every level ❌</span>
        </div>
        <div className={styles.compareBox}>
          <span className={styles.compareTitle} style={{ color: '#4ade80' }}>
            With context
          </span>
          <span className={styles.compareLabel} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}>
            Provider → useContext()
          </span>
          <span className={styles.compareLabel}>zero prop drilling ✓</span>
        </div>
      </div>
    </div>
  );
});

/* ── Explain ─────────────────────────────────────────────── */
const EXPLAIN: ExplainItem[] = [
  {
    title: 'The prop drilling problem',
    color: '#a78bfa',
    body: `Imagine a theme setting at the top of your app that 10 nested
components need. Without context you'd pass it as a prop at every
single level — even components that don't use it themselves.

useContext cuts that wire entirely: any component can subscribe
directly to the value, no matter how deeply nested it is.`,
  },
  {
    title: 'createContext + Provider + useContext',
    color: '#38bdf8',
    body: `Three pieces work together:

createContext(default)  → creates the channel
<Context.Provider value> → broadcasts the value down the tree
useContext(Context)     → reads the current value anywhere below

The Provider owns the value (via useState/useReducer).
Consumers just subscribe — they re-render whenever it changes.`,
  },
  {
    title: 'When NOT to use context',
    color: '#f87171',
    body: `Context is not a state manager — it's a transport layer.

Avoid it when:
• Only one or two components need the value (just pass props)
• The value changes very frequently (every consumer re-renders!)
• You need fine-grained subscriptions (use Zustand / Redux instead)

Best for: theme, locale, auth user, feature flags — values that
change rarely and are needed in many places.`,
  },
];

/* ── Page ────────────────────────────────────────────────── */
export default function UseContextPage() {
  const toggleTracer = useTracer(TOGGLE_STEPS);
  const mountTracer  = useTracer(MOUNT_STEPS);
  const activeTracer = toggleTracer.currentStep >= 0 ? toggleTracer : mountTracer;

  return (
    <HookLayout
      title="useContext"
      subtitle="Read a value from a Context Provider anywhere in the component tree — no matter how deeply nested — without passing props at every level."
      tag="Context"
      color="#a78bfa"
      livePanel={
        <ContextDemo
          onToggle={toggleTracer.trigger}
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
              : 'Click "Toggle Mode" to trace the context flow'
          }
        />
      }
      explainPanel={<ExplainGrid items={EXPLAIN} />}
    />
  );
}
