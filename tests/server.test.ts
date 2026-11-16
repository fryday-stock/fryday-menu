import { describe, it, expect, beforeEach } from 'vitest';
import { makeD1 } from './d1shim';
import { ensureReady, loadMenu } from '../server/db';
import { createOrder, markSent, type OrderInput } from '../server/orders';
import { handleAdmin } from '../server/admin';
import { hashPassword, verifyPassword } from '../server/auth';
import { baghdadDay, nextSixAmBaghdad } from '../server/time';
import { HttpError } from '../server/http';
import type { Env } from '../server/env';

// ensureReady يحفظ وعد بالذاكرة لكل نسخة — بالاختبار نسوي قاعدة جديدة لكل اختبار
async function freshDb() {
  const db = makeD1();
  const mod = await import('../server/db');
  // نعيد تهيئة الوعد
  (mod as unknown as { __reset?: () => void }).__reset?.();
  await ensureReady(db);
  return db;
}

const at = (iso: string) => new Date(iso);
const evening = at('2026-11-16T19:30:00+03:00');
const base: OrderInput = {
  clientId: 'test-client-0001', type: 'delivery', name: 'أحمد علي', phone: '07801234567',
  address: 'حي الأمير', landmark: 'قرب جامع الحسن', note: '',
  pin: { lat: 32.01622, lng: 44.345007 },
  lines: [{ itemId: 'F001', qty: 2, sel: { MEAL: ['MEAL-1'] }, note: 'بدون بصل' }],
};

describe('الوقت', () => {
  it('اليوم بتوقيت بغداد', () => {
    expect(baghdadDay(at('2026-11-16T20:59:00Z'))).toBe('2026-11-16');
    expect(baghdadDay(at('2026-11-16T21:00:00Z'))).toBe('2026-11-17'); // نص الليل ببغداد
  });
  it('خالص اليوم → 6 الصبح الجاية', () => {
    expect(nextSixAmBaghdad(at('2026-11-16T19:30:00+03:00')).toISOString()).toBe('2026-11-17T03:00:00.000Z');
    expect(nextSixAmBaghdad(at('2026-11-17T02:00:00+03:00')).toISOString()).toBe('2026-11-17T03:00:00.000Z');
  });
});

describe('الطلبات والعداد اليومي', () => {
  let db: D1Database;
  beforeEach(async () => { db = await freshDb(); });

  it('القاعدة تتعبى تلقائياً من المنيو', async () => {
    const m = await loadMenu(db);
    expect(m.items).toHaveLength(163);
    expect(m.zones.map((z) => z.name)).toEqual(['النجف', 'الكوفة']);
    expect(m.settings.whatsapp).toBe('9647715796059');
  });

  it('يبدي من 1001 ويتسلسل، ويرجع 1001 باليوم الجديد', async () => {
    const m = await loadMenu(db);
    const a = await createOrder(db, { ...base, clientId: 'c-000000001' }, m, '1.1.1.1', evening);
    const b = await createOrder(db, { ...base, clientId: 'c-000000002' }, m, '1.1.1.2', evening);
    expect([a.number, b.number]).toEqual([1001, 1002]);
    const next = await createOrder(db, { ...base, clientId: 'c-000000003' }, m, '1.1.1.1', at('2026-11-17T13:00:00+03:00'));
    expect(next.number).toBe(1001);
  });

  it('طلبات بنفس اللحظة ما تتكرر أرقامها', async () => {
    const m = await loadMenu(db);
    const rs = await Promise.all(Array.from({ length: 20 }, (_, k) => createOrder(db, { ...base, clientId: `par-${String(k).padStart(6, '0')}` }, m, `9.9.9.${k}`, evening)));
    const nums = rs.map((r) => r.number).sort((x, y) => x - y);
    expect(new Set(nums).size).toBe(20);
    expect(nums[0]).toBe(1001);
    expect(nums[19]).toBe(1020);
  });

  it('نفس الطلب (إعادة محاولة) يرجع نفس الرقم', async () => {
    const m = await loadMenu(db);
    const a = await createOrder(db, base, m, '1.1.1.1', evening);
    const b = await createOrder(db, base, m, '1.1.1.1', evening);
    expect(b.number).toBe(a.number);
  });

  it('السيرفر يحسب السعر بنفسه + الرسالة', async () => {
    const m = await loadMenu(db);
    const r = await createOrder(db, base, m, '1.1.1.1', evening);
    expect(r.total).toBe(26000 + 2500);
    expect(r.message).toContain('2× بركر فرايدي — 26,000');
    expect(r.message).toContain('🛵 توصيل — النجف');
    expect(r.message).toContain('🗺️ https://maps.google.com/?q=32.016220,44.345007');
    expect(r.etaMinutes).toBe(45);
  });

  it('غير مؤكد → انرسل', async () => {
    const m = await loadMenu(db);
    const r = await createOrder(db, base, m, '1.1.1.1', evening);
    expect(await markSent(db, r.id, 'wrong-client')).toBe(false);
    expect(await markSent(db, r.id, base.clientId)).toBe(true);
    const row = await db.prepare('SELECT status FROM orders WHERE id = ?').bind(r.id).first<{ status: string }>();
    expect(row?.status).toBe('sent');
  });

  it('يرفض: مسكّر، متوقف، خارج المنطقة، بدون دبوس، صنف خالص', async () => {
    const m = await loadMenu(db);
    const err = async (p: Promise<unknown>) => { try { await p; return null; } catch (e) { return (e as HttpError).code; } };
    expect(await err(createOrder(db, { ...base, clientId: 'x-00000001' }, m, '1', at('2026-11-16T10:00:00+03:00')))).toBe('closed');
    expect(await err(createOrder(db, { ...base, clientId: 'x-00000002' }, { ...m, settings: { ...m.settings, paused: { enabled: true, message: 'متوقف' } } }, '1', evening))).toBe('paused');
    expect(await err(createOrder(db, { ...base, clientId: 'x-00000003', pin: { lat: 32.5, lng: 44.4 } }, m, '1', evening))).toBe('out_of_zone');
    expect(await err(createOrder(db, { ...base, clientId: 'x-00000004', pin: null }, m, '1', evening))).toBe('location');
    const soldOut = { ...m, items: m.items.map((i) => (i.id === 'F001' ? { ...i, available: false } : i)) };
    expect(await err(createOrder(db, { ...base, clientId: 'x-00000005' }, soldOut, '1', evening))).toBe('sold_out');
    expect(await err(createOrder(db, { ...base, clientId: 'x-00000006', lines: [{ itemId: 'F077', qty: 1, sel: { APPET_PICK: ['APPET_PICK-1'] } }] }, m, '1', evening))).toBe('options');
  });

  it('الاستلام ما يحتاج موقع', async () => {
    const m = await loadMenu(db);
    const r = await createOrder(db, { ...base, clientId: 'pick-000001', type: 'pickup', pin: null, address: '' }, m, '1', evening);
    expect(r.message).toContain('🏃 استلام من المطعم');
    expect(r.total).toBe(26000);
    expect(r.etaMinutes).toBe(20);
  });
});

