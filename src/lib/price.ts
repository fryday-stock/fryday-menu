import type { Item, OptionGroup } from '../data/types';

/** الاختيارات: كود المجموعة → أرقام الخيارات المختارة */
export type Selection = Record<string, string[]>;

export function itemGroups(item: Item, groups: Record<string, OptionGroup>): OptionGroup[] {
  return item.groups.map((c) => groups[c]).filter(Boolean);
}

/** الاختيار الافتراضي: المجموعات الإجبارية (واحد) تختار أول خيار تلقائياً */
export function defaultSelection(item: Item, groups: Record<string, OptionGroup>): Selection {
  const sel: Selection = {};
  for (const g of itemGroups(item, groups)) {
    sel[g.code] = g.kind === 'single' && g.min === 1 && g.options[0] ? [g.options[0].id] : [];
  }
  return sel;
}

/** يضغط على خيار: single يبدّل، multi يضيف/يشيل (بحدود max) */
export function toggleOption(group: OptionGroup, sel: Selection, optionId: string): Selection {
  const cur = sel[group.code] ?? [];
  let next: string[];
  if (group.kind === 'single') {
    if (cur[0] === optionId) next = group.min === 1 ? cur : []; // الإجباري ما ينشال
    else next = [optionId];
  } else if (cur.includes(optionId)) {
    next = cur.filter((x) => x !== optionId);
  } else {
    if (cur.length >= group.max) return sel; // وصل الحد
    next = [...cur, optionId];
  }
  return { ...sel, [group.code]: next };
}

export function selectedOptions(group: OptionGroup, sel: Selection) {
  const ids = sel[group.code] ?? [];
  return group.options.filter((o) => ids.includes(o.id));
}

/** سعر القطعة الوحدة مع الخيارات */
export function unitPrice(item: Item, groups: Record<string, OptionGroup>, sel: Selection): number {
  let p = item.price ?? 0;
  for (const g of itemGroups(item, groups)) for (const o of selectedOptions(g, sel)) p += o.price;
  return p;
}

export interface GroupStatus {
  group: OptionGroup;
  count: number;
  ok: boolean;
  /** نص الحالة: "إجباري" / "اختياري" / "اختار 3 (1/3)" */
  hint: string;
}

export function groupStatus(group: OptionGroup, sel: Selection): GroupStatus {
  const count = (sel[group.code] ?? []).length;
  const ok = count >= group.min && count <= group.max;
  let hint: string;
  if (group.kind === 'multi' && group.min > 0 && group.min === group.max) hint = `اختار ${group.min} (${count}/${group.min})`;
  else if (group.min > 0) hint = 'إجباري';
  else hint = group.kind === 'multi' ? 'اختياري — تگدر تختار أكثر من واحد' : 'اختياري';
  return { group, count, ok, hint };
}

export function validateSelection(item: Item, groups: Record<string, OptionGroup>, sel: Selection) {
  const statuses = itemGroups(item, groups).map((g) => groupStatus(g, sel));
  return { ok: statuses.every((s) => s.ok), statuses, firstMissing: statuses.find((s) => !s.ok)?.group.code ?? null };
}

/** سطر مختصر للخيارات (للسلة) */
export function selectionSummary(item: Item, groups: Record<string, OptionGroup>, sel: Selection): string {
  return itemGroups(item, groups)
    .flatMap((g) => selectedOptions(g, sel).map((o) => o.name))
    .join('، ');
}
