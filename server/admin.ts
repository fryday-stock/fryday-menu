/** واجهة لوحة الإدارة: /api/admin/* (كلها تحتاج دخول، عدا login و me) */
import type { Env } from './env';
import type { Item, MenuData, OptionGroup, Settings, TabId, Zone } from '../src/data/types';
import { DEFAULT_SETTINGS, MAP_PRESETS, mergeSettings } from '../src/data/defaults';
import { HttpError, json, readJson } from './http';
import { checkOrigin, isAdmin, isConfigured, login, logout } from './auth';
import { ensureReady, getSettings, groupStatements, itemStatements, loadMenu, sectionStatements, zoneStatements } from './db';
import { baghdadDay, nextSixAmBaghdad } from './time';

const TABS: TabId[] = ['food', 'drinks', 'sweets'];
const ITEM_ID = /^[A-Z]\d{3,4}$/;
const isStr = (v: unknown, min: number, max: number): v is string => typeof v === 'string' && v.trim().length >= min && v.length <= max;
const isInt = (v: unknown, min: number, max: number): v is number => typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;
const bad = (msg: string) => new HttpError(400, 'invalid', msg);

/** صورة: اسم ملف من public/photos أو مسار /media/ (R2) */
function validImage(v: unknown): string | null {
  if (v == null || v === '') return null;
  if (typeof v === 'string' && (/^[a-z0-9-]+\.webp$/i.test(v) || /^\/media\/[\w/.-]{3,200}$/.test(v))) return v;
  throw bad('مسار الصورة غير صالح');
}

/** صورة أو فيديو: اسم ملف صورة صنف أو مسار /media/ */
function validMedia(v: unknown): string {
  if (typeof v === 'string' && (/^[a-z0-9-]+\.webp$/i.test(v) || /^\/media\/[\w/.-]{3,200}$/.test(v))) return v;
  throw bad('مسار الملف غير صالح');
}

function validItem(raw: unknown, groups: Record<string, OptionGroup>): Item {
  const i = raw as Record<string, unknown>;
  if (!isStr(i.id, 4, 5) || !ITEM_ID.test(i.id)) throw bad('الكود لازم حرف وأرقام (مثل F078)');
  if (!TABS.includes(i.tab as TabId)) throw bad('التبويب غير صحيح');
  if (!isStr(i.section, 1, 40)) throw bad('اكتب اسم القسم');
  if (!isStr(i.name, 1, 60)) throw bad('اكتب اسم الصنف');
  if (i.price != null && !isInt(i.price, 0, 10_000_000)) throw bad('السعر لازم رقم صحيح');
  const gs = Array.isArray(i.groups) ? (i.groups as unknown[]).map(String) : [];
  for (const g of gs) if (!groups[g]) throw bad(`مجموعة الخيارات "${g}" مو موجودة`);
  return {
    id: i.id, tab: i.tab as TabId, section: (i.section as string).trim(), name: (i.name as string).trim(),
    nameEn: isStr(i.nameEn, 1, 60) ? i.nameEn.trim() : null,
    desc: isStr(i.desc, 1, 300) ? i.desc.trim() : null,
    price: i.price == null ? null : (i.price as number), orderable: i.price != null,
    groups: gs, image: validImage(i.image), available: i.available !== false,
    sort: isInt(i.sort, 0, 100_000) ? i.sort : 0,
  };
}

function validGroup(raw: unknown): OptionGroup {
  const g = raw as Record<string, unknown>;
  if (!isStr(g.code, 2, 30) || !/^[A-Z0-9_]+$/.test(g.code)) throw bad('كود المجموعة: حروف إنكليزية كبيرة وأرقام و _ بس');
  if (!isStr(g.name, 1, 40)) throw bad('اكتب اسم المجموعة');
  if (g.kind !== 'single' && g.kind !== 'multi') throw bad('نوع المجموعة غير صحيح');
  if (!isInt(g.min, 0, 20) || !isInt(g.max, 1, 99) || (g.min as number) > (g.max as number)) throw bad('عدد الاختيارات غير منطقي');
  if (!Array.isArray(g.options) || !g.options.length || g.options.length > 40) throw bad('لازم خيار واحد على الأقل');
  const options = (g.options as Record<string, unknown>[]).map((o, k) => {
    if (!isStr(o.name, 1, 60)) throw bad('اسم الخيار فاضي');
    if (!isInt(o.price, -1_000_000, 1_000_000)) throw bad('فرق السعر لازم رقم');
    return { id: isStr(o.id, 1, 40) ? o.id : `${g.code}-${k + 1}`, name: o.name.trim(), price: o.price };
  });
  if (g.kind === 'single' && g.max !== 1) throw bad('اختيار واحد يعني الحد الأعلى 1');
  return { code: g.code, name: (g.name as string).trim(), kind: g.kind, min: g.min as number, max: g.max as number, isSize: !!g.isSize, options };
}

