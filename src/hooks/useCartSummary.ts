import { useMemo } from 'react';
import { useMenu } from '../data/MenuContext';
import { resolveLines, useCart } from '../store/cart';

export function useCartSummary() {
  const { data, byId } = useMenu();
  const lines = useCart((s) => s.lines);
  const bump = useCart((s) => s.bump);
  return useMemo(() => {
    const resolved = resolveLines(lines, data, byId);
    const count = resolved.reduce((a, l) => a + l.qty, 0);
    const subtotal = resolved.reduce((a, l) => a + l.total, 0);
    return { lines: resolved, count, subtotal, bump };
  }, [lines, data, byId, bump]);
}
