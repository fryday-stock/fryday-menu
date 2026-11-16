/**
 * تحويل المنيو من/إلى أوراق Excel بنفس شكل assets-input/menu.xlsx.
 * مشترك بين سكربت الاستيراد (exceljs) ولوحة الإدارة (read-excel-file / write-excel-file).
 */
import type { Item, OptionGroup, TabId } from '../data/types';

export const SHEET_MENU = 'المنيو';
export const SHEET_OPTIONS = 'الخيارات';
export const SHEET_ZONES = 'مناطق التوصيل';

export const TAB_MAP: Record<string, TabId> = { 'الأكل': 'food', 'المشروبات': 'drinks', 'الحلويات': 'sweets' };
export const TAB_NAMES: Record<TabId, string> = { food: 'الأكل', drinks: 'المشروبات', sweets: 'الحلويات' };

export const MENU_HEADERS = ['الكود', 'التبويب', 'القسم', 'الاسم عربي', 'الاسم إنكليزي', 'الوصف / المكونات', 'السعر (د.ع)', 'مجموعات الخيارات', 'ملف الصورة', 'متوفر', 'ملاحظة / تحقق'];
export const OPTION_HEADERS = ['كود المجموعة', 'اسم المجموعة', 'النوع', 'الخيار', 'فرق السعر (د.ع)'];
export const ZONE_HEADERS = ['المنطقة', 'أجرة التوصيل (د.ع)'];

/** أي خلية (exceljs أو read-excel-file) → نص */
export function cellText(v: unknown): string {
  if (v == null) return '';
  if (v instanceof Date) return v.toISOString();
  if (typeof v === 'object') {
    const o = v as Record<string, unknown>;
    if (Array.isArray(o.richText)) return (o.richText as { text: string }[]).map((r) => r.text).join('').trim();
    if ('result' in o) return String(o.result ?? '').trim();
    if ('text' in o) return String(o.text).trim();
  }
  return String(v).trim();
}

export function cellNum(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const s = cellText(v).replace(/[,،\s]/g, '').replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660));
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** "إجباري — واحد" / "اختياري — متعدد" / "إجباري — 3 بالضبط" → قواعد الاختيار */
export function parseGroupType(t: string): Pick<OptionGroup, 'min' | 'max' | 'kind'> {
  const required = t.includes('إجباري');
  const exact = t.match(/(\d+)\s*بالضبط/);
  if (exact) {
    const n = Number(exact[1]);
    return { kind: 'multi', min: n, max: n };
  }
  if (t.includes('متعدد')) return { kind: 'multi', min: required ? 1 : 0, max: 99 };
  return { kind: 'single', min: required ? 1 : 0, max: 1 };
}

export function groupTypeLabel(g: Pick<OptionGroup, 'min' | 'max' | 'kind'>): string {
  if (g.kind === 'multi' && g.min > 0 && g.min === g.max) return `إجباري — ${g.min} بالضبط`;
  if (g.kind === 'multi') return g.min > 0 ? 'إجباري — متعدد' : 'اختياري — متعدد';
  return g.min > 0 ? 'إجباري — واحد' : 'اختياري — واحد';
}

export interface ParsedMenu {
  sectionsByTab: Record<TabId, string[]>;
  items: Item[];
  groups: Record<string, OptionGroup>;
  zones: { name: string; fee: number }[];
  warnings: string[];
}

