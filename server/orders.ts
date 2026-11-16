/**
 * إنشاء طلب: السيرفر يعيد حساب الأسعار من القاعدة (ما يثق بأسعار المتصفح)،
 * يتأكد من الدوام والموقع، ياخذ رقم يومي متسلسل (يبدي 1001 كل يوم بتوقيت بغداد)، ويبني رسالة الواتساب.
 */
import type { MenuData } from '../src/data/types';
import { etaFor } from '../src/data/defaults';
import { itemGroups, validateSelection, type Selection } from '../src/lib/price';
import { resolveLines, toOrderLine, type CartLine } from '../src/store/cartCore';
import { buildWhatsAppMessage, type Order } from '../src/lib/whatsapp';
import { mapsUrl, quoteDelivery } from '../src/lib/delivery';
import { isOpenAt } from '../src/lib/hours';
import { cleanPhone, isValidPhone } from '../src/lib/validate';
import { HttpError, sha256Hex } from './http';
import { baghdadDay } from './time';

export interface OrderInput {
  clientId: string;
  type: 'delivery' | 'pickup';
  name: string;
  phone: string;
  address?: string;
  landmark?: string;
  note?: string;
  pin?: { lat: number; lng: number } | null;
  lines: { itemId: string; qty: number; sel: Selection; note?: string }[];
}

export interface OrderResult {
  id: number;
  number: number;
  message: string;
  total: number;
  type: 'delivery' | 'pickup';
  etaMinutes: number;
  createdAt: string;
}

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/** يتحقق من بيانات الطلب ويحسب كلشي (بدون قاعدة بيانات — قابل للاختبار) */
export function prepareOrder(input: OrderInput, menu: MenuData, now: Date) {
  const s = menu.settings;
  if (s.paused.enabled) throw new HttpError(409, 'paused', s.paused.message);
  if (!isOpenAt(now, s.hours)) throw new HttpError(409, 'closed', `المطعم مسكّر هسه — ${s.closedMessage}`);
  const type = input.type === 'pickup' ? 'pickup' : 'delivery';
  if (type === 'delivery' && !s.delivery.enabled) throw new HttpError(400, 'no_delivery', 'التوصيل متوقف هسه — تگدر تختار الاستلام من المطعم');
  if (type === 'pickup' && !s.pickup.enabled) throw new HttpError(400, 'no_pickup', 'الاستلام من المطعم متوقف هسه');

  const name = str(input.name, 60);
  if (name.length < 2) throw new HttpError(400, 'name', 'اكتب اسمك');
  const phone = cleanPhone(str(input.phone, 20));
  if (!isValidPhone(phone)) throw new HttpError(400, 'phone', 'رقم الموبايل لازم 11 رقم ويبدي بـ 07');

  if (!Array.isArray(input.lines) || !input.lines.length) throw new HttpError(400, 'empty', 'السلة فاضية');
  if (input.lines.length > 50) throw new HttpError(400, 'too_many', 'الطلب كبير هواية');
  const byId = new Map(menu.items.map((i) => [i.id, i]));
  const cart: CartLine[] = [];
  for (const [k, l] of input.lines.entries()) {
    const item = byId.get(String(l?.itemId));
    if (!item || !item.orderable) throw new HttpError(400, 'item', 'صنف بالسلة ما موجود بالمنيو — حدّث الصفحة');
    if (!item.available) throw new HttpError(409, 'sold_out', `${item.name} خالص هسه — شيله من السلة وكمّل`, { itemId: item.id });
    const qty = Math.floor(Number(l.qty));
    if (!(qty >= 1 && qty <= 99)) throw new HttpError(400, 'qty', 'كمية غير صحيحة');
    // ننظف الاختيارات: بس مجموعات الصنف وخيارات موجودة فعلاً
    const sel: Selection = {};
    for (const g of itemGroups(item, menu.groups)) {
      const ids = Array.isArray(l.sel?.[g.code]) ? l.sel[g.code].map(String) : [];
      sel[g.code] = [...new Set(ids)].filter((id) => g.options.some((o) => o.id === id));
    }
    if (!validateSelection(item, menu.groups, sel).ok) throw new HttpError(400, 'options', `اختيارات ${item.name} ناقصة`);
    cart.push({ key: String(k), itemId: item.id, qty, sel, note: str(l.note, 140) });
  }
  const lines = resolveLines(cart, menu, byId);
  const subtotal = lines.reduce((a, l) => a + l.total, 0);
  if (s.minOrder.enabled && type === 'delivery' && subtotal < s.minOrder.amount) throw new HttpError(400, 'min', `أقل مبلغ للطلب ${s.minOrder.amount.toLocaleString('en-US')} د.ع`);

  let pin: { lat: number; lng: number } | null = null;
  if (input.pin && Number.isFinite(input.pin.lat) && Number.isFinite(input.pin.lng) && Math.abs(input.pin.lat) <= 90 && Math.abs(input.pin.lng) <= 180) pin = { lat: input.pin.lat, lng: input.pin.lng };
  let fee: number | null = 0;
  let zone: string | undefined;
  const address = [str(input.address, 120), str(input.landmark, 120)].filter(Boolean).join('، ');
  if (type === 'delivery') {
    const q = quoteDelivery(s, menu.zones, pin, subtotal);
    if (q.kind === 'need-pin') throw new HttpError(400, 'location', 'حدد موقعك على الخريطة');
    if (q.kind === 'out') throw new HttpError(400, 'out_of_zone', s.messages.outOfZone);
    fee = q.kind === 'fee' ? q.fee : null;
    zone = q.zone?.name;
    if (str(input.address, 120).length < 3) throw new HttpError(400, 'address', 'اكتب العنوان');
  } else pin = null;

  const total = subtotal + (fee ?? 0);
  const order: Omit<Order, 'number'> = {
    lines: lines.map((l) => toOrderLine(l, menu)),
    subtotal, deliveryFee: type === 'delivery' ? fee : 0, total, type,
    customer: { name, phone }, zone, address: type === 'delivery' ? address : undefined,
    mapsUrl: pin ? mapsUrl(pin) : undefined, note: str(input.note, 200), payment: s.payment,
  };
  return { order, pin, etaMinutes: etaFor(s, type) };
}

