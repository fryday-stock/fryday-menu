/** منطق السلة الصافي (بدون متصفح) — يستخدمه المتصفح والسيرفر */
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
  return { itemId: l.item.id, name: l.item.name, qty: l.qty, unit: l.unit, inline, bullets, note: l.note || undefined };
}
