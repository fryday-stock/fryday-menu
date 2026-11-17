import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Selection } from '../lib/price';
import type { CartLine } from './cartCore';
export * from './cartCore';


interface CartState {
  lines: CartLine[];
  /** آخر مرة انضاف شي (للحركة) */
  bump: number;
  /** يرجع مفتاح السطر */
  add: (itemId: string, sel: Selection, qty: number, note: string) => string;
  /** يغير اختيارات سطر (مثل "حوّل لوجبة" بعد الإضافة) — يدمجه إذا صار مطابق لسطر ثاني */
  updateSel: (key: string, sel: Selection) => void;
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
      add: (itemId, sel, qty, note) => {
        const key = lineKey(itemId, sel, note);
        set((s) => {
          const existing = s.lines.find((l) => l.key === key);
          const lines = existing
            ? s.lines.map((l) => (l.key === key ? { ...l, qty: Math.min(99, l.qty + qty) } : l))
            : [...s.lines, { key, itemId, qty, sel, note: note.trim() }];
          return { lines, bump: Date.now() };
        });
        return key;
      },
      updateSel: (key, sel) =>
        set((s) => {
          const line = s.lines.find((l) => l.key === key);
          if (!line) return s;
          const nk = lineKey(line.itemId, sel, line.note);
          const twin = s.lines.find((l) => l.key === nk && l.key !== key);
          const lines = twin
            ? s.lines.filter((l) => l.key !== key).map((l) => (l.key === nk ? { ...l, qty: Math.min(99, l.qty + line.qty) } : l))
            : s.lines.map((l) => (l.key === key ? { ...l, key: nk, sel } : l));
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

