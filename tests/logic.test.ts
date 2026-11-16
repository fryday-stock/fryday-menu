import { describe, it, expect } from 'vitest';
import menu from '../src/data/menu.json';
import type { MenuData } from '../src/data/types';
import { defaultSelection, toggleOption, unitPrice, validateSelection } from '../src/lib/price';
import { buildWhatsAppMessage } from '../src/lib/whatsapp';
import { isOpenAt } from '../src/lib/hours';
import { normalizeQuery, searchItems } from '../src/lib/search';
import { cleanPhone, isValidPhone } from '../src/lib/validate';
import { resolveLines, toOrderLine } from '../src/store/cart';
import { quoteDelivery, zoneAt } from '../src/lib/delivery';

const data = menu as unknown as MenuData;
const byId = new Map(data.items.map((i) => [i.id, i]));
const item = (id: string) => byId.get(id)!;

describe('البيانات', () => {
  it('163 صنف و13 بدون صورة وكيك المناسبات ما ينطلب', () => {
    expect(data.items).toHaveLength(163);
    expect(data.items.filter((i) => !i.image)).toHaveLength(13);
    expect(item('S025').orderable).toBe(false);
    expect(item('S025').price).toBeNull();
  });
});

describe('الأسعار والخيارات', () => {
  it('البيتزا: الصغيرة افتراضية، الوسط يزيد السعر', () => {
    const p = item('F024');
    let sel = defaultSelection(p, data.groups);
    expect(unitPrice(p, data.groups, sel)).toBe(7500);
    sel = toggleOption(data.groups.PIZZA_B, sel, 'PIZZA_B-2');
    expect(unitPrice(p, data.groups, sel)).toBe(14000);
  });
  it('حوّل لوجبة +3000 اختياري', () => {
    const b = item('F001');
    let sel = defaultSelection(b, data.groups);
    expect(validateSelection(b, data.groups, sel).ok).toBe(true);
    sel = toggleOption(data.groups.MEAL, sel, 'MEAL-1');
    expect(unitPrice(b, data.groups, sel)).toBe(13000);
  });
  it('عرض المقبلات لازم 3 بالضبط', () => {
    const a = item('F077');
    const g = data.groups.APPET_PICK;
    let sel = defaultSelection(a, data.groups);
    expect(validateSelection(a, data.groups, sel).ok).toBe(false);
    for (const o of g.options) sel = toggleOption(g, sel, o.id);
    expect(sel.APPET_PICK).toHaveLength(3); // الرابع والخامس ما ينضافون
    expect(validateSelection(a, data.groups, sel).ok).toBe(true);
  });
});

describe('رسالة الواتساب', () => {
  it('نفس الشكل المتفق عليه', () => {
    const lines = resolveLines(
      [
        { key: '1', itemId: 'F001', qty: 2, sel: { MEAL: ['MEAL-1'] }, note: 'بدون بصل' },
        { key: '2', itemId: 'F024', qty: 1, sel: { PIZZA_B: ['PIZZA_B-2'] }, note: '' },
        { key: '3', itemId: 'D035', qty: 1, sel: {}, note: '' },
      ],
      data,
      byId,
    );
    const subtotal = lines.reduce((a, l) => a + l.total, 0);
    const msg = buildWhatsAppMessage({
      number: 1047, lines: lines.map((l) => toOrderLine(l, data)), subtotal, deliveryFee: 2500, total: subtotal + 2500,
      type: 'delivery', customer: { name: 'أحمد علي', phone: '07801234567' }, zone: 'النجف', address: 'حي الأمير، قرب جامع الحسن',
      mapsUrl: 'https://maps.google.com/?q=32.000000,44.300000', note: '', payment: 'كاش عند الاستلام',
    });
    expect(msg).toBe([
      '🧾 طلب جديد #1047', '━━━━━━━━━━━━',
      '2× بركر فرايدي — 26,000', '   • وجبة (بطاطا + حلقات بصل + ببسي) (+3,000)', '   • ملاحظة: بدون بصل',
      '1× بيتزا ببروني (وسط) — 14,000', '1× آيس لاتيه — 5,000', '━━━━━━━━━━━━',
      'المجموع: 45,000', 'التوصيل: 2,500', 'الإجمالي: 47,500 د.ع', '━━━━━━━━━━━━',
      '👤 أحمد علي', '📞 07801234567', '🛵 توصيل — النجف', '📍 حي الأمير، قرب جامع الحسن',
      '🗺️ https://maps.google.com/?q=32.000000,44.300000', '💵 الدفع: كاش عند الاستلام',
    ].join('\n'));
  });
});