function validZone(raw: unknown, k: number): Zone {
  const z = raw as Record<string, unknown>;
  if (!isStr(z.name, 1, 40)) throw bad('اكتب اسم المنطقة');
  if (!isInt(z.fee, 0, 1_000_000)) throw bad('الأجرة لازم رقم');
  const poly = Array.isArray(z.polygon) ? (z.polygon as unknown[]) : [];
  if (poly.length > 200) throw bad('نقاط الحدود هواية');
  const polygon = poly.map((p) => {
    const [lat, lng] = Array.isArray(p) ? (p as number[]) : [];
    if (!(typeof lat === 'number' && typeof lng === 'number' && Math.abs(lat) <= 90 && Math.abs(lng) <= 180)) throw bad('نقطة حدود غير صحيحة');
    return [Math.round(lat * 1e6) / 1e6, Math.round(lng * 1e6) / 1e6] as [number, number];
  });
  return { id: isStr(z.id, 1, 20) ? z.id : `z${k + 1}`, name: z.name.trim(), fee: z.fee as number, polygon };
}

/** الإعدادات: ندمج فوق الافتراضية ونتأكد من الأنواع الأساسية */
function validSettings(raw: unknown): Settings {
  const s = mergeSettings(DEFAULT_SETTINGS, raw);
  if (!/^\d{10,15}$/.test(String(s.whatsapp))) throw bad('رقم الواتساب لازم أرقام دولية بدون + (مثل 9647701234567)');
  if (!/^\d{1,2}:\d{2}$/.test(s.hours.open) || !/^\d{1,2}:\d{2}$/.test(s.hours.close)) throw bad('الدوام بصيغة 12:00');
  for (const [k, v] of [['etaMinutes', s.etaMinutes], ['pickupMinutes', s.pickupMinutes], ['busy.deliveryMinutes', s.busy.deliveryMinutes], ['busy.pickupMinutes', s.busy.pickupMinutes]] as const)
    if (!isInt(v, 1, 600)) throw bad(`${k}: لازم دقائق بين 1 و 600`);
  if (!['map', 'fixed', 'cashier'].includes(s.delivery.feeMode)) throw bad('طريقة الأجرة غير صحيحة');
  if (!isInt(s.delivery.fixedFee, 0, 1_000_000)) throw bad('الأجرة الثابتة لازم رقم');
  if (!/^https:\/\/[^\s"'<>]+\{z\}[^\s"'<>]*\{x\}[^\s"'<>]*\{y\}/.test(s.map.tileUrl)) throw bad('رابط بلاطات الخريطة لازم https ويحتوي {z} {x} {y}');
  if (!isInt(s.map.maxZoom, 10, 22)) throw bad('أقصى تقريب للخريطة بين 10 و 22');
  validImage(s.hero.image);
  if (s.mascot.image) validImage(s.mascot.image);
  const b = s.banner;
  if (!Array.isArray(b.slides) || b.slides.length > 40) throw bad('شرائح البانر هواية (40 حد أقصى)');
  for (const sl of b.slides) {
    if (!['lunch', 'afternoon', 'evening', 'hot', 'cold', 'season', 'any'].includes(sl.slot)) throw bad('وقت الشريحة غير صحيح');
    if (!['image', 'video'].includes(sl.media?.type)) throw bad('نوع ملف الشريحة غير صحيح');
    validMedia(sl.media.src);
    if (sl.media.poster) validMedia(sl.media.poster);
    if (typeof sl.title !== 'string' || sl.title.length > 60) throw bad('عنوان الشريحة طويل (60 حرف حد أقصى)');
  }
  if (!isInt(b.intervalSec, 3, 30)) throw bad('مدة الشريحة بين 3 و 30 ثانية');
  for (const d of Object.values(b.dayparts)) if (!/^\d{1,2}:\d{2}$/.test(d.from) || !/^\d{1,2}:\d{2}$/.test(d.to)) throw bad('أوقات البانر بصيغة 12:00');
  if (s.season.until && !/^\d{4}-\d{2}-\d{2}$/.test(s.season.until)) throw bad('تاريخ انتهاء الموسم غير صحيح');
  if (s.season.hours.enabled && (!/^\d{1,2}:\d{2}$/.test(s.season.hours.open) || !/^\d{1,2}:\d{2}$/.test(s.season.hours.close))) throw bad('أوقات الموسم بصيغة 17:00');
  if (!Array.isArray(s.hero.media) || s.hero.media.length > 10) throw bad('محتوى الرأس غير صحيح');
  if (!(Math.abs(s.location.lat) <= 90 && Math.abs(s.location.lng) <= 180)) throw bad('موقع المطعم غير صحيح');
  return s;
}

