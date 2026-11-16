import type { Item } from '../data/types';

/** تطبيع عربي: أ/إ/آ→ا، ة→ه، ى→ي، يشيل التشكيل والتطويل */
export function normalizeAr(s: string): string {
  return s
    .toLowerCase()
    .replace(/[ً-ٰٟـ]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/گ/g, 'ك')
    .replace(/[پ]/g, 'ب')
    .replace(/[چ]/g, 'ج')
    .replace(/\s+/g, ' ')
    .trim();
}

/** مرادفات شائعة → الكلمة الموجودة بالمنيو */
const SYNONYMS: [RegExp, string][] = [
  [/برغر|بيرغر|بيركر|burger/g, 'بركر'],
  [/بطاطس|fries/g, 'بطاطا'],
  [/كريسبي|crispy/g, 'كرسبي'],
  [/شاورمه|shawarma/g, 'شاورما'],
  [/قهوه|coffee/g, 'قهوه'],
  [/كيكه|cake/g, 'كيك'],
  [/ارز|رز/g, 'تمن'],
  [/دجاجه|chicken/g, 'دجاج'],
  [/عصائر|juice/g, 'عصير'],
];

export function normalizeQuery(q: string): string {
  let n = normalizeAr(q);
  for (const [re, to] of SYNONYMS) n = n.replace(re, to);
  return n;
}

function haystack(item: Item): string {
  return normalizeQuery([item.name, item.nameEn ?? '', item.section, item.desc ?? ''].join(' '));
}

const cache = new WeakMap<Item, string>();

export function searchItems(items: Item[], q: string): Item[] {
  const terms = normalizeQuery(q).split(' ').filter(Boolean);
  if (!terms.length) return [];
  return items.filter((it) => {
    let h = cache.get(it);
    if (!h) { h = haystack(it); cache.set(it, h); }
    return terms.every((t) => h!.includes(t));
  });
}
