import { describe, it, expect } from 'vitest';
import menu from '../src/data/menu.json';
import type { MenuData, Settings } from '../src/data/types';
import { DEFAULT_SETTINGS, mergeSettings, activeSeason, effectiveHours } from '../src/data/defaults';
import { pickSlides, daypartAt, weatherState } from '../src/lib/banner';
import { mealOffer, cartSuggestions, rebuildOrder, type PastOrder } from '../src/lib/upsell';
import { resolveLines } from '../src/store/cartCore';
import { isOpenAt } from '../src/lib/hours';

const base = menu as unknown as MenuData;
const data: MenuData = { ...base, settings: mergeSettings(DEFAULT_SETTINGS, base.settings) };
const byId = new Map(data.items.map((i) => [i.id, i]));
const at = (hhmm: string, day = '2026-11-17') => new Date(`${day}T${hhmm}:00+03:00`);
const withS = (p: Partial<Settings> | Record<string, unknown>): MenuData => ({ ...data, settings: mergeSettings(data.settings, p) });

describe('البانر الذكي', () => {
  it('وقت اليوم بتوقيت بغداد', () => {
    expect(daypartAt(at('13:00'), data.settings)).toBe('lunch');
    expect(daypartAt(at('17:30'), data.settings)).toBe('afternoon');
    expect(daypartAt(at('21:00'), data.settings)).toBe('evening');
    expect(daypartAt(at('23:59'), data.settings)).toBe('evening');
    expect(daypartAt(at('01:00'), data.settings)).toBe('evening'); // بعد نص الليل
    expect(daypartAt(at('09:00'), data.settings)).toBe('lunch'); // الصبح
  });
  it('شرائح تلقائية من الأصناف لكل وقت', () => {
    const l = pickSlides({ menu: data, now: at('13:00') });
    expect(l.slides.map((s) => s.item?.id)).toEqual(['F039', 'F042', 'F015', 'F034']);
    expect(l.slides[0]).toMatchObject({ kind: 'cutout', title: 'وقت الغدا' });
    expect(pickSlides({ menu: data, now: at('17:00') }).slides[0].item?.id).toBe('D039');
    expect(pickSlides({ menu: data, now: at('21:00') }).slides[0].item?.id).toBe('F024');
  });
  it('الجو: فوك 40 يبرز البارد، تحت 15 يبرز الحار', () => {
    expect(weatherState(43, data.settings)).toBe('hot');
    expect(weatherState(12, data.settings)).toBe('cold');
    expect(weatherState(25, data.settings)).toBeNull();
    expect(weatherState(null, data.settings)).toBeNull();
    const hot = pickSlides({ menu: data, now: at('13:00'), tempC: 44 });
    expect(hot.weather).toBe('hot');
    expect(hot.slides[0]).toMatchObject({ slot: 'hot', title: 'حر اليوم 🔥 برّد على نفسك' });
    expect(hot.slides[0].item?.tab).toBe('drinks');
    expect(pickSlides({ menu: data, now: at('13:00'), tempC: 10 }).slides[0].item?.id).toBe('D021');
  });
  it('الشرائح المرفوعة تطلع بدل التلقائي، والمطفية ما تطلع', () => {
    const m = withS({ banner: { slides: [
      { id: 'v1', slot: 'lunch', enabled: true, media: { type: 'video', src: '/media/video/a.mp4', poster: '/media/video/a.webp' }, title: 'غداك جاهز', cta: { type: 'section', target: 'المشويات', label: 'شوف المشويات' } },
      { id: 'v2', slot: 'lunch', enabled: false, media: { type: 'image', src: '/media/items/b.webp' }, title: 'مطفية', cta: { type: 'none', target: '', label: '' } },
    ] } });
    const r = pickSlides({ menu: m, now: at('13:00') });
    expect(r.slides).toHaveLength(1);
    expect(r.slides[0]).toMatchObject({ kind: 'media', type: 'video', title: 'غداك جاهز' });
    // بالعصرية ماكو مرفوع → تلقائي
    expect(pickSlides({ menu: m, now: at('17:00') }).slides[0].kind).toBe('cutout');
  });
  it('الصنف الخالص ما يطلع بالبانر، والبانر المطفي ما يرجع شي', () => {
    const m = { ...data, items: data.items.map((i) => (i.id === 'F039' ? { ...i, available: false } : i)) };
    expect(pickSlides({ menu: m, now: at('13:00') }).slides.some((s) => s.item?.id === 'F039')).toBe(false);
    expect(pickSlides({ menu: withS({ banner: { enabled: false } }), now: at('13:00') }).slides).toEqual([]);
  });
  it('المعاينة من اللوحة', () => {
    expect(pickSlides({ menu: data, now: at('13:00'), preview: 'evening' }).daypart).toBe('evening');
    expect(pickSlides({ menu: data, now: at('13:00'), tempC: 44, preview: 'cold' }).weather).toBe('cold');
  });
});

