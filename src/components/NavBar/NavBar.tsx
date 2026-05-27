import { NavLink } from 'react-router-dom';
import styles from './NavBar.module.css';

const LINKS = [
  { to: '/use-state',   label: 'useState'   },
  { to: '/use-effect',  label: 'useEffect'  },
  { to: '/use-ref',     label: 'useRef'     },
  { to: '/use-memo',    label: 'useMemo'    },
  { to: '/use-context', label: 'useContext' },
  { to: '/use-reducer', label: 'useReducer' },
  { to: '/comparison',  label: 'Compare'    },
];

export default function NavBar() {
  return (
    <nav className={styles.nav}>
      <NavLink to="/" className={styles.logo}>
        <span className={styles.logoBrace}>{'{'}</span>
        <span className={styles.logoText}>hooks lab</span>
        <span className={styles.logoBrace}>{'}'}</span>
      </NavLink>

      <div className={styles.links}>
        {LINKS.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `${styles.link} ${isActive ? styles.linkActive : ''}`
            }
          >
            <code>{label}</code>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
