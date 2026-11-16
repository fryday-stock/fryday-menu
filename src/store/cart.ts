import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Item, MenuData } from '../data/types';
import { itemGroups, selectedOptions, unitPrice, type Selection } from '../lib/price';
import type { OrderLine } from '../lib/whatsapp';

export interface CartLine {
  key: string;
  itemId: string;
  qty: number;
  sel: Selection;
  note: string;
}

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

export interface ResolvedLine extends CartLine {
  item: Item;
  unit: number;
  total: number;
}

/** يربط سطور السلة بالمنيو (ويشيل الأصناف اللي انحذفت أو خلصت) */
export function resolveLines(lines: CartLine[], menu: MenuData, byId: Map<string, Item>): ResolvedLine[] {
  const out: ResolvedLine[] = [];
  for (const l of lines) {
    const item = byId.get(l.itemId);
    if (!item || !item.orderable || !item.available) continue;
    const unit = unitPrice(item, menu.groups, l.sel);
    out.push({ ...l, item, unit, total: unit * l.qty });
  }
  return out;
}

/** سطر السلة → سطر رسالة الواتساب */
export function toOrderLine(l: ResolvedLine, menu: MenuData): OrderLine {
  const inline: string[] = [];
  const bullets: OrderLine['bullets'] = [];
  for (const g of itemGroups(l.item, menu.groups)) {
    const opts = selectedOptions(g, l.sel);
    if (g.kind === 'single' && g.min === 1) opts.forEach((o) => inline.push(o.name));
    else opts.forEach((o) => bullets.push({ name: o.name, price: o.price }));
  }
  return { name: l.item.name, qty: l.qty, unit: l.unit, inline, bullets, note: l.note || undefined };
}
