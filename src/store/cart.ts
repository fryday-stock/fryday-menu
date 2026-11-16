import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Selection } from '../lib/price';
import type { CartLine } from './cartCore';
export * from './cartCore';


interface CartState {
  lines: CartLine[];
  /** آخر مرة انضاف شي (للحركة) */
  bump: number;
  add: (itemId: string, sel: Selection, qty: number, note: string) => void;
  setQty: (key: string, qty: number) => void;
  remove: (key: string) => void;
  clear: () => void;
}

const lineKey = (itemId: string, sel: Selection, note: string) =>
  `${itemId}|${Object.keys(sel).sort().map((k) => `${k}:${[...(sel[k] ?? [])].sort().join('+')}`).join(';')}|${note.trim()}`;

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      bump: 0,
      add: (itemId, sel, qty, note) =>
        set((s) => {
          const key = lineKey(itemId, sel, note);
          const existing = s.lines.find((l) => l.key === key);
          const lines = existing
            ? s.lines.map((l) => (l.key === key ? { ...l, qty: Math.min(99, l.qty + qty) } : l))
            : [...s.lines, { key, itemId, qty, sel, note: note.trim() }];
          return { lines, bump: Date.now() };
        }),
      setQty: (key, qty) =>
        set((s) => ({ lines: qty <= 0 ? s.lines.filter((l) => l.key !== key) : s.lines.map((l) => (l.key === key ? { ...l, qty: Math.min(99, qty) } : l)) })),
      remove: (key) => set((s) => ({ lines: s.lines.filter((l) => l.key !== key) })),
      clear: () => set({ lines: [] }),
    }),
    { name: 'fryday:cart', version: 1, partialize: (s) => ({ lines: s.lines }) },
  ),
);

