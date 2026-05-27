import { useState, useEffect, useRef, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import HookLayout from '../components/HookLayout/HookLayout';
import CodeTrace from '../components/CodeTrace/CodeTrace';
import ExplainGrid from '../components/ExplainGrid/ExplainGrid';
import type { ExplainItem } from '../components/ExplainGrid/ExplainGrid';
import LifetimeLine from '../components/LifetimeLine/LifetimeLine';
import { useTracer } from '../hooks/useTracer';
import { useRenderCount } from '../hooks/useRenderCount';
import type { CodeLine } from '../components/CodeTrace/CodeTrace';
import styles from './HookPage.module.css';
import eff from './UseEffect.module.css';

/* ── Code lines ─────────────────────────────────────────── */
const CODE_LINES: CodeLine[] = [
  { id: 'import',       code: "import { useState, useEffect } from 'react';" },
  { id: 'blank0',       code: '', blank: true },
  { id: 'fn-open',      code: 'function DataLoader({ userId }) {' },
  { id: 'state',        code: "  const [data, setData] = useState(null);",
    annotation: 'state starts as null — no data yet' },
  { id: 'loading',      code: "  const [loading, setLoading] = useState(true);" },
  { id: 'blank1',       code: '', blank: true },
  { id: 'effect-call',  code: '  useEffect(() => {',
    annotation: '② React calls this effect after every render where userId changed' },
  { id: 'set-loading',  code: '    setLoading(true);',
    annotation: '③ Show spinner while we wait' },
  { id: 'fetch',        code: '    fetchUser(userId).then(result => {',
    annotation: '④ Side effect: async fetch (outside render)' },
  { id: 'set-data',     code: '      setData(result);',
    annotation: '⑤ Data arrives — setData triggers another render' },
  { id: 'set-done',     code: '      setLoading(false);' },
  { id: 'fetch-end',    code: '    });' },
  { id: 'blank2',       code: '', blank: true },
  { id: 'cleanup',      code: '    return () => {',
    annotation: '⑥ Cleanup runs before the NEXT effect or on unmount' },
  { id: 'cleanup-body', code: '      cancelRequest(); // prevent stale updates',
    annotation: '⑥ Cancel any in-flight request — avoids setting state on unmounted component' },
  { id: 'cleanup-end',  code: '    };' },
  { id: 'deps',         code: '  }, [userId]);',
    annotation: '① React watches userId — effect re-runs when it changes' },
  { id: 'blank3',       code: '', blank: true },
  { id: 'return',       code: '  return loading ? <Spinner /> : <User data={data} />;',
    annotation: '⑦ Render reflects the latest state' },
  { id: 'fn-close',     code: '}' },
];

/* ── Trace sequences ─────────────────────────────────────── */
const MOUNT_STEPS = [
  { lines: ['fn-open'],              type: 'jsx'          as const, duration: 5000, annotation: '① Component mounts for the first time' },
  { lines: ['state', 'loading'],     type: 'hook'         as const, duration: 5000, annotation: '① useState initializes — data = null, loading = true' },
  { lines: ['return'],               type: 'jsx'          as const, duration: 5000, annotation: '② React renders — shows Spinner (loading = true)' },
  { lines: ['effect-call', 'deps'],  type: 'effect'       as const, duration: 5000, annotation: '③ After render — useEffect fires (first mount)' },
  { lines: ['set-loading', 'fetch'], type: 'effect'       as const, duration: 5000, annotation: '④ Fetch starts — data is on its way' },
  { lines: ['set-data', 'set-done'], type: 'state-change' as const, duration: 5000, annotation: '⑤ Data arrives — setData + setLoading trigger re-render' },
  { lines: ['return'],               type: 'jsx'          as const, duration: 5000, annotation: '⑥ Re-render — Spinner replaced by <User data={data} />' },
];

const UPDATE_STEPS = [
  { lines: ['deps'],                                       type: 'hook'         as const, duration: 5000, annotation: '① userId changed — React sees deps array changed' },
  { lines: ['cleanup', 'cleanup-body', 'cleanup-end'],     type: 'cleanup'      as const, duration: 5000, annotation: '② Cleanup from PREVIOUS effect runs first' },
  { lines: ['effect-call'],                                type: 'effect'       as const, duration: 5000, annotation: '③ New effect fires with the new userId' },
  { lines: ['set-loading', 'fetch'],                       type: 'effect'       as const, duration: 5000, annotation: '④ Loading resets, new fetch starts' },
  { lines: ['set-data', 'set-done'],                       type: 'state-change' as const, duration: 5000, annotation: '⑤ New data arrives — another re-render' },
  { lines: ['return'],                                     type: 'jsx'          as const, duration: 5000, annotation: '⑥ UI reflects the new userId data' },
];

const UNMOUNT_STEPS = [
  { lines: ['cleanup', 'cleanup-body', 'cleanup-end'], type: 'cleanup' as const, duration: 5000, annotation: '① Component unmounts — cleanup runs one final time' },
  { lines: ['fn-close'],                               type: 'jsx'     as const, duration: 5000, annotation: '② Component is gone — no more renders, no more effects' },
];

/* ── Log helpers ─────────────────────────────────────────── */
type LogType = 'mount' | 'effect' | 'update' | 'cleanup' | 'unmount';

interface LogEntry {
  id: string;         // crypto.randomUUID() — no module-level counter needed
  type: LogType;
  message: string;
  time: string;
}

function makeLog(type: LogType, message: string): LogEntry {
  return {
    id: crypto.randomUUID(),
    type,
    message,
    time: new Date().toLocaleTimeString('en', {
      hour12: false,
      hour:   '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }),
  };
}

/* ── Inner demo component (mounts / unmounts) ────────────── */
function InnerDemo({ userId, onLog }: { userId: number; onLog: (e: LogEntry) => void }) {
  const [data,    setData]    = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Callback ref keeps onLog current without adding it to the effect's dep array.
  // This avoids a circular re-render loop: onLog changes → effect re-fires →
  // setLogs → parent re-renders → new onLog → effect re-fires → ∞
  const onLogRef = useRef(onLog);
  onLogRef.current = onLog;

  useEffect(() => {
    onLogRef.current(makeLog('effect', `Effect fired — userId = ${userId}`));
    setLoading(true);
    setData(null);
    const timer = window.setTimeout(() => {
      setData(`User #${userId} — ${['Alice', 'Bob', 'Carol', 'Dave'][userId % 4]}`);
      setLoading(false);
      onLogRef.current(makeLog('update', `Data loaded for userId = ${userId}`));
    }, 900);
    return () => {
      clearTimeout(timer);
      onLogRef.current(makeLog('cleanup', `Cleanup for userId = ${userId} — timer cancelled`));
    };
  }, [userId]);

  return (
    <div className={eff.innerDemo}>
      <div className={eff.userCard}>
        {loading ? (
          <div className={eff.spinner} />
        ) : (
          <motion.div
            key={data}
            className={eff.userData}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <span className={eff.userIcon}>👤</span>
            <span className={eff.userName}>{data}</span>
          </motion.div>
        )}
        <div className={eff.depsBadge}>
          <code>userId</code>
          <span className={eff.depsVal}>{userId}</span>
        </div>
      </div>
    </div>
  );
}

/* ── EffectDemo — wrapped in memo so tracer state changes in  ──
   the parent page don't cascade down and inflate render count. */
const EffectDemo = memo(function EffectDemo({
  onMount,
  onUpdate,
  onUnmount,
}: {
  onMount:   () => void;
  onUpdate:  () => void;
  onUnmount: () => void;
}) {
  const renderCount = useRenderCount();
  const [mounted, setMounted] = useState(true);
  const [userId,  setUserId]  = useState(0);
  const [logs,    setLogs]    = useState<LogEntry[]>([]);
  const logEndRef = useRef<HTMLDivElement>(null);

  const addLog = (entry: LogEntry) =>
    setLogs(prev => [...prev.slice(-8), entry]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  function handleMount() {
    setMounted(true);
    addLog(makeLog('mount', 'Component mounted'));
    onMount();
  }
  function handleUnmount() {
    setMounted(false);
    addLog(makeLog('unmount', 'Component unmounted'));
    onUnmount();
  }
  function handleUpdateUser() {
    setUserId(id => id + 1);
    addLog(makeLog('update', `userId changed → ${userId + 1}`));
    onUpdate();
  }

  const logClass: Record<LogType, string> = {
    mount:   styles.logMount,
    effect:  styles.logEffect,
    update:  styles.logUpdate,
    cleanup: styles.logCleanup,
    unmount: styles.logUnmount,
  };

  return (
    <div className={styles.demoCard}>
      <div className={styles.demoMeta}>
        <span className={styles.demoLabel}>Data Loader</span>
        <span className={styles.renderPill}>🔄 Render #{renderCount}</span>
      </div>

      <div className={eff.presence}>
        <AnimatePresence mode="wait">
          {mounted ? (
            <motion.div
              key="inner"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.25 }}
            >
              <InnerDemo userId={userId} onLog={addLog} />
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              className={eff.unmountedState}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              Component is unmounted
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className={eff.controls}>
        <button className={`${styles.btn} ${styles.btnGreen}`}    onClick={handleMount}      disabled={mounted}>Mount</button>
        <button className={`${styles.btn} ${styles.btnAccent}`}   onClick={handleUpdateUser} disabled={!mounted}>Change userId →{userId + 1}</button>
        <button className={`${styles.btn} ${styles.btnRed}`}      onClick={handleUnmount}    disabled={!mounted}>Unmount</button>
      </div>

      <div className={styles.logList}>
        {logs.length === 0 && (
          <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>
            ← Change userId or Unmount to see lifecycle events
          </span>
        )}
        {logs.map(log => (
          <motion.div
            key={log.id}
            className={styles.logEntry}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <span className={styles.logTime}>{log.time}</span>
            <span className={logClass[log.type]}>[{log.type}]</span>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.72rem' }}>
              {log.message}
            </span>
          </motion.div>
        ))}
        <div ref={logEndRef} />
      </div>
    </div>
  );
});

/* ── Lifecycle timeline events ───────────────────────────── */
const TIMELINE_EVENTS = [
  { id: 'mount',    type: 'mount'   as const, label: 'Mount'   },
  { id: 'effect',   type: 'effect'  as const, label: 'Effect'  },
  { id: 'update',   type: 'update'  as const, label: 'Update'  },
  { id: 'cleanup',  type: 'cleanup' as const, label: 'Cleanup' },
  { id: 'effect2',  type: 'effect'  as const, label: 'Effect'  },
  { id: 'unmount',  type: 'unmount' as const, label: 'Unmount' },
  { id: 'cleanup2', type: 'cleanup' as const, label: 'Cleanup' },
];

const EXPLAIN: ExplainItem[] = [
  {
    title: 'Why not just fetch inside the render?',
    color: '#4ade80',
    body: `React may render the component multiple times (Strict Mode, hot reload,
concurrent features). A fetch inside the render body runs on every render —
which means duplicate requests, race conditions, and infinite loops.

useEffect gives you a safe place to run side effects ONCE after the
render is committed to the DOM.`,
  },
  {
    title: 'The dependency array [userId] — what does it do?',
    color: '#a78bfa',
    body: `React compares the deps after each render.
• [] (empty) → effect runs ONCE on mount only
• [userId]  → effect re-runs whenever userId changes
• (omitted)  → effect runs after EVERY render (usually a mistake)

Think of it like: "re-run this effect whenever these values change."`,
  },
  {
    title: 'The cleanup function — return () => {...}',
    color: '#f87171',
    body: `The function you return from useEffect is the "cleanup."
React calls it:
• Before the effect fires again (deps changed)
• When the component unmounts

Use it to cancel timers, abort fetches, remove event listeners —
anything that would cause errors or memory leaks if left running.`,
  },
];

/* ── Page ────────────────────────────────────────────────── */
export default function UseEffectPage() {
  const mountTracer   = useTracer(MOUNT_STEPS);
  const updateTracer  = useTracer(UPDATE_STEPS);
  const unmountTracer = useTracer(UNMOUNT_STEPS);

  let activeTracer = mountTracer;
  if (updateTracer.currentStep  >= 0) activeTracer = updateTracer;
  if (unmountTracer.currentStep >= 0) activeTracer = unmountTracer;

  const activeLifeId =
    mountTracer.isPlaying   ? 'mount'   :
    updateTracer.isPlaying  ? 'update'  :
    unmountTracer.isPlaying ? 'unmount' :
    undefined;

  return (
    <HookLayout
      title="useEffect"
      subtitle="Runs code after a render — fetch data, subscribe to events, update the DOM. Returns an optional cleanup function that runs before the next effect or on unmount."
      tag="Side Effects"
      color="#4ade80"
      livePanel={
        <EffectDemo
          onMount={mountTracer.trigger}
          onUpdate={updateTracer.trigger}
          onUnmount={unmountTracer.trigger}
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
              : 'Click Mount, Change userId, or Unmount'
          }
        />
      }
      explainPanel={
        <>
          <LifetimeLine events={TIMELINE_EVENTS} activeId={activeLifeId} />
          <ExplainGrid items={EXPLAIN} />
        </>
      }
    />
  );
}
