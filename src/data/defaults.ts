/**
 * القيم الافتراضية للإعدادات (اللي مو موجودة بالـ Excel).
 * تنستخدم بسكربت الاستيراد، وبالسيرفر (تندمج ويا الإعدادات المحفوظة بـ D1 حتى أي إعداد جديد ياخذ قيمة).
 */
import type { MapProvider, Settings } from './types';

/** حدود تقريبية للنجف والكوفة [lat, lng] — تتعدل من اللوحة */
export const ZONE_POLYGONS: Record<string, [number, number][]> = {
  'النجف': [
    [32.078, 44.262], [32.078, 44.376], [32.040, 44.377], [32.000, 44.381], [31.960, 44.380],
    [31.922, 44.360], [31.918, 44.300], [31.950, 44.262], [32.010, 44.248],
  ],
  'الكوفة': [
    [32.078, 44.376], [32.098, 44.392], [32.098, 44.462], [32.060, 44.478], [32.010, 44.468],
    [31.982, 44.440], [31.982, 44.398], [32.000, 44.381], [32.040, 44.377],
  ],
};

/** مزودات خرائط جاهزة — تنختار من اللوحة، أو "مخصص" برابط بلاطات ثاني */
export const MAP_PRESETS: Record<string, MapProvider> = {
  osm: {
    provider: 'osm',
    tileUrl: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
    maxZoom: 19,
  },
  carto: {
    provider: 'carto',
    tileUrl: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> © <a href="https://carto.com/attributions" target="_blank" rel="noopener">CARTO</a>',
    maxZoom: 20,
    subdomains: 'abcd',
  },
};

export const DEFAULT_SETTINGS: Settings = {
  restaurantName: 'فرايدي',
  restaurantNameEn: 'FRY DAY',
  tagline: 'Fries & Pastry',
  whatsapp: '9647715796059',
  phones: ['7320', '07893000406'],
  callPhone: '07893000406',
  address: 'النجف — شارع الغدير، مجاور جسر المشاة',
  hours: { open: '12:00', close: '24:00', utcOffset: 3 },
  closedMessage: 'نستقبل الطلبات من الساعة 12 الظهر',
  deliveryNote: 'التوصيل داخل النجف والكوفة فقط',
  minOrder: { enabled: false, amount: 0 },
  freeDelivery: { enabled: false, threshold: 0 },
  payment: 'كاش عند الاستلام',
  etaMinutes: 45,
  location: { lat: 32.01622, lng: 44.345007 },
  delivery: { enabled: true, feeMode: 'map', fixedFee: 2500, locationRequired: true },
  pickup: { enabled: true },
  hero: { image: 'burger-mushroom.webp', media: [] },
  messages: {
    outOfZone: 'نعتذر، هذا الموقع خارج منطقة التوصيل (النجف والكوفة فقط)',
    cashierFee: 'أجرة التوصيل يأكدها الكاشير',
  },
  pickupMinutes: 20,
  busy: { enabled: false, deliveryMinutes: 75, pickupMinutes: 40, message: 'عدنا ضغط طلبات هسه — الطلب ياخذ وقت أطول شوية. شكراً لصبركم 🙏' },
  paused: { enabled: false, message: 'الطلبات أونلاين متوقفة مؤقتاً — تگدر تتصل بينا' },
  map: MAP_PRESETS.osm,
  banner: {
    enabled: true,
    auto: true,
    intervalSec: 6,
    dayparts: {
      lunch: { from: '12:00', to: '16:00', title: 'وقت الغدا', items: ['F039', 'F042', 'F015', 'F034'] },
      afternoon: { from: '16:00', to: '20:00', title: 'قهوة وحلو العصرية', items: ['D039', 'S001', 'S017', 'D041'] },
      evening: { from: '20:00', to: '24:00', title: 'سهرة العائلة', items: ['F024', 'F020', 'F005', 'F069'] },
    },
    weather: {
      enabled: true,
      hotAbove: 40,
      coldBelow: 15,
      hot: { title: 'حر اليوم 🔥 برّد على نفسك', items: ['D042', 'D047', 'D039', 'D044'] },
      cold: { title: 'برد اليوم ☕ دفّي نفسك', items: ['D021', 'D015', 'D024', 'D022'] },
    },
    slides: [],
  },
  upsell: {
    meal: { enabled: true, group: 'MEAL' },
    cart: { enabled: true, drinks: ['D035', 'D057', 'D048', 'D042', 'D001'], sweets: ['S001', 'S002', 'S016', 'S005'], sauceGroup: 'EXTRA_SAUCE' },
  },
  featured: { enabled: true, title: 'الأكثر طلباً', items: ['F001', 'F015', 'F024', 'F069', 'D039', 'S001'] },
  reorder: { enabled: true },
  mascot: { enabled: true, image: null },
  season: { enabled: false, kind: 'ramadan', name: 'رمضان كريم', message: 'رمضان كريم 🌙 الطلبات من الفطور للسحور', hours: { enabled: true, open: '17:00', close: '03:00' }, until: null },
  social: { instagram: 'fryday.iq', tiktok: 'fryday.iq', facebook: 'fryday' },
};

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

/** دمج عميق: القيم المحفوظة فوق الافتراضية (المصفوفات تنستبدل) */
export function mergeSettings<T>(base: T, over: unknown): T {
  if (!isObj(base) || !isObj(over)) return (over === undefined ? base : (over as T));
  const out: Record<string, unknown> = { ...base };
  for (const [k, v] of Object.entries(over)) {
    if (v === undefined) continue;
    out[k] = isObj((base as Record<string, unknown>)[k]) && isObj(v) ? mergeSettings((base as Record<string, unknown>)[k], v) : v;
  }
  return out as T;
}

/** وقت التوصيل/الاستلام الفعلي (مع وضع الضغط العالي) */
export function etaFor(s: Settings, type: 'delivery' | 'pickup'): number {
  if (type === 'pickup') return s.busy.enabled ? s.busy.pickupMinutes : s.pickupMinutes;
  return s.busy.enabled ? s.busy.deliveryMinutes : s.etaMinutes;
}

/** الموسم فعّال هسه؟ (وينتهي تلقائياً بعد تاريخ until بتوقيت بغداد) */
export function activeSeason(s: Settings, now: Date = new Date()): Settings['season'] | null {
  if (!s.season.enabled) return null;
  if (s.season.until) {
    const day = new Date(now.getTime() + s.hours.utcOffset * 3600_000).toISOString().slice(0, 10);
    if (day > s.season.until) return null;
  }
  return s.season;
}

/** الدوام الفعلي: أوقات الموسم إذا مفعّلة، وإلا الدوام العادي */
export function effectiveHours(s: Settings, now: Date = new Date()): Settings['hours'] {
  const season = activeSeason(s, now);
  return season?.hours.enabled ? { open: season.hours.open, close: season.hours.close, utcOffset: s.hours.utcOffset } : s.hours;
}