/** يقرا الأوراق (صفوف خام، أول صف = العناوين) */
export function parseMenuSheets(sheets: Record<string, unknown[][]>): ParsedMenu {
  const warnings: string[] = [];
  const groups: Record<string, OptionGroup> = {};

  const optRows = sheets[SHEET_OPTIONS];
  if (!optRows) warnings.push(`ورقة "${SHEET_OPTIONS}" مفقودة`);
  for (const r of (optRows ?? []).slice(1)) {
    const code = cellText(r[0]);
    if (!code) continue;
    const name = cellText(r[1]);
    const opt = cellText(r[3]);
    if (!opt) continue;
    if (!groups[code]) groups[code] = { code, name, ...parseGroupType(cellText(r[2])), isSize: name.includes('الحجم'), options: [] };
    const g = groups[code];
    g.options.push({ id: `${code}-${g.options.length + 1}`, name: opt, price: cellNum(r[4]) ?? 0 });
  }

  const menuRows = sheets[SHEET_MENU];
  if (!menuRows) throw new Error(`ورقة "${SHEET_MENU}" مفقودة`);
  const items: Item[] = [];
  const sectionsByTab: Record<TabId, string[]> = { food: [], drinks: [], sweets: [] };
  const seen = new Set<string>();
  let sort = 0;
  for (const r of menuRows.slice(1)) {
    const id = cellText(r[0]).toUpperCase();
    if (!/^[A-Z]\d{3,4}$/.test(id)) continue; // يتجاهل سطور الدليل
    if (seen.has(id)) { warnings.push(`${id}: الكود مكرر — انأخذ أول واحد بس`); continue; }
    seen.add(id);
    const tabName = cellText(r[1]);
    const tab = TAB_MAP[tabName];
    if (!tab) { warnings.push(`${id}: تبويب غير معروف "${tabName}"`); continue; }
    const section = cellText(r[2]) || 'بدون قسم';
    if (!sectionsByTab[tab].includes(section)) sectionsByTab[tab].push(section);
    const rawPrice = cellText(r[6]);
    const price = cellNum(r[6]);
    if (price == null && !rawPrice.includes('حسب')) warnings.push(`${id}: سعر غير مفهوم "${rawPrice}"`);
    const codes = cellText(r[7]).split(/[,،]/).map((x) => x.trim()).filter(Boolean);
    for (const c of codes) if (!groups[c]) warnings.push(`${id}: مجموعة خيارات غير موجودة "${c}"`);
    const img = cellText(r[8]);
    let desc = cellText(r[5]) || null;
    if (price == null && desc?.includes('حسب الطلب')) desc = null;
    const name = cellText(r[3]);
    if (!name) { warnings.push(`${id}: بدون اسم — انتجاهل`); continue; }
    items.push({
      id, tab, section, name,
      nameEn: cellText(r[4]) || null,
      desc,
      price,
      orderable: price != null,
      groups: codes.filter((c) => groups[c]),
      image: img && img !== '—' && img !== '-' ? img : null,
      available: cellText(r[9]) !== 'لا',
      sort: sort++,
    });
  }

  const zones: { name: string; fee: number }[] = [];
  for (const r of (sheets[SHEET_ZONES] ?? []).slice(1)) {
    const name = cellText(r[0]);
    const fee = cellNum(r[1]);
    if (name && fee != null) zones.push({ name, fee });
  }
  return { sectionsByTab, items, groups, zones, warnings };
}

/** المنيو → صفوف أوراق Excel (للتصدير) */
export function buildMenuSheets(data: { items: Item[]; groups: Record<string, OptionGroup>; zones: { name: string; fee: number }[] }) {
  const menu: (string | number | null)[][] = [MENU_HEADERS];
  for (const i of data.items) {
    menu.push([i.id, TAB_NAMES[i.tab], i.section, i.name, i.nameEn ?? '', i.desc ?? '', i.price ?? 'حسب الطلب', i.groups.join(','), i.image ?? '—', i.available ? 'نعم' : 'لا', '']);
  }
  const options: (string | number | null)[][] = [OPTION_HEADERS];
  for (const g of Object.values(data.groups)) for (const o of g.options) options.push([g.code, g.name, groupTypeLabel(g), o.name, o.price]);
  const zones: (string | number | null)[][] = [ZONE_HEADERS, ...data.zones.map((z) => [z.name, z.fee])];
  return { [SHEET_MENU]: menu, [SHEET_OPTIONS]: options, [SHEET_ZONES]: zones };
}