export async function createOrder(db: D1Database, input: OrderInput, menu: MenuData, ip: string, now = new Date()): Promise<OrderResult> {
  const clientId = str(input.clientId, 64);
  if (!/^[\w-]{8,64}$/.test(clientId)) throw new HttpError(400, 'client', 'طلب غير صالح');

  // نفس الطلب انرسل قبل (إعادة محاولة بنت ضعيف) → نرجّع نفس الرقم
  const existing = await findByClient(db, clientId);
  if (existing) return existing;

  const { order, pin, etaMinutes } = prepareOrder(input, menu, now);
  const day = baghdadDay(now);
  const ipHash = (await sha256Hex(`${ip}|${day}`)).slice(0, 24);
  const recent = await db.prepare(`SELECT COUNT(*) AS n FROM orders WHERE ip_hash = ? AND created_at > ?`).bind(ipHash, new Date(now.getTime() - 3600_000).toISOString()).first<{ n: number }>();
  if ((recent?.n ?? 0) >= 30) throw new HttpError(429, 'rate', 'طلبات هواية من نفس الجهاز — انتظر شوية');

  // رقم يومي متسلسل: عملية وحدة ذرية (atomic) حتى لو وصل طلبين بنفس اللحظة
  const c = await db.prepare(
    `INSERT INTO order_counters (day, last) VALUES (?, 1001) ON CONFLICT (day) DO UPDATE SET last = last + 1 RETURNING last`,
  ).bind(day).first<{ last: number }>();
  const number = c!.last;
  const message = buildWhatsAppMessage({ ...order, number });
  const createdAt = now.toISOString();
  try {
    const r = await db.prepare(
      `INSERT INTO orders (day, number, client_id, created_at, status, type, customer_name, phone, zone, address, lat, lng, subtotal, delivery_fee, total, note, lines, message, ip_hash)
       VALUES (?,?,?,?,'pending',?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    ).bind(day, number, clientId, createdAt, order.type, order.customer.name, order.customer.phone, order.zone ?? null, order.address ?? null,
      pin?.lat ?? null, pin?.lng ?? null, order.subtotal, order.deliveryFee, order.total, order.note ?? null, JSON.stringify(order.lines), message, ipHash).run();
    return { id: Number(r.meta.last_row_id), number, message, total: order.total, type: order.type, etaMinutes, createdAt };
  } catch (e) {
    const again = await findByClient(db, clientId); // سباق: نفس الطلب انحفظ بنفس اللحظة
    if (again) return again;
    throw e;
  }

  async function findByClient(d: D1Database, cid: string): Promise<OrderResult | null> {
    const row = await d.prepare(`SELECT id, number, message, total, type, created_at FROM orders WHERE client_id = ?`).bind(cid).first<{ id: number; number: number; message: string; total: number; type: 'delivery' | 'pickup'; created_at: string }>();
    return row ? { id: row.id, number: row.number, message: row.message, total: row.total, type: row.type, etaMinutes: etaFor(menu.settings, row.type), createdAt: row.created_at } : null;
  }
}

export async function markSent(db: D1Database, id: number, clientId: string, now = new Date()) {
  const r = await db.prepare(`UPDATE orders SET status = 'sent', sent_at = ? WHERE id = ? AND client_id = ? AND status = 'pending'`).bind(now.toISOString(), id, clientId).run();
  return r.meta.changes > 0;
}
