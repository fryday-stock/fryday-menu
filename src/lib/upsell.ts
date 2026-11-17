/** زيادة قيمة الطلب: "حوّل لوجبة؟"، "تكمّل طلبك؟"، "اطلب نفس طلبك السابق" — منطق صافي قابل للاختبار */
import type { Item, MenuData, OptionGroup } from '../data/types';
import { defaultSelection, itemGroups, unitPrice, validateSelection, type Selection } from './price';
import type { CartLine } from '../store/cartCore';

/** يطلع سؤال "تحوّله لوجبة؟" إذا الصنف بيه مجموعة الوجبة والزبون ما اختارها */
export function mealOffer(item: Item, sel: Selection, menu: Pick<MenuData, 'groups' | 'settings'>): { group: OptionGroup; optionId: string; price: number; label: string } | null {
  const cfg = menu.settings.upsell.meal;
  if (!cfg.enabled || !item.groups.includes(cfg.group)) return null;
  const g = menu.groups[cfg.group];
  const opt = g?.options[0];
  if (!g || !opt) return null;
  if ((sel[g.code] ?? []).length) return null; // اختارها أصلاً
  return { group: g, optionId: opt.id, price: opt.price, label: opt.name.replace(/^وجبة\s*/, '').replace(/^\(|\)$/g, '') };
}

export interface Suggestion {
  kind: 'drink' | 'sweet' | 'sauce';
  /** صنف يضاف مباشرة (drink/sweet) */
  item?: Item;
  /** للصلصة: سطر المقالي بالسلة اللي نضيفلها صلصة */
  lineKey?: string;
  lineName?: string;
  group?: OptionGroup;
}

/** يحتاج يفتح صفحة الصنف (عنده خيارات إجبارية بدون اختيار افتراضي) */
export const needsOptions = (item: Item, groups: Record<string, OptionGroup>) =>
  !validateSelection(item, groups, defaultSelection(item, groups)).ok;

/** اقتراحات السلة حسب محتواها: ماكو مشروب ← مشروبات، أكل بدون حلو ← حلويات، مقالي ← صلصة إضافية */
export function cartSuggestions(lines: (CartLine & { item: Item })[], menu: Pick<MenuData, 'items' | 'groups' | 'settings'>, max = 5): Suggestion[] {
  const cfg = menu.settings.upsell.cart;
  if (!cfg.enabled || !lines.length) return [];
  const byId = new Map(menu.items.map((i) => [i.id, i]));
  const inCart = new Set(lines.map((l) => l.itemId));
  const ok = (id: string) => { const i = byId.get(id); return i && i.available && i.orderable && !inCart.has(id) ? i : null; };
  const out: Suggestion[] = [];
  const hasDrink = lines.some((l) => l.item.tab === 'drinks');
  const hasFood = lines.some((l) => l.item.tab === 'food');
  const hasSweet = lines.some((l) => l.item.tab === 'sweets');

  // مقالي بدون صلصة إضافية
  const sauce = menu.groups[cfg.sauceGroup];
  if (sauce) {
    const fries = lines.find((l) => l.item.groups.includes(sauce.code) && !(l.sel[sauce.code] ?? []).length);
    if (fries) out.push({ kind: 'sauce', lineKey: fries.key, lineName: fries.item.name, group: sauce });
  }
  if (!hasDrink) for (const id of cfg.drinks) { const i = ok(id); if (i) out.push({ kind: 'drink', item: i }); if (out.filter((x) => x.kind === 'drink').length >= 2) break; }
  if (hasFood && !hasSweet) for (const id of cfg.sweets) { const i = ok(id); if (i) out.push({ kind: 'sweet', item: i }); if (out.filter((x) => x.kind === 'sweet').length >= 2) break; }
  // نكمّل لحد 3 إذا قليلة
  if (out.length < 3) {
    for (const id of [...cfg.drinks, ...cfg.sweets]) {
      if (out.length >= 3) break;
      const i = ok(id);
      if (i && !out.some((x) => x.item?.id === id) && !(i.tab === 'drinks' && hasDrink) && !(i.tab === 'sweets' && hasSweet)) out.push({ kind: i.tab === 'drinks' ? 'drink' : 'sweet', item: i });
    }
  }
  return out.slice(0, max);
}

/** الطلب السابق المحفوظ على جهاز الزبون */
export interface PastOrder {
  lines: { itemId: string; qty: number; sel: Selection; note: string; unit: number; name: string }[];
  total: number;
  at: number;
}

export interface ReorderResult {
  add: { itemId: string; qty: number; sel: Selection; note: string }[];
  skipped: string[];
  priceChanged: { name: string; from: number; to: number }[];
}

/** يرجّع نفس السلة: يتجاهل الخالص أو المحذوف، ويوضح اللي تغير سعره */
export function rebuildOrder(past: PastOrder, menu: Pick<MenuData, 'items' | 'groups'>): ReorderResult {
  const byId = new Map(menu.items.map((i) => [i.id, i]));
  const res: ReorderResult = { add: [], skipped: [], priceChanged: [] };
  for (const l of past.lines) {
    const item = byId.get(l.itemId);
    if (!item || !item.available || !item.orderable) { res.skipped.push(l.name); continue; }
    // ننظف الاختيارات من الخيارات اللي انحذفت
    const sel: Selection = {};
    for (const g of itemGroups(item, menu.groups)) sel[g.code] = (l.sel[g.code] ?? []).filter((id) => g.options.some((o) => o.id === id));
    if (!validateSelection(item, menu.groups, sel).ok) { res.skipped.push(l.name); continue; }
    const now = unitPrice(item, menu.groups, sel);
    if (now !== l.unit) res.priceChanged.push({ name: item.name, from: l.unit, to: now });
    res.add.push({ itemId: item.id, qty: l.qty, sel, note: l.note });
  }
  return res;
}
