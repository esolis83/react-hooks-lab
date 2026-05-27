import { useReducer, useRef, useState, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import HookLayout from '../components/HookLayout/HookLayout';
import CodeTrace from '../components/CodeTrace/CodeTrace';
import ExplainGrid from '../components/ExplainGrid/ExplainGrid';
import type { ExplainItem } from '../components/ExplainGrid/ExplainGrid';
import { useTracer } from '../hooks/useTracer';
import { useRenderCount } from '../hooks/useRenderCount';
import type { CodeLine } from '../components/CodeTrace/CodeTrace';
import styles from './HookPage.module.css';
import red from './UseReducer.module.css';

/* ── Types ───────────────────────────────────────────────── */
interface Task {
  id: string;
  text: string;
  done: boolean;
}

type Action =
  | { type: 'ADD';        text: string }
  | { type: 'TOGGLE';     id: string   }
  | { type: 'REMOVE';     id: string   }
  | { type: 'CLEAR_DONE'               };

/* ── Reducer (pure function — lives outside the component) ── */
function taskReducer(state: Task[], action: Action): Task[] {
  switch (action.type) {
    case 'ADD':
      return [...state, { id: crypto.randomUUID(), text: action.text, done: false }];
    case 'TOGGLE':
      return state.map(t => t.id === action.id ? { ...t, done: !t.done } : t);
    case 'REMOVE':
      return state.filter(t => t.id !== action.id);
    case 'CLEAR_DONE':
      return state.filter(t => !t.done);
    default:
      return state;
  }
}

/* ── Code lines ─────────────────────────────────────────── */
const CODE_LINES: CodeLine[] = [
  { id: 'type-action',   code: "type Action = { type: 'ADD'; text: string }",
    annotation: 'Actions are plain objects — always include a type field' },
  { id: 'type-more',     code: "           | { type: 'TOGGLE'; id: string }  | ...",
    annotation: 'Each action type describes one thing that can happen' },
  { id: 'blank1',        code: '', blank: true },
  { id: 'reducer-fn',    code: 'function reducer(state, action) {',
    annotation: '① reducer is a PURE function — same input always → same output' },
  { id: 'switch',        code: '  switch (action.type) {' },
  { id: 'case-add',      code: "    case 'ADD':",
    annotation: '② Pattern-match on action.type to decide what to do' },
  { id: 'add-return',    code: '      return [...state, newTask];',
    annotation: '③ Always return NEW state — never mutate the old one' },
  { id: 'case-toggle',   code: "    case 'TOGGLE':",
    annotation: '② Different action → different state transformation' },
  { id: 'toggle-return', code: '      return state.map(t => t.id === action.id ? {...t, done: !t.done} : t);' },
  { id: 'case-clear',    code: "    case 'CLEAR_DONE':" },
  { id: 'clear-return',  code: '      return state.filter(t => !t.done);' },
  { id: 'reducer-end',   code: '}' },
  { id: 'blank2',        code: '', blank: true },
  { id: 'component',     code: 'function TaskList() {' },
  { id: 'use-reducer',   code: '  const [tasks, dispatch] = useReducer(reducer, []);',
    annotation: '④ useReducer wires the reducer to component state' },
  { id: 'blank3',        code: '', blank: true },
  { id: 'dispatch-add',  code: "  dispatch({ type: 'ADD', text: 'Learn hooks' });",
    annotation: '⑤ dispatch() sends an action → reducer runs → new state → re-render' },
  { id: 'dispatch-tog',  code: "  dispatch({ type: 'TOGGLE', id: task.id });",
    annotation: '⑤ Same dispatch, different action — reducer handles both' },
];

/* ── Trace sequences ─────────────────────────────────────── */
const ADD_STEPS = [
  { lines: ['dispatch-add'],             type: 'handler'      as const, duration: 5000, annotation: '① dispatch({ type: "ADD" }) — action object sent to reducer' },
  { lines: ['reducer-fn', 'switch'],     type: 'hook'         as const, duration: 5000, annotation: '② reducer(currentState, action) is called' },
  { lines: ['case-add', 'add-return'],   type: 'effect'       as const, duration: 5000, annotation: '③ ADD case — returns new array with the task appended' },
  { lines: ['use-reducer'],              type: 'state-change' as const, duration: 5000, annotation: '④ useReducer updates state — tasks now has the new item' },
  { lines: ['dispatch-add'],             type: 'jsx'          as const, duration: 5000, annotation: '⑤ Component re-renders — new task appears in the list' },
];

const TOGGLE_STEPS = [
  { lines: ['dispatch-tog'],               type: 'handler'      as const, duration: 5000, annotation: '① dispatch({ type: "TOGGLE", id }) — identifies which task' },
  { lines: ['reducer-fn', 'switch'],       type: 'hook'         as const, duration: 5000, annotation: '② reducer(currentState, action) is called' },
  { lines: ['case-toggle', 'toggle-return'], type: 'effect'     as const, duration: 5000, annotation: '③ TOGGLE case — maps over tasks, flips done on the matched one' },
  { lines: ['use-reducer'],                type: 'state-change' as const, duration: 5000, annotation: '④ New state returned — useReducer triggers re-render' },
  { lines: ['dispatch-tog'],               type: 'jsx'          as const, duration: 5000, annotation: '⑤ Task checkbox flips in the UI' },
];

const CLEAR_STEPS = [
  { lines: ['case-clear', 'clear-return'], type: 'effect'       as const, duration: 5000, annotation: '① CLEAR_DONE — filters out every task where done = true' },
  { lines: ['use-reducer'],                type: 'state-change' as const, duration: 5000, annotation: '② useReducer receives the filtered array — triggers re-render' },
  { lines: ['dispatch-add'],               type: 'jsx'          as const, duration: 5000, annotation: '③ Only pending tasks remain in the list' },
];

/* ── ReducerDemo ─────────────────────────────────────────── */
const ReducerDemo = memo(function ReducerDemo({
  onAdd,
  onToggle,
  onClear,
}: {
  onAdd:    () => void;
  onToggle: () => void;
  onClear:  () => void;
}) {
  const renderCount = useRenderCount();
  const [tasks, dispatch] = useReducer(taskReducer, []);
  const [inputText, setInputText] = useState('');
  const [lastAction, setLastAction] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleAdd() {
    const text = inputText.trim();
    if (!text) return;
    const action = { type: 'ADD' as const, text };
    setLastAction(JSON.stringify(action));
    dispatch(action);
    setInputText('');
    inputRef.current?.focus();
    onAdd();
  }

  function handleToggle(id: string) {
    const action = { type: 'TOGGLE' as const, id };
    setLastAction(JSON.stringify(action));
    dispatch(action);
    onToggle();
  }

  function handleRemove(id: string) {
    const action = { type: 'REMOVE' as const, id };
    setLastAction(JSON.stringify(action));
    dispatch(action);
  }

  function handleClear() {
    const action = { type: 'CLEAR_DONE' as const };
    setLastAction(JSON.stringify(action));
    dispatch(action);
    onClear();
  }

  const doneCount = tasks.filter(t => t.done).length;

  return (
    <div className={styles.demoCard}>
      <div className={styles.demoMeta}>
        <span className={styles.demoLabel}>Task Manager</span>
        <span className={styles.renderPill}>🔄 Render #{renderCount}</span>
      </div>

      {/* Last dispatched action */}
      <div className={red.actionBadge}>
        <span className={red.actionLabel}>dispatch</span>
        {lastAction ? (
          <motion.span
            key={lastAction}
            className={red.actionPayload}
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
          >
            {lastAction}
          </motion.span>
        ) : (
          <span className={red.actionEmpty}>
            — waiting for an action…
          </span>
        )}
      </div>

      {/* Add task */}
      <div className={red.addRow}>
        <input
          ref={inputRef}
          className={red.addInput}
          placeholder="New task…"
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
        />
        <button
          className={`${styles.btn} ${styles.btnAccent}`}
          style={{ flex: 'none', padding: '8px 16px' }}
          onClick={handleAdd}
        >
          Add
        </button>
      </div>

      {/* Task list */}
      <div className={red.taskList}>
        {tasks.length === 0 && (
          <p className={red.taskEmpty}>No tasks yet — type something above</p>
        )}
        <AnimatePresence initial={false}>
          {tasks.map(task => (
            <motion.div
              key={task.id}
              className={red.taskItem}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              <input
                type="checkbox"
                className={red.taskCheckbox}
                checked={task.done}
                onChange={() => handleToggle(task.id)}
              />
              <span className={`${red.taskText} ${task.done ? red.taskDone : ''}`}>
                {task.text}
              </span>
              <button
                className={red.taskRemove}
                onClick={() => handleRemove(task.id)}
                aria-label={`Remove ${task.text}`}
              >
                ✕
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Stats + clear */}
      <div className={styles.compareRow}>
        <div className={styles.compareBox}>
          <span className={styles.compareTitle} style={{ color: '#38bdf8' }}>Total</span>
          <span className={styles.compareCount} style={{ color: '#38bdf8' }}>{tasks.length}</span>
          <span className={styles.compareLabel}>tasks in state</span>
        </div>
        <div className={styles.compareBox}>
          <span className={styles.compareTitle} style={{ color: '#4ade80' }}>Done</span>
          <span className={styles.compareCount} style={{ color: '#4ade80' }}>{doneCount}</span>
          <span className={styles.compareLabel}>completed</span>
        </div>
      </div>

      <button
        className={`${styles.btn} ${styles.btnGhost}`}
        onClick={handleClear}
        disabled={doneCount === 0}
      >
        Clear done ({doneCount})
      </button>
    </div>
  );
});

/* ── Explain ─────────────────────────────────────────────── */
const EXPLAIN: ExplainItem[] = [
  {
    title: 'useReducer vs useState',
    color: '#fb923c',
    body: `Both manage state — use useReducer when:
• State has multiple sub-values that update together
• Next state depends on complex logic from the previous state
• You have many different "actions" (add, remove, toggle, clear…)

For a single counter or a boolean flag, useState is simpler.
For a task list, shopping cart, or form — useReducer wins.`,
  },
  {
    title: 'The reducer pattern',
    color: '#38bdf8',
    body: `reducer(currentState, action) → nextState

Rules:
① It must be a PURE function — no side effects inside
② Never mutate state directly — always return a NEW object/array
③ action.type is the convention for describing what happened
④ The switch/case makes it easy to add new behaviours

You can test a reducer in isolation with plain JS — no React needed.`,
  },
  {
    title: 'dispatch — the only way in',
    color: '#a78bfa',
    body: `dispatch(action) is the single entry point for all state changes.

• You can pass dispatch down as a prop or through context
• Action objects are serializable — easy to log, replay, or debug
• With useContext + useReducer you get a lightweight Redux-style
  store: shared state + predictable updates, zero extra libraries.`,
  },
];

/* ── Page ────────────────────────────────────────────────── */
export default function UseReducerPage() {
  const addTracer    = useTracer(ADD_STEPS);
  const toggleTracer = useTracer(TOGGLE_STEPS);
  const clearTracer  = useTracer(CLEAR_STEPS);

  let activeTracer = addTracer;
  if (toggleTracer.currentStep >= 0) activeTracer = toggleTracer;
  if (clearTracer.currentStep  >= 0) activeTracer = clearTracer;

  return (
    <HookLayout
      title="useReducer"
      subtitle="Manage complex state with a pure reducer function. All state changes go through dispatch — making updates predictable, testable, and easy to trace."
      tag="State Management"
      color="#fb923c"
      livePanel={
        <ReducerDemo
          onAdd={addTracer.trigger}
          onToggle={toggleTracer.trigger}
          onClear={clearTracer.trigger}
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
              : 'Add a task, check it off, or clear done to trace'
          }
        />
      }
      explainPanel={<ExplainGrid items={EXPLAIN} />}
    />
  );
}
