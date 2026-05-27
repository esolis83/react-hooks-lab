import type { CSSProperties } from 'react';
import { motion } from 'framer-motion';
import styles from './LifetimeLine.module.css';

export type LifeEvent =
  | 'mount'
  | 'effect'
  | 'update'
  | 'cleanup'
  | 'unmount';

interface LifetimeEvent {
  id: string;
  type: LifeEvent;
  label: string;
}

interface LifetimeLineProps {
  events: LifetimeEvent[];
  activeId?: string;
}

const EVENT_COLORS: Record<LifeEvent, string> = {
  mount:   '#4ade80',
  effect:  '#a78bfa',
  update:  '#38bdf8',
  cleanup: '#f87171',
  unmount: '#94a3b8',
};

const EVENT_ICONS: Record<LifeEvent, string> = {
  mount:   '▶',
  effect:  '⚡',
  update:  '↻',
  cleanup: '✕',
  unmount: '■',
};

export default function LifetimeLine({ events, activeId }: LifetimeLineProps) {
  return (
    <div className={styles.root}>
      <span className={styles.label}>Lifecycle</span>
      <div className={styles.track}>
        {events.map((evt, i) => {
          const color = EVENT_COLORS[evt.type];
          const isActive = evt.id === activeId;
          return (
            <div key={evt.id} className={styles.evtWrap}>
              <motion.div
                className={`${styles.node} ${isActive ? styles.nodeActive : ''}`}
                style={{ '--evt-color': color } as CSSProperties}
                animate={
                  isActive
                    ? { scale: 1.15, boxShadow: `0 0 14px ${color}60` }
                    : { scale: 1,    boxShadow: 'none' }
                }
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              >
                <span className={styles.icon} aria-hidden="true">
                  {EVENT_ICONS[evt.type]}
                </span>
              </motion.div>
              <span
                className={`${styles.evtLabel} ${isActive ? styles.evtLabelActive : ''}`}
                style={isActive ? { color } : undefined}
              >
                {evt.label}
              </span>
              {i < events.length - 1 && (
                <div className={styles.connector} aria-hidden="true" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
