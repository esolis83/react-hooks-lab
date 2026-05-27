import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import styles from './Home.module.css';

const HOOKS = [
  {
    to: '/use-state',
    name: 'useState',
    tag: 'State',
    color: '#fbbf24',
    desc: 'Store a value that makes the component re-render when it changes.',
    example: 'const [count, setCount] = useState(0)',
    when: 'When you need the UI to update in response to data.',
  },
  {
    to: '/use-effect',
    name: 'useEffect',
    tag: 'Side Effects',
    color: '#4ade80',
    desc: 'Run code after a render — fetch data, set up listeners, manipulate the DOM.',
    example: 'useEffect(() => { fetchData() }, [id])',
    when: 'When something needs to happen outside the render cycle.',
  },
  {
    to: '/use-ref',
    name: 'useRef',
    tag: 'DOM & Persistence',
    color: '#34d399',
    desc: 'Hold a mutable value or a DOM element reference — without triggering re-renders.',
    example: 'const inputRef = useRef<HTMLInputElement>(null)',
    when: 'When you need to remember a value but NOT cause a re-render.',
  },
  {
    to: '/use-memo',
    name: 'useMemo + useCallback',
    tag: 'Performance',
    color: '#f472b6',
    desc: 'Cache an expensive computation or a function so React skips re-running it.',
    example: 'const sorted = useMemo(() => items.sort(), [items])',
    when: 'When a computation is expensive or a function causes unnecessary child re-renders.',
  },
  {
    to: '/comparison',
    name: 'Hook Comparison',
    tag: 'Decision Guide',
    color: '#a78bfa',
    desc: 'Side-by-side breakdown of every hook — pick the right one every time.',
    example: 'useState vs useEffect vs useRef vs useMemo',
    when: 'When you\'re not sure which hook to reach for.',
  },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};
const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function Home() {
  return (
    <div className={styles.page}>
      {/* Hero */}
      <motion.section
        className={styles.hero}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className={styles.heroBadge}>Interactive Visual Reference</div>
        <h1 className={styles.heroTitle}>
          React Hooks,<br />
          <span className={styles.heroAccent}>finally visible.</span>
        </h1>
        <p className={styles.heroDesc}>
          Click a button, watch the code light up. See exactly which lines run,
          in what order, and why — designed for visual thinkers who learn by
          <em> seeing</em> rather than reading.
        </p>
        <div className={styles.heroHint}>
          <span className={styles.pulse} />
          Pick a hook below to start exploring
        </div>
      </motion.section>

      {/* Hook cards */}
      <motion.div
        className={styles.grid}
        variants={container}
        initial="hidden"
        animate="show"
      >
        {HOOKS.map(hook => (
          <motion.div key={hook.to} variants={item}>
            <Link to={hook.to} className={styles.card}>
              <div className={styles.cardTop}>
                <span
                  className={styles.cardTag}
                  style={{ color: hook.color, borderColor: hook.color, background: `${hook.color}15` }}
                >
                  {hook.tag}
                </span>
                <span className={styles.arrow}>→</span>
              </div>
              <h2 className={styles.cardName} style={{ color: hook.color }}>
                <code>{hook.name}</code>
              </h2>
              <p className={styles.cardDesc}>{hook.desc}</p>
              <pre className={styles.cardExample}>{hook.example}</pre>
              <div className={styles.cardWhen}>
                <span className={styles.whenLabel}>Use when:</span>
                <span>{hook.when}</span>
              </div>
            </Link>
          </motion.div>
        ))}
      </motion.div>

      {/* Footer note */}
      <motion.p
        className={styles.footer}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
      >
        Built with React 18 · TypeScript · Framer Motion · Vite
      </motion.p>
    </div>
  );
}
