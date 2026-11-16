/**
 * يحوّل assets-input/menu.xlsx إلى src/data/menu.json
 * ويفك assets-input/photos.zip إلى public/photos/ (+ نسخ صغيرة public/photos/sm/ للقوائم).
 *
 * التشغيل:  npm run import-menu
 */
import ExcelJS from 'exceljs';
import AdmZip from 'adm-zip';
import sharp from 'sharp';
import { mkdirSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join, basename, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { MenuData, Item, OptionGroup, TabId, Zone, Settings } from '../src/data/types';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const XLSX = join(ROOT, 'assets-input/menu.xlsx');
const ZIP = join(ROOT, 'assets-input/photos.zip');
const OUT_JSON = join(ROOT, 'src/data/menu.json');
const PHOTOS = join(ROOT, 'public/photos');
const THUMBS = join(PHOTOS, 'sm');

const TAB_MAP: Record<string, TabId> = { 'الأكل': 'food', 'المشروبات': 'drinks', 'الحلويات': 'sweets' };
const TAB_NAMES: Record<TabId, string> = { food: 'الأكل', drinks: 'المشروبات', sweets: 'الحلويات' };

function text(v: ExcelJS.CellValue): string {
  if (v == null) return '';
  if (typeof v === 'object') {
    if ('richText' in v) return v.richText.map((r) => r.text).join('').trim();
    if ('result' in v) return String(v.result ?? '').trim();
    if ('text' in v) return String(v.text).trim();
  }
  return String(v).trim();
}

function num(v: ExcelJS.CellValue): number | null {
  const s = text(v).replace(/[,،\s]/g, '');
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function sheetRows(ws: ExcelJS.Worksheet): ExcelJS.CellValue[][] {
  const rows: ExcelJS.CellValue[][] = [];
  ws.eachRow({ includeEmpty: false }, (row) => {
    const vals = row.values as ExcelJS.CellValue[];
    rows.push(vals.slice(1)); // exceljs rows are 1-indexed
  });
  return rows;
}

/** "إجباري — واحد" / "اختياري — متعدد" / "إجباري — 3 بالضبط" → قواعد الاختيار */
function parseGroupType(t: string): Pick<OptionGroup, 'min' | 'max' | 'kind'> {
  const required = t.includes('إجباري');
  const exact = t.match(/(\d+)\s*بالضبط/);
  if (exact) {
    const n = Number(exact[1]);
    return { kind: 'multi', min: n, max: n };
  }
  if (t.includes('متعدد')) return { kind: 'multi', min: required ? 1 : 0, max: 99 };
  return { kind: 'single', min: required ? 1 : 0, max: 1 };
}

async function main() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(XLSX);
  const warnings: string[] = [];

  // ───── الخيارات ─────
  const groups: Record<string, OptionGroup> = {};
  const wsOpt = wb.getWorksheet('الخيارات');
  if (!wsOpt) throw new Error('ورقة "الخيارات" مفقودة');
  for (const r of sheetRows(wsOpt).slice(1)) {
    const code = text(r[0]);
    if (!code) continue;
    const name = text(r[1]);
    const type = text(r[2]);
    const opt = text(r[3]);
    const delta = num(r[4]) ?? 0;
    if (!groups[code]) {
      groups[code] = { code, name, ...parseGroupType(type), isSize: name.includes('الحجم'), options: [] };
    }
    const g = groups[code];
    g.options.push({ id: `${code}-${g.options.length + 1}`, name: opt, price: delta });
  }

  // ───── المنيو ─────
  const wsMenu = wb.getWorksheet('المنيو');
  if (!wsMenu) throw new Error('ورقة "المنيو" مفقودة');
  const items: Item[] = [];
  const sectionsByTab: Record<TabId, string[]> = { food: [], drinks: [], sweets: [] };
  const photoFiles = new Set<string>();

  for (const r of sheetRows(wsMenu).slice(1)) {
    const id = text(r[0]);
    if (!/^[A-Z]\d{3}$/.test(id)) continue; // يتجاهل سطور الدليل
    const tabName = text(r[1]);
    const tab = TAB_MAP[tabName];
    if (!tab) { warnings.push(`${id}: تبويب غير معروف "${tabName}"`); continue; }
    const section = text(r[2]);
    if (!sectionsByTab[tab].includes(section)) sectionsByTab[tab].push(section);

    const rawPrice = text(r[6]);
    const price = num(r[6]);
    const orderable = price != null; // "حسب الطلب" → غير قابل للطلب أونلاين
    if (!orderable && !rawPrice.includes('حسب')) warnings.push(`${id}: سعر غير مفهوم "${rawPrice}"`);

    const groupCodes = text(r[7]).split(/[,،]/).map((s) => s.trim()).filter(Boolean);
    for (const c of groupCodes) if (!groups[c]) warnings.push(`${id}: مجموعة خيارات غير موجودة "${c}"`);

    const img = text(r[8]);
    const image = img && img !== '—' && img !== '-' ? img : null;
    if (image) photoFiles.add(image);

    let desc = text(r[5]) || null;
    if (!orderable && desc?.includes('حسب الطلب')) desc = null;

    items.push({
      id,
      tab,
      section,
      name: text(r[3]),
      nameEn: text(r[4]) || null,
      desc,
      price,
      orderable,
      groups: groupCodes.filter((c) => groups[c]),
      image,
      available: text(r[9]) !== 'لا',
    });
  }

  // ───── مناطق التوصيل ─────
  const zones: Zone[] = [];
  const wsZ = wb.getWorksheet('مناطق التوصيل');
  if (wsZ) {
    for (const r of sheetRows(wsZ).slice(1)) {
      const name = text(r[0]);
      const fee = num(r[1]);
      if (name && fee != null) zones.push({ id: `z${zones.length + 1}`, name, fee });
    }
  }

  // ───── الإعدادات ─────
  const kv: Record<string, string> = {};
  const wsS = wb.getWorksheet('الإعدادات');
  if (wsS) for (const r of sheetRows(wsS).slice(1)) kv[text(r[0])] = text(r[1]);

  const waRaw = kv['رقم الواتساب لاستلام الطلبات'] ?? '';
  const whatsapp = waRaw.match(/wa\.me\/(\d+)/)?.[1] ?? '9647715796059';
  const phones = (kv['رقم الاتصال'] ?? '7320 — 07893000406').split(/[—\-–,،]/).map((s) => s.trim()).filter(Boolean);
  const [instagram, tiktok, facebook] = (kv['انستغرام / تيك توك / فيسبوك'] ?? '').split('/').map((s) => s.trim());

  const settings: Settings = {
    restaurantName: 'فرايدي',
    restaurantNameEn: 'FRY DAY',
    tagline: 'Fries & Pastry',
    whatsapp,
    phones,
    callPhone: phones.find((p) => p.startsWith('07')) ?? phones[0],
    address: kv['العنوان'] || 'النجف — شارع الغدير، مجاور جسر المشاة',
    hours: { open: '12:00', close: '24:00', utcOffset: 3 },
    closedMessage: 'نستقبل الطلبات من الساعة 12 الظهر',
    deliveryNote: 'التوصيل داخل النجف والكوفة فقط',
    minOrder: { enabled: false, amount: 0 },
    freeDelivery: { enabled: false, threshold: 0 },
    payment: kv['طريقة الدفع'] || 'كاش عند الاستلام',
    etaMinutes: 45,
    social: { instagram: instagram || 'fryday.iq', tiktok: tiktok || 'fryday.iq', facebook: facebook || 'fryday' },
  };

  const data: MenuData = {
    generatedAt: new Date().toISOString(),
    tabs: (['food', 'drinks', 'sweets'] as TabId[]).map((t) => ({
      id: t,
      name: TAB_NAMES[t],
      sections: sectionsByTab[t].map((name, i) => ({ id: `${t}-${i + 1}`, name })),
    })),
    items,
    groups,
    zones,
    settings,
  };

  mkdirSync(dirname(OUT_JSON), { recursive: true });
  writeFileSync(OUT_JSON, JSON.stringify(data, null, 1) + '\n');

  // ───── الصور ─────
  mkdirSync(THUMBS, { recursive: true });
  const zip = new AdmZip(ZIP);
  let extracted = 0;
  for (const e of zip.getEntries()) {
    if (e.isDirectory) continue;
    const name = basename(e.entryName);
    if (!/^[a-z0-9-]+\.webp$/i.test(name)) continue; // أسماء آمنة فقط
    const buf = e.getData();
    writeFileSync(join(PHOTOS, name), buf);
    // نسخة صغيرة للقوائم (نت ضعيف)
    await sharp(buf).resize({ width: 360, height: 360, fit: 'inside', withoutEnlargement: true }).webp({ quality: 74, alphaQuality: 80 }).toFile(join(THUMBS, name));
    extracted++;
  }
  const have = new Set(readdirSync(PHOTOS));
  for (const f of photoFiles) if (!have.has(f)) warnings.push(`صورة مفقودة: ${f}`);

  const noImg = items.filter((i) => !i.image).length;
  console.log(`✔ ${items.length} صنف (أكل ${items.filter((i) => i.tab === 'food').length} / مشروبات ${items.filter((i) => i.tab === 'drinks').length} / حلويات ${items.filter((i) => i.tab === 'sweets').length})`);
  console.log(`✔ ${Object.keys(groups).length} مجموعة خيارات، ${zones.length} مناطق، ${noImg} صنف بدون صورة، ${items.filter((i) => !i.orderable).length} غير قابل للطلب أونلاين`);
  console.log(`✔ ${extracted} صورة → public/photos (+ نسخ صغيرة)`);
  if (warnings.length) console.warn('⚠ تنبيهات:\n  ' + warnings.join('\n  '));
  if (!existsSync(OUT_JSON)) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
