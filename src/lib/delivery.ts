import type { Settings, Zone } from '../data/types';

export interface LatLng {
  lat: number;
  lng: number;
}

/** نقطة داخل مضلع؟ (ray casting، المضلع [lat, lng]) */
export function pointInPolygon(p: LatLng, poly: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [yi, xi] = poly[i];
    const [yj, xj] = poly[j];
    if (yi > p.lat !== yj > p.lat && p.lng < ((xj - xi) * (p.lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** المنطقة اللي بيها الدبوس (أول منطقة تطابق) */
export function zoneAt(p: LatLng, zones: Zone[]): Zone | null {
  return zones.find((z) => z.polygon.length >= 3 && pointInPolygon(p, z.polygon)) ?? null;
}

export type DeliveryQuote =
  /** أجرة معروفة */
  | { kind: 'fee'; fee: number; zone: Zone | null }
  /** الكاشير يحدد الأجرة */
  | { kind: 'cashier'; zone: Zone | null }
  /** الدبوس برا مناطق التوصيل */
  | { kind: 'out' }
  /** لازم يحدد موقعه أول */
  | { kind: 'need-pin' };

/** يحسب أجرة التوصيل حسب الإعدادات (تلقائية من الخريطة / ثابتة / الكاشير) */
export function quoteDelivery(s: Settings, zones: Zone[], pin: LatLng | null, subtotal: number): DeliveryQuote {
  const hasAreas = zones.some((z) => z.polygon.length >= 3);
  const zone = pin ? zoneAt(pin, zones) : null;
  if (pin && hasAreas && !zone) return { kind: 'out' };
  if (!pin && s.delivery.locationRequired) return { kind: 'need-pin' };
  if (s.delivery.feeMode === 'cashier') return { kind: 'cashier', zone };
  let fee: number;
  if (s.delivery.feeMode === 'fixed') fee = s.delivery.fixedFee;
  else if (zone) fee = zone.fee;
  else return { kind: 'cashier', zone: null }; // تلقائية بس بدون دبوس (الموقع اختياري)
  if (s.freeDelivery.enabled && subtotal >= s.freeDelivery.threshold) fee = 0;
  return { kind: 'fee', fee, zone };
}

/** وصف مختصر لأجرة التوصيل (للرأس والسلة) قبل ما يحدد الزبون موقعه */
export function feeSummary(s: Settings, zones: Zone[]): string {
  if (!s.delivery.enabled) return 'استلام من المطعم';
  if (s.delivery.feeMode === 'cashier') return 'يحددها الكاشير';
  if (s.delivery.feeMode === 'fixed') return s.delivery.fixedFee ? `${s.delivery.fixedFee.toLocaleString('en-US')}` : 'مجاني';
  const fees = zones.map((z) => z.fee);
  return fees.length ? `من ${Math.min(...fees).toLocaleString('en-US')}` : '';
}

export function mapsUrl(p: LatLng): string {
  return `https://maps.google.com/?q=${p.lat.toFixed(6)},${p.lng.toFixed(6)}`;
}