describe('المواسم', () => {
  const ramadan = withS({ season: { enabled: true, hours: { enabled: true, open: '17:00', close: '03:00' }, until: '2026-11-20' } });
  it('أوقات الموسم تبدل الدوام وتنتهي بالتاريخ', () => {
    expect(activeSeason(ramadan.settings, at('13:00'))).not.toBeNull();
    expect(isOpenAt(at('13:00'), effectiveHours(ramadan.settings, at('13:00')))).toBe(false);
    expect(isOpenAt(at('18:00'), effectiveHours(ramadan.settings, at('18:00')))).toBe(true);
    expect(isOpenAt(at('02:30', '2026-11-18'), effectiveHours(ramadan.settings, at('02:30', '2026-11-18')))).toBe(true);
    // بعد تاريخ الانتهاء يرجع الطبيعي
    expect(activeSeason(ramadan.settings, at('13:00', '2026-11-21'))).toBeNull();
    expect(isOpenAt(at('13:00', '2026-11-21'), effectiveHours(ramadan.settings, at('13:00', '2026-11-21')))).toBe(true);
  });
  it('شرائح الموسم تطلع أول', () => {
    const m = withS({ season: { enabled: true }, banner: { slides: [{ id: 'r', slot: 'season', enabled: true, media: { type: 'image', src: '/media/items/r.webp' }, title: 'رمضان كريم', cta: { type: 'none', target: '', label: '' } }] } });
    expect(pickSlides({ menu: m, now: at('21:00') }).slides[0].title).toBe('رمضان كريم');
  });
});

describe('حوّل لوجبة؟', () => {
  it('يسأل بس إذا الصنف بيه وجبة وما اختارها', () => {
    const burger = byId.get('F001')!;
    expect(mealOffer(burger, { MEAL: [] }, data)).toMatchObject({ price: 3000, optionId: 'MEAL-1' });
    expect(mealOffer(burger, { MEAL: ['MEAL-1'] }, data)).toBeNull();
    expect(mealOffer(byId.get('F011')!, {}, data)).toBeNull(); // وجبة الأطفال
    expect(mealOffer(byId.get('D035')!, {}, data)).toBeNull();
    expect(mealOffer(burger, {}, withS({ upsell: { meal: { enabled: false, group: 'MEAL' } } }))).toBeNull();
  });
});

describe('تكمّل طلبك؟', () => {
  const lines = (arr: { id: string; sel?: Record<string, string[]> }[]) => resolveLines(arr.map((x, k) => ({ key: `k${k}`, itemId: x.id, qty: 1, sel: x.sel ?? {}, note: '' })), data, byId);
  it('ماكو مشروب ← مشروبات، أكل بدون حلو ← حلويات', () => {
    const s = cartSuggestions(lines([{ id: 'F001', sel: { MEAL: [] } }]), data);
    expect(s.filter((x) => x.kind === 'drink').map((x) => x.item!.id)).toEqual(['D035', 'D057']);
    expect(s.filter((x) => x.kind === 'sweet').map((x) => x.item!.id)).toEqual(['S001', 'S002']);
    expect(s.length).toBeLessThanOrEqual(5);
  });
  it('مقالي بدون صلصة ← صلصة إضافية، وما يقترح اللي بالسلة', () => {
    const s = cartSuggestions(lines([{ id: 'F060', sel: { EXTRA_SAUCE: [] } }, { id: 'D035' }]), data);
    expect(s[0]).toMatchObject({ kind: 'sauce', lineKey: 'k0' });
    expect(s.some((x) => x.kind === 'drink')).toBe(false); // عنده مشروب
    expect(s.some((x) => x.item?.id === 'D035')).toBe(false);
  });
  it('السلة فيها كلشي → اقتراحات قليلة أو ماكو', () => {
    const s = cartSuggestions(lines([{ id: 'F001', sel: { MEAL: [] } }, { id: 'D035' }, { id: 'S005' }]), data);
    expect(s.every((x) => x.kind !== 'drink' && x.kind !== 'sweet')).toBe(true);
  });
});

describe('اطلب نفس طلبك السابق', () => {
  const past: PastOrder = {
    total: 30000, at: 0,
    lines: [
      { itemId: 'F001', qty: 2, sel: { MEAL: ['MEAL-1'] }, note: 'بدون بصل', unit: 13000, name: 'بركر فرايدي' },
      { itemId: 'F024', qty: 1, sel: { PIZZA_B: ['PIZZA_B-2'] }, note: '', unit: 12000, name: 'بيتزا ببروني' },
      { itemId: 'D035', qty: 1, sel: {}, note: '', unit: 5000, name: 'آيس لاتيه' },
    ],
  };
  it('يرجّع نفس السلة ويوضح السعر اللي تغير', () => {
    const r = rebuildOrder(past, data);
    expect(r.add).toHaveLength(3);
    expect(r.add[0]).toMatchObject({ itemId: 'F001', qty: 2, note: 'بدون بصل' });
    expect(r.priceChanged).toEqual([{ name: 'بيتزا ببروني', from: 12000, to: 14000 }]);
    expect(r.skipped).toEqual([]);
  });
  it('يتجاهل الخالص والمحذوف', () => {
    const m = { ...data, items: data.items.filter((i) => i.id !== 'D035').map((i) => (i.id === 'F024' ? { ...i, available: false } : i)) };
    const r = rebuildOrder(past, m);
    expect(r.add.map((x) => x.itemId)).toEqual(['F001']);
    expect(r.skipped).toEqual(['بيتزا ببروني', 'آيس لاتيه']);
  });
});