const toB64 = (buf: ArrayBuffer) => {
  const u = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000));
  return btoa(s);
};

/** رفع صورة: على R2 إذا مربوط، وإلا بقاعدة البيانات D1 (حتى ما نحتاج بطاقة دفع لتفعيل R2) */
const CHUNK = 700_000; // حروف base64 بكل جزء

/**
 * رفع ملف: صورة WebP (≤150KB + نسخة صغيرة) أو فيديو MP4 (≤1.5MB) أو صورة غلاف للفيديو.
 * على R2 إذا مربوط، وإلا بقاعدة البيانات D1 (الكبير ينقسم أجزاء).
 */
async function upload(req: Request, env: Env) {
  const form = await req.formData();
  const file = form.get('file');
  const thumb = form.get('thumb');
  if (!(file instanceof File)) throw bad('ماكو ملف');
  const isVideo = file.type === 'video/mp4';
  if (isVideo) {
    if (file.size > 1_600_000) throw bad('الفيديو لازم أقل من 1.5MB');
  } else {
    if (file.type !== 'image/webp') throw bad('الصورة لازم WebP (اللوحة تحولها تلقائياً)');
    if (file.size > 400_000 || (thumb instanceof File && thumb.size > 150_000)) throw bad('الصورة كبيرة — لازم تنضغط أول');
  }
  const id = crypto.randomUUID();
  const folder = isVideo ? 'video' : 'items';
  const ext = isVideo ? 'mp4' : 'webp';
  const key = `${folder}/${id}.${ext}`;
  const parts: [string, File][] = [[key, file]];
  if (thumb instanceof File && thumb.type === 'image/webp') parts.push([isVideo ? `video/${id}.webp` : `items/sm/${id}.webp`, thumb]);
  const now = new Date().toISOString();
  if (env.MEDIA) {
    for (const [k, f] of parts) await env.MEDIA.put(k, f.stream(), { httpMetadata: { contentType: f.type, cacheControl: 'public, max-age=31536000, immutable' } });
  } else {
    const stmts: D1PreparedStatement[] = [];
    for (const [k, f] of parts) {
      const b64 = toB64(await f.arrayBuffer());
      if (b64.length <= CHUNK) stmts.push(env.DB.prepare(`INSERT INTO media (key, content_type, data, created_at) VALUES (?,?,?,?)`).bind(k, f.type, b64, now));
      else {
        stmts.push(env.DB.prepare(`INSERT INTO media (key, content_type, data, created_at) VALUES (?,?,'',?)`).bind(k, f.type, now));
        for (let i = 0, n = 0; i < b64.length; i += CHUNK, n++) stmts.push(env.DB.prepare(`INSERT INTO media_chunks (key, idx, data) VALUES (?,?,?)`).bind(k, n, b64.slice(i, i + CHUNK)));
      }
    }
    // كل جزء بطلب منفصل حتى ما يكبر الـ batch هواية
    for (const st of stmts) await st.run();
  }
  return { url: `/media/${key}`, poster: isVideo && thumb instanceof File ? `/media/video/${id}.webp` : undefined };
}

