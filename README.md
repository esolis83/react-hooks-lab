# { hooks lab }

An interactive visual reference for React hooks — built for people who learn by *seeing*.

Click a button in the live demo and watch the exact lines of code light up, step by step, with annotations explaining what's happening and why.

## Live demo

**https://enriquesolis.me/hooks-lab/**

## What's inside

| Page | Hook | Demo |
|------|------|------|
| useState | `useState` | Animated counter with render tracking |
| useEffect | `useEffect` | Data loader with lifecycle log and timeline |
| useRef | `useRef` | DOM focus + silent ref vs re-rendering state |
| useMemo + useCallback | `useMemo` / `useCallback` | Sort performance toggle with cache-hit counter |
| Comparison | All hooks | Decision tree + deep-dive cards + quick-reference table |

## Tech stack

- **React 18** + **TypeScript** — strict mode
- **Vite 5** — dev server and production build
- **Framer Motion** — page transitions and animated highlights
- **React Router v6** — hash-based routing for static hosting
- **CSS Modules** — scoped styles, zero external CSS framework

## Local development

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build → dist/
npm run lint       # ESLint
```

## Deployment

Pushes to `main` trigger a GitHub Actions workflow that:
1. Installs dependencies and runs `npm run build`
2. FTP-uploads `dist/` to `public_html/hooks-lab/` on Hostinger

Secrets required in your GitHub repo settings:
- `FTP_SERVER`
- `FTP_USERNAME`
- `FTP_PASSWORD`
- `FTP_REMOTE_PATH`

---

Built by [Enrique Solis](https://enriquesolis.me)
