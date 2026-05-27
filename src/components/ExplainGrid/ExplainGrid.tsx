import styles from './ExplainGrid.module.css';

export interface ExplainItem {
  title: string;
  color: string;
  body: string;
}

interface ExplainGridProps {
  items: ExplainItem[];
}

/**
 * Reusable explanation card grid used by every hook page.
 * Each card shows a titled concept block with a colour-coded heading.
 */
export default function ExplainGrid({ items }: ExplainGridProps) {
  return (
    <div className={styles.grid}>
      {items.map(item => (
        <div key={item.title} className={styles.card}>
          <h3 className={styles.title} style={{ color: item.color }}>
            {item.title}
          </h3>
          <pre className={styles.body}>{item.body}</pre>
        </div>
      ))}
    </div>
  );
}
