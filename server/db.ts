/**
 * قاعدة البيانات D1: الجداول تنخلق تلقائياً بأول طلب، والمنيو يتعبى تلقائياً من menu.json
 * (حتى أحمد ما يحتاج يشغّل أوامر — بس ينشئ القاعدة ويربطها).
 */
import seed from '../src/data/menu.json';
import type { Item, MenuData, OptionGroup, Settings, TabId, Zone } from '../src/data/types';
import { DEFAULT_SETTINGS, mergeSettings } from '../src/data/defaults';

export const SCHEMA: string[] = [
  `CREATE TABLE IF NOT EXISTS items (
    id TEXT PRIMARY KEY, tab TEXT NOT NULL, section TEXT NOT NULL, sort INTEGER NOT NULL DEFAULT 0,
    name TEXT NOT NULL, name_en TEXT, description TEXT, price INTEGER, groups TEXT NOT NULL DEFAULT '[]',
    image TEXT, available INTEGER NOT NULL DEFAULT 1, sold_out_until TEXT, updated_at TEXT)`,
  `CREATE TABLE IF NOT EXISTS sections (tab TEXT NOT NULL, name TEXT NOT NULL, sort INTEGER NOT NULL, PRIMARY KEY (tab, name))`,
  `CREATE TABLE IF NOT EXISTS option_groups (code TEXT PRIMARY KEY, data TEXT NOT NULL, sort INTEGER NOT NULL DEFAULT 0)`,
  `CREATE TABLE IF NOT EXISTS zones (id TEXT PRIMARY KEY, name TEXT NOT NULL, fee INTEGER NOT NULL, polygon TEXT NOT NULL, sort INTEGER NOT NULL DEFAULT 0)`,
  `CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT)`,
  `CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT, day TEXT NOT NULL, number INTEGER NOT NULL, client_id TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', sent_at TEXT, type TEXT NOT NULL,
    customer_name TEXT NOT NULL, phone TEXT NOT NULL, zone TEXT, address TEXT, lat REAL, lng REAL,
    subtotal INTEGER NOT NULL, delivery_fee INTEGER, total INTEGER NOT NULL, note TEXT, lines TEXT NOT NULL,
    message TEXT NOT NULL, ip_hash TEXT, UNIQUE (day, number))`,
  `CREATE INDEX IF NOT EXISTS idx_orders_day ON orders (day, number)`,
  `CREATE INDEX IF NOT EXISTS idx_orders_phone ON orders (phone)`,
  `CREATE INDEX IF NOT EXISTS idx_orders_ip ON orders (ip_hash, created_at)`,
  `CREATE TABLE IF NOT EXISTS order_counters (day TEXT PRIMARY KEY, last INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, created_at TEXT NOT NULL, expires_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS login_attempts (ip_hash TEXT NOT NULL, at TEXT NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS idx_login ON login_attempts (ip_hash, at)`,
  // صور مرفوعة (إذا R2 مو مربوط تنحفظ هنا كـ base64 — كل صورة أقل من 150KB)
  `CREATE TABLE IF NOT EXISTS media (key TEXT PRIMARY KEY, content_type TEXT NOT NULL, data TEXT NOT NULL, created_at TEXT NOT NULL)`,
  // الملفات الكبيرة (فيديو ≤ 1.5MB) تنقسم أجزاء — حد الصف بـ D1 حوالي 2MB
  `CREATE TABLE IF NOT EXISTS media_chunks (key TEXT NOT NULL, idx INTEGER NOT NULL, data TEXT NOT NULL, PRIMARY KEY (key, idx))`,
];

let ready: Promise<void> | null = null;
let readyFor: D1Database | null = null;

/** يتأكد من الجداول والبيانات الأولية (مرة وحدة لكل نسخة من السيرفر) */
export function ensureReady(db: D1Database): Promise<void> {
  if (!ready || readyFor !== db) {
    readyFor = db;
    ready = (async () => {
      await db.batch(SCHEMA.map((s) => db.prepare(s)));
      const seeded = await db.prepare(`SELECT value FROM settings WHERE key = 'seeded'`).first<{ value: string }>();
      if (!seeded) await seedFrom(db, seed as unknown as MenuData);
    })().catch((e) => { ready = null; throw e; });
  }
  return ready;
}

export function itemStatements(db: D1Database, items: Item[], now = new Date().toISOString()) {
  return items.map((i, k) =>
    db.prepare(
      `INSERT INTO items (id, tab, section, sort, name, name_en, description, price, groups, image, available, sold_out_until, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
       ON CONFLICT (id) DO UPDATE SET tab=excluded.tab, section=excluded.section, sort=excluded.sort, name=excluded.name,
         name_en=excluded.name_en, description=excluded.description, price=excluded.price, groups=excluded.groups,
         image=excluded.image, available=excluded.available, updated_at=excluded.updated_at`,
    ).bind(i.id, i.tab, i.section, i.sort ?? k, i.name, i.nameEn, i.desc, i.price, JSON.stringify(i.groups), i.image, i.available ? 1 : 0, i.soldOutUntil ?? null, now),
  );
}

