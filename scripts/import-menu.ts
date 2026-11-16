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
import type { MenuData, TabId, Zone, Settings } from '../src/data/types';
import { DEFAULT_SETTINGS, ZONE_POLYGONS } from '../src/data/defaults';
import { parseMenuSheets, cellText, SHEET_MENU, SHEET_OPTIONS, SHEET_ZONES, TAB_NAMES } from '../src/lib/menuSheet';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const XLSX = join(ROOT, 'assets-input/menu.xlsx');
const ZIP = join(ROOT, 'assets-input/photos.zip');
const OUT_JSON = join(ROOT, 'src/data/menu.json');
const PHOTOS = join(ROOT, 'public/photos');
const THUMBS = join(PHOTOS, 'sm');

function sheetRows(ws: ExcelJS.Worksheet | undefined): unknown[][] {
  const rows: unknown[][] = [];
  ws?.eachRow({ includeEmpty: false }, (row) => rows.push((row.values as unknown[]).slice(1))); // exceljs 1-indexed
  return rows;
}

async function main() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(XLSX);
  const parsed = parseMenuSheets({
    [SHEET_MENU]: sheetRows(wb.getWorksheet(SHEET_MENU)),
    [SHEET_OPTIONS]: sheetRows(wb.getWorksheet(SHEET_OPTIONS)),
    [SHEET_ZONES]: sheetRows(wb.getWorksheet(SHEET_ZONES)),
  });
  const { items, groups, sectionsByTab, warnings } = parsed;
  const photoFiles = new Set(items.map((i) => i.image).filter((x): x is string => !!x));

  const zones: Zone[] = parsed.zones.map((z, i) => {
    const polygon = ZONE_POLYGONS[z.name];
    if (!polygon) warnings.push(`منطقة "${z.name}" بدون حدود مرسومة — ما راح تشتغل بالخريطة`);
    return { id: `z${i + 1}`, name: z.name, fee: z.fee, polygon: polygon ?? [] };
  });

  // ───── الإعدادات (اللي موجودة بالـ Excel، والباقي من defaults.ts) ─────
  const kv: Record<string, string> = {};
  for (const r of sheetRows(wb.getWorksheet('الإعدادات')).slice(1)) kv[cellText(r[0])] = cellText(r[1]);
  const waRaw = kv['رقم الواتساب لاستلام الطلبات'] ?? '';
  const phones = (kv['رقم الاتصال'] ?? '').split(/[—\-–,،]/).map((x) => x.trim()).filter(Boolean);
  const settings: Settings = {
    ...DEFAULT_SETTINGS,
    whatsapp: waRaw.match(/wa\.me\/(\d+)/)?.[1] ?? DEFAULT_SETTINGS.whatsapp,
    phones: phones.length ? phones : DEFAULT_SETTINGS.phones,
    callPhone: phones.find((p) => p.startsWith('07')) ?? DEFAULT_SETTINGS.callPhone,
    address: kv['العنوان'] || DEFAULT_SETTINGS.address,
    payment: kv['طريقة الدفع'] || DEFAULT_SETTINGS.payment,
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
