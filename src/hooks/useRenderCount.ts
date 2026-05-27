import { useRef } from 'react';

/**
 * Counts how many times the component has rendered.
 *
 * Uses only a ref — no setState — so the counter itself never
 * causes an extra render.  The value is always current because
 * the component re-renders for its own reasons anyway.
 */
export function useRenderCount(): number {
  const countRef = useRef(0);
  countRef.current += 1;
  return countRef.current;
}