describe('لوحة الإدارة', () => {
  const req = (path: string, init: RequestInit & { cookie?: string } = {}) => {
    const headers = new Headers(init.headers);
    if (init.body) headers.set('content-type', 'application/json');
    if (init.cookie) headers.set('cookie', init.cookie);
    headers.set('cf-connecting-ip', '5.5.5.5');
    return new Request(`https://fryday.test/api/admin/${path}`, { ...init, headers });
  };
  const call = async (env: Env, path: string, init: RequestInit & { cookie?: string } = {}) => {
    try { return await handleAdmin(req(path, init), env, path); } catch (e) { return new Response(JSON.stringify({ code: (e as HttpError).code }), { status: (e as HttpError).status ?? 500 }); }
  };

  it('hash كلمة السر يتحقق صح', async () => {
    const h = await hashPassword('Fryday-2026!', 1000);
    expect(await verifyPassword('Fryday-2026!', { ADMIN_PASSWORD_HASH: h } as Env)).toBe(true);
    expect(await verifyPassword('غلط', { ADMIN_PASSWORD_HASH: h } as Env)).toBe(false);
  });

  it('دخول + جلسة + قفل بعد 5 محاولات غلط', async () => {
    const env = { DB: await freshDb(), ADMIN_PASSWORD_HASH: await hashPassword('secret-pass', 1000) } as Env;
    expect((await call(env, 'menu')).status).toBe(401);
    const ok = await call(env, 'login', { method: 'POST', body: JSON.stringify({ password: 'secret-pass' }) });
    expect(ok.status).toBe(200);
    const cookie = ok.headers.get('set-cookie')!.split(';')[0];
    expect(ok.headers.get('set-cookie')).toMatch(/HttpOnly; Secure; SameSite=Strict/);
    expect((await call(env, 'menu', { cookie })).status).toBe(200);
    for (let k = 0; k < 5; k++) expect((await call(env, 'login', { method: 'POST', body: JSON.stringify({ password: 'x' }) })).status).toBe(401);
    expect((await call(env, 'login', { method: 'POST', body: JSON.stringify({ password: 'secret-pass' }) })).status).toBe(429);
  });

  it('خالص اليوم + تعديل صنف + الإعدادات', async () => {
    const env = { DB: await freshDb(), ADMIN_PASSWORD: 'p' } as Env;
    const cookie = (await call(env, 'login', { method: 'POST', body: JSON.stringify({ password: 'p' }) })).headers.get('set-cookie')!.split(';')[0];
    expect((await call(env, 'items/F001/soldout', { method: 'POST', body: JSON.stringify({ on: true }), cookie })).status).toBe(200);
    expect((await loadMenu(env.DB)).items.find((i) => i.id === 'F001')!.available).toBe(false);
    // بعد 6 الصبح يرجع تلقائياً
    expect((await loadMenu(env.DB, { now: new Date(Date.now() + 2 * 86400_000) })).items.find((i) => i.id === 'F001')!.available).toBe(true);
    const put = await call(env, 'items/F001', { method: 'PUT', body: JSON.stringify({ tab: 'food', section: 'البركر', name: 'بركر فرايدي', price: 11000, groups: ['MEAL'], image: 'burger-fryday.webp' }), cookie });
    expect(put.status).toBe(200);
    expect((await loadMenu(env.DB)).items.find((i) => i.id === 'F001')!.price).toBe(11000);
    const bad = await call(env, 'items/F001', { method: 'PUT', body: JSON.stringify({ tab: 'food', section: 'x', name: 'x', price: 1, image: '../../etc' }), cookie });
    expect(bad.status).toBe(400);
    const s = await call(env, 'settings/patch', { method: 'POST', body: JSON.stringify({ busy: { enabled: true } }), cookie });
    expect(s.status).toBe(200);
    expect((await loadMenu(env.DB)).settings.busy.enabled).toBe(true);
  });
});