describe('الدوام (بغداد UTC+3)', () => {
  const h = data.settings.hours;
  const at = (iso: string) => isOpenAt(new Date(iso), h);
  it('12 الظهر → 12 بالليل', () => {
    expect(at('2026-11-16T11:59:00+03:00')).toBe(false);
    expect(at('2026-11-16T12:00:00+03:00')).toBe(true);
    expect(at('2026-11-16T23:59:00+03:00')).toBe(true);
    expect(at('2026-11-17T00:00:00+03:00')).toBe(false);
  });
});

describe('البحث والموبايل', () => {
  it('يطبّع العربي والمرادفات', () => {
    expect(normalizeQuery('برغر')).toBe('بركر');
    expect(normalizeQuery('آيس')).toBe('ايس');
    expect(searchItems(data.items, 'burger').length).toBeGreaterThan(5);
    expect(searchItems(data.items, 'قهوة').length).toBeGreaterThan(0);
  });
  it('رقم عراقي 11 رقم يبدي بـ 07', () => {
    expect(isValidPhone('07801234567')).toBe(true);
    expect(isValidPhone('٠٧٨٠١٢٣٤٥٦٧')).toBe(true);
    expect(cleanPhone('+964 780 123 4567')).toBe('07801234567');
    expect(isValidPhone('0780123456')).toBe(false);
    expect(isValidPhone('08801234567')).toBe(false);
  });
});

describe('التوصيل من الخريطة', () => {
  const s = data.settings;
  const najaf = { lat: 32.01622, lng: 44.345007 }; // المطعم (الغدير)
  const kufa = { lat: 32.0405, lng: 44.4015 };
  const far = { lat: 32.5, lng: 44.4 }; // الحلة تقريباً
  it('يحدد المنطقة من الدبوس', () => {
    expect(zoneAt(najaf, data.zones)?.name).toBe('النجف');
    expect(zoneAt(kufa, data.zones)?.name).toBe('الكوفة');
    expect(zoneAt(far, data.zones)).toBeNull();
  });
  it('الأجرة تلقائية: النجف 2,500 / الكوفة 3,000 / برا = خارج المنطقة / بدون دبوس = لازم يحدد', () => {
    expect(quoteDelivery(s, data.zones, najaf, 10000)).toMatchObject({ kind: 'fee', fee: 2500 });
    expect(quoteDelivery(s, data.zones, kufa, 10000)).toMatchObject({ kind: 'fee', fee: 3000 });
    expect(quoteDelivery(s, data.zones, far, 10000).kind).toBe('out');
    expect(quoteDelivery(s, data.zones, null, 10000).kind).toBe('need-pin');
  });
  it('مبلغ ثابت / الكاشير يحدد', () => {
    const fixed = { ...s, delivery: { ...s.delivery, feeMode: 'fixed' as const, fixedFee: 2000 } };
    expect(quoteDelivery(fixed, data.zones, kufa, 0)).toMatchObject({ kind: 'fee', fee: 2000 });
    const cashier = { ...s, delivery: { ...s.delivery, feeMode: 'cashier' as const } };
    expect(quoteDelivery(cashier, data.zones, najaf, 0).kind).toBe('cashier');
    const optional = { ...s, delivery: { ...s.delivery, locationRequired: false } };
    expect(quoteDelivery(optional, data.zones, null, 0).kind).toBe('cashier');
  });
  it('رسالة الكاشير يحدد الأجرة', () => {
    const msg = buildWhatsAppMessage({ number: 1001, lines: [], subtotal: 9000, deliveryFee: null, total: 9000, type: 'delivery', customer: { name: 'س', phone: '07801234567' }, zone: 'النجف', payment: 'كاش عند الاستلام' });
    expect(msg).toContain('التوصيل: يحددها الكاشير');
    expect(msg).toContain('الإجمالي: 9,000 د.ع + التوصيل');
  });
});

describe('Excel: تصدير ← استيراد يرجع نفس المنيو', () => {
  it('buildMenuSheets ثم parseMenuSheets', async () => {
    const { buildMenuSheets, parseMenuSheets } = await import('../src/lib/menuSheet');
    const sheets = buildMenuSheets(data);
    const p = parseMenuSheets(sheets as Record<string, unknown[][]>);
    expect(p.warnings).toEqual([]);
    expect(p.items).toHaveLength(data.items.length);
    for (const i of data.items) {
      const x = p.items.find((y) => y.id === i.id)!;
      expect([x.name, x.price, x.section, x.tab, x.groups.join(), x.image, x.available]).toEqual([i.name, i.price, i.section, i.tab, i.groups.join(), i.image, i.available]);
    }
    expect(Object.keys(p.groups)).toEqual(Object.keys(data.groups));
    expect(p.groups.APPET_PICK).toMatchObject({ kind: 'multi', min: 3, max: 3 });
    expect(p.zones).toEqual(data.zones.map((z) => ({ name: z.name, fee: z.fee })));
  });
});