export async function handleAdmin(req: Request, env: Env, path: string): Promise<Response> {
  const db = env.DB;
  if (!db) throw new HttpError(503, 'no_db', 'قاعدة البيانات (D1) بعدها ما مربوطة بإعدادات Cloudflare');
  await ensureReady(db);
  checkOrigin(req);
  const m = req.method;

  if (path === 'me' && m === 'GET') return json({ ok: true, configured: isConfigured(env), admin: await isAdmin(req, env), r2: true, storage: env.MEDIA ? 'r2' : 'd1' });
  if (path === 'login' && m === 'POST') {
    const { password } = await readJson<{ password: string }>(req, 2000);
    const cookie = await login(req, env, password);
    return json({ ok: true }, { headers: { 'set-cookie': cookie } });
  }
  if (path === 'logout' && m === 'POST') return json({ ok: true }, { headers: { 'set-cookie': await logout(req, env) } });

  if (!(await isAdmin(req, env))) throw new HttpError(401, 'auth', 'لازم تسجل دخول');

  // ───── المنيو ─────
  if (path === 'menu' && m === 'GET') return json(await loadMenu(db, { admin: true }));

  const itemMatch = path.match(/^items\/([A-Z]\d{3,4})(\/soldout)?$/);
  if (itemMatch) {
    const id = itemMatch[1];
    if (itemMatch[2] && m === 'POST') {
      const { on } = await readJson<{ on: boolean }>(req, 200);
      await db.prepare(`UPDATE items SET sold_out_until = ?, updated_at = ? WHERE id = ?`).bind(on ? nextSixAmBaghdad().toISOString() : null, new Date().toISOString(), id).run();
      return json({ ok: true, until: on ? nextSixAmBaghdad().toISOString() : null });
    }
    if (m === 'PUT') {
      const menu = await loadMenu(db, { admin: true });
      const item = validItem({ ...(await readJson(req)) as object, id }, menu.groups);
      const prev = menu.items.find((i) => i.id === id);
      if (!prev) item.sort = Math.max(0, ...menu.items.filter((i) => i.tab === item.tab && i.section === item.section).map((i) => (i.sort ?? 0) + 1));
      const stmts = itemStatements(db, [item]);
      if (!menu.tabs.find((t) => t.id === item.tab)!.sections.some((s) => s.name === item.section)) {
        stmts.push(db.prepare(`INSERT OR IGNORE INTO sections (tab, name, sort) VALUES (?,?,(SELECT COALESCE(MAX(sort),-1)+1 FROM sections WHERE tab = ?))`).bind(item.tab, item.section, item.tab));
      }
      await db.batch(stmts);
      return json({ ok: true, item });
    }
    if (m === 'DELETE') {
      await db.prepare(`DELETE FROM items WHERE id = ?`).bind(id).run();
      return json({ ok: true });
    }
  }

  if (path === 'items/order' && m === 'POST') {
    const { ids } = await readJson<{ ids: string[] }>(req);
    if (!Array.isArray(ids) || ids.some((x) => !ITEM_ID.test(String(x)))) throw bad('ترتيب غير صحيح');
    await db.batch(ids.map((id, k) => db.prepare(`UPDATE items SET sort = ? WHERE id = ?`).bind(k, id)));
    return json({ ok: true });
  }

  if (path === 'sections' && m === 'PUT') {
    const body = await readJson<{ sectionsByTab: Record<TabId, string[]>; rename?: { tab: TabId; from: string; to: string } }>(req);
    const sbt = {} as Record<TabId, string[]>;
    for (const t of TABS) {
      const list = Array.isArray(body.sectionsByTab?.[t]) ? body.sectionsByTab[t].map((x) => String(x).trim()).filter(Boolean) : [];
      if (list.some((x) => x.length > 40) || new Set(list).size !== list.length) throw bad('أسماء الأقسام غير صحيحة أو مكررة');
      sbt[t] = list;
    }
    const stmts = sectionStatements(db, sbt);
    const r = body.rename;
    if (r && TABS.includes(r.tab) && isStr(r.from, 1, 40) && isStr(r.to, 1, 40)) stmts.push(db.prepare(`UPDATE items SET section = ? WHERE tab = ? AND section = ?`).bind(r.to.trim(), r.tab, r.from));
    await db.batch(stmts);
    return json({ ok: true });
  }

  // ───── الخيارات ─────
  const groupMatch = path.match(/^groups\/([A-Z0-9_]{2,30})$/);
  if (groupMatch) {
    const menu = await loadMenu(db, { admin: true });
    if (m === 'PUT') {
      const g = validGroup({ ...(await readJson(req)) as object, code: groupMatch[1] });
      await db.batch(groupStatements(db, { ...menu.groups, [g.code]: g }));
      return json({ ok: true, group: g });
    }
    if (m === 'DELETE') {
      const code = groupMatch[1];
      const groups = { ...menu.groups };
      delete groups[code];
      const users = menu.items.filter((i) => i.groups.includes(code));
      await db.batch([...groupStatements(db, groups), ...users.map((i) => db.prepare(`UPDATE items SET groups = ? WHERE id = ?`).bind(JSON.stringify(i.groups.filter((g) => g !== code)), i.id))]);
      return json({ ok: true, removedFrom: users.length });
    }
  }

  // ───── المناطق ─────
  if (path === 'zones' && m === 'PUT') {
    const { zones } = await readJson<{ zones: unknown[] }>(req, 300_000);
    if (!Array.isArray(zones) || zones.length > 20) throw bad('مناطق غير صحيحة');
    const list = zones.map(validZone);
    await db.batch(zoneStatements(db, list));
    return json({ ok: true, zones: list });
  }

  // ───── الإعدادات ─────
  if (path === 'settings') {
    if (m === 'GET') return json({ settings: await getSettings(db), presets: MAP_PRESETS });
    if (m === 'PUT') {
      const s = validSettings(await readJson(req));
      await db.prepare(`INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('main', ?, ?)`).bind(JSON.stringify(s), new Date().toISOString()).run();
      return json({ ok: true, settings: s });
    }
  }
  /** تعديل سريع لجزء من الإعدادات (ضغط عالي / إيقاف مؤقت) */
  if (path === 'settings/patch' && m === 'POST') {
    const patch = await readJson(req, 20_000);
    const s = validSettings(mergeSettings(await getSettings(db), patch));
    await db.prepare(`INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('main', ?, ?)`).bind(JSON.stringify(s), new Date().toISOString()).run();
    return json({ ok: true, settings: s });
  }

  if (path === 'upload' && m === 'POST') return json(await upload(req, env));

  // ───── الطلبات ─────
  if (path === 'orders' && m === 'GET') {
    const u = new URL(req.url);
    const day = /^\d{4}-\d{2}-\d{2}$/.test(u.searchParams.get('day') ?? '') ? u.searchParams.get('day')! : baghdadDay();
    const q = (u.searchParams.get('q') ?? '').replace(/[^\d]/g, '').slice(0, 15);
    let stmt;
    if (q.length >= 5) stmt = db.prepare(`SELECT * FROM orders WHERE phone LIKE ? ORDER BY id DESC LIMIT 200`).bind(`%${q}%`);
    else if (q.length >= 1) stmt = db.prepare(`SELECT * FROM orders WHERE day = ? AND CAST(number AS TEXT) LIKE ? ORDER BY id DESC LIMIT 200`).bind(day, `${q}%`);
    else stmt = db.prepare(`SELECT * FROM orders WHERE day = ? ORDER BY id DESC LIMIT 500`).bind(day);
    const rows = (await stmt.all()).results;
    const sum = await db.prepare(`SELECT COUNT(*) AS n, COALESCE(SUM(total),0) AS total, SUM(status = 'pending') AS pending FROM orders WHERE day = ?`).bind(day).first();
    return json({ day, orders: rows.map((r) => ({ ...r, lines: JSON.parse(String(r.lines)) })), summary: sum });
  }

  /**
   * حذف طلب (للطلبات التجريبية): بعد الحذف عداد ذاك اليوم يرجع لأكبر رقم باقي،
   * فإذا انحذفت كل طلبات اليوم يبدي الطلب الجاي من 1001 من جديد.
   */
  const delMatch = path.match(/^orders\/(\d{1,10})$/);
  if (delMatch && m === 'DELETE') {
    const row = await db.prepare(`SELECT day FROM orders WHERE id = ?`).bind(Number(delMatch[1])).first<{ day: string }>();
    if (!row) throw new HttpError(404, 'not_found', 'الطلب مو موجود');
    await db.batch([
      db.prepare(`DELETE FROM orders WHERE id = ?`).bind(Number(delMatch[1])),
      db.prepare(`UPDATE order_counters SET last = COALESCE((SELECT MAX(number) FROM orders WHERE day = ?), 1000) WHERE day = ?`).bind(row.day, row.day),
    ]);
    const next = await db.prepare(`SELECT last FROM order_counters WHERE day = ?`).bind(row.day).first<{ last: number }>();
    return json({ ok: true, nextNumber: (next?.last ?? 1000) + 1 });
  }

  /**
   * "رتّب تلقائياً من الطلبات": أكثر الأصناف طلباً بآخر 30 يوم (بس الطلبات اللي انرسلت).
   * يحتاج 10 طلبات على الأقل حتى يكون الترتيب منطقي.
   */
  if (path === 'featured/auto' && m === 'POST') {
    const since = new Date(Date.now() - 30 * 86400_000).toISOString();
    const rows = (await db.prepare(`SELECT lines FROM orders WHERE created_at > ? AND status = 'sent'`).bind(since).all<{ lines: string }>()).results;
    if (rows.length < 10) throw new HttpError(409, 'few_orders', `بعد ما عدنا طلبات كافية (${rows.length} من 10) — ضل اختار يدوياً بالنجمة`);
    const menu = await loadMenu(db, { admin: true });
    const byName = new Map(menu.items.map((i) => [i.name, i.id]));
    const count = new Map<string, number>();
    for (const r of rows) for (const l of JSON.parse(r.lines) as { itemId?: string; name: string; qty: number }[]) {
      const id = l.itemId ?? byName.get(l.name);
      if (id) count.set(id, (count.get(id) ?? 0) + (Number(l.qty) || 1));
    }
    const valid = new Set(menu.items.filter((i) => i.orderable && i.image).map((i) => i.id));
    const top = [...count.entries()].filter(([id]) => valid.has(id)).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([id]) => id);
    const s = validSettings(mergeSettings(await getSettings(db), { featured: { items: top } }));
    await db.prepare(`INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('main', ?, ?)`).bind(JSON.stringify(s), new Date().toISOString()).run();
    return json({ ok: true, items: top, orders: rows.length, counts: Object.fromEntries(top.map((id) => [id, count.get(id)])) });
  }

  // ───── استيراد Excel (بعد شاشة المراجعة) ─────
  if (path === 'import' && m === 'PUT') {
    const body = await readJson<{ items: unknown[]; groups: Record<string, unknown>; sectionsByTab: Record<TabId, string[]>; zones?: { name: string; fee: number }[] }>(req, 2_000_000);
    const groups: Record<string, OptionGroup> = {};
    for (const g of Object.values(body.groups ?? {})) { const v = validGroup(g); groups[v.code] = v; }
    if (!Array.isArray(body.items) || !body.items.length || body.items.length > 2000) throw bad('الملف ماكو بيه أصناف');
    const items = body.items.map((i) => validItem(i, groups));
    const current = await loadMenu(db, { admin: true });
    const keepIds = new Set(items.map((i) => i.id));
    const zones = Array.isArray(body.zones) && body.zones.length
      ? body.zones.map((z, k) => { const old = current.zones.find((c) => c.name === z.name); return validZone({ id: old?.id ?? `z${k + 1}`, name: z.name, fee: z.fee, polygon: old?.polygon ?? [] }, k); })
      : current.zones;
    await db.batch([
      ...current.items.filter((i) => !keepIds.has(i.id)).map((i) => db.prepare(`DELETE FROM items WHERE id = ?`).bind(i.id)),
      ...itemStatements(db, items),
      ...sectionStatements(db, body.sectionsByTab),
      ...groupStatements(db, groups),
      ...zoneStatements(db, zones),
    ]);
    return json({ ok: true, items: items.length });
  }

  throw new HttpError(404, 'not_found', 'مسار غير موجود');
}

export type AdminMenu = MenuData;