export function sectionStatements(db: D1Database, sectionsByTab: Record<TabId, string[]>) {
  const out = [db.prepare(`DELETE FROM sections`)];
  for (const [tab, names] of Object.entries(sectionsByTab)) names.forEach((n, i) => out.push(db.prepare(`INSERT INTO sections (tab, name, sort) VALUES (?,?,?)`).bind(tab, n, i)));
  return out;
}

export function groupStatements(db: D1Database, groups: Record<string, OptionGroup>) {
  return [db.prepare(`DELETE FROM option_groups`), ...Object.values(groups).map((g, i) => db.prepare(`INSERT INTO option_groups (code, data, sort) VALUES (?,?,?)`).bind(g.code, JSON.stringify(g), i))];
}

export function zoneStatements(db: D1Database, zones: Zone[]) {
  return [db.prepare(`DELETE FROM zones`), ...zones.map((z, i) => db.prepare(`INSERT INTO zones (id, name, fee, polygon, sort) VALUES (?,?,?,?,?)`).bind(z.id, z.name, z.fee, JSON.stringify(z.polygon), i))];
}

async function seedFrom(db: D1Database, m: MenuData) {
  const sectionsByTab = Object.fromEntries(m.tabs.map((t) => [t.id, t.sections.map((s) => s.name)])) as Record<TabId, string[]>;
  const now = new Date().toISOString();
  await db.batch([
    ...itemStatements(db, m.items, now),
    ...sectionStatements(db, sectionsByTab),
    ...groupStatements(db, m.groups),
    ...zoneStatements(db, m.zones),
    db.prepare(`INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('main', ?, ?)`).bind(JSON.stringify(m.settings), now),
    db.prepare(`INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('seeded', ?, ?)`).bind(now, now),
  ]);
}

interface ItemRow {
  id: string; tab: TabId; section: string; sort: number; name: string; name_en: string | null; description: string | null;
  price: number | null; groups: string; image: string | null; available: number; sold_out_until: string | null;
}

export async function getSettings(db: D1Database): Promise<Settings> {
  const row = await db.prepare(`SELECT value FROM settings WHERE key = 'main'`).first<{ value: string }>();
  return mergeSettings(DEFAULT_SETTINGS, row ? JSON.parse(row.value) : {});
}

/**
 * المنيو كامل من القاعدة.
 * admin=false: "متوفر" يحسب "خالص اليوم" (يرجع تلقائياً الساعة 6 الصبح).
 */
export async function loadMenu(db: D1Database, opts: { admin?: boolean; now?: Date } = {}): Promise<MenuData> {
  const now = (opts.now ?? new Date()).toISOString();
  const [items, sections, groups, zones, settings] = await Promise.all([
    db.prepare(`SELECT * FROM items`).all<ItemRow>(),
    db.prepare(`SELECT tab, name, sort FROM sections ORDER BY sort`).all<{ tab: TabId; name: string; sort: number }>(),
    db.prepare(`SELECT data FROM option_groups ORDER BY sort`).all<{ data: string }>(),
    db.prepare(`SELECT * FROM zones ORDER BY sort`).all<{ id: string; name: string; fee: number; polygon: string }>(),
    getSettings(db),
  ]);
  const tabIds: TabId[] = ['food', 'drinks', 'sweets'];
  const tabNames: Record<TabId, string> = { food: 'الأكل', drinks: 'المشروبات', sweets: 'الحلويات' };
  const secOrder = new Map<string, number>();
  const tabs = tabIds.map((t) => {
    const names = sections.results.filter((s) => s.tab === t).map((s) => s.name);
    // أقسام موجودة بالأصناف بس مو بجدول الأقسام → بالأخير
    for (const it of items.results) if (it.tab === t && !names.includes(it.section)) names.push(it.section);
    names.forEach((n, i) => secOrder.set(`${t}|${n}`, i));
    return { id: t, name: tabNames[t], sections: names.map((name, i) => ({ id: `${t}-${i + 1}`, name })) };
  });
  const sorted = [...items.results].sort(
    (a, b) => tabIds.indexOf(a.tab) - tabIds.indexOf(b.tab) || (secOrder.get(`${a.tab}|${a.section}`) ?? 0) - (secOrder.get(`${b.tab}|${b.section}`) ?? 0) || a.sort - b.sort,
  );
  const soldOut = (r: ItemRow) => !!r.sold_out_until && r.sold_out_until > now;
  return {
    generatedAt: now,
    tabs,
    items: sorted.map((r) => ({
      id: r.id, tab: r.tab, section: r.section, name: r.name, nameEn: r.name_en, desc: r.description, price: r.price,
      orderable: r.price != null, groups: JSON.parse(r.groups), image: r.image,
      available: opts.admin ? !!r.available : !!r.available && !soldOut(r),
      sort: r.sort,
      ...(opts.admin ? { soldOutUntil: soldOut(r) ? r.sold_out_until : null } : {}),
    })),
    groups: Object.fromEntries(groups.results.map((g) => { const x = JSON.parse(g.data) as OptionGroup; return [x.code, x]; })),
    zones: zones.results.map((z) => ({ id: z.id, name: z.name, fee: z.fee, polygon: JSON.parse(z.polygon) })),
    settings,
  };
}
