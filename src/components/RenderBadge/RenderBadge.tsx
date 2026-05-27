import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './RenderBadge.module.css';

interface RenderBadgeProps {
  count: number;
  label?: string;
}

/**
 * Shows the render count with a pulse animation every time it increments.
 */
export default function RenderBadge({ count, label = 'renders' }: RenderBadgeProps) {
  const prevCount = useRef(count);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    if (count !== prevCount.current) {
      prevCount.current = count;
      setPulse(true);
      const t = setTimeout(() => setPulse(false), 500);
      return () => clearTimeout(t);
    }
  }, [count]);

  return (
    <div className={`${styles.badge} ${pulse ? styles.pulse : ''}`}>
      <AnimatePresence mode="popLayout">
        <motion.span
          key={count}
          className={styles.number}
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 10, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 25 }}
        >
          {count}
        </motion.span>
      </AnimatePresence>
      <span className={styles.label}>{label}</span>
    </div>
  );
}
