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
