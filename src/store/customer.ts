import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** بيانات الزبون — تنحفظ على جهازه للمرة الجاية */
export interface Customer {
  type: 'delivery' | 'pickup';
  name: string;
  phone: string;
  zoneId: string;
  address: string;
  landmark: string;
  /** موقع التوصيل المؤكد (دبوس الخريطة) */
  pin?: { lat: number; lng: number } | null;
}

export const useCustomer = create<{ c: Customer; save: (c: Customer) => void }>()(
  persist(
    (set) => ({
      c: { type: 'delivery', name: '', phone: '', zoneId: '', address: '', landmark: '' },
      save: (c) => set({ c }),
    }),
    { name: 'fryday:customer', version: 1 },
  ),
);

/** الطلب الأخير (لشاشة التأكيد) */
export interface PlacedOrder {
  number: number;
  message: string;
  total: number;
  type: 'delivery' | 'pickup';
  sent: boolean;
  createdAt: number;
  /** وقت الوصول/التجهيز المتوقع بالدقائق */
  etaMinutes: number;
  /** رقم الطلب بالسيرفر + معرف الجهاز (حتى نأكد "انرسل") — null بدون سيرفر */
  id: number | null;
  clientId: string | null;
}

export const useLastOrder = create<{ order: PlacedOrder | null; set: (o: PlacedOrder | null) => void; markSent: () => void }>()(
  persist(
    (set) => ({
      order: null,
      set: (order) => set({ order }),
      markSent: () => set((s) => (s.order ? { order: { ...s.order, sent: true } } : s)),
    }),
    { name: 'fryday:last-order', version: 1 },
  ),
);

/** آخر طلب انطلب من هذا الموبايل (حتى "اطلب نفس طلبك السابق") */
export const usePastOrder = create<{ past: import('../lib/upsell').PastOrder | null; save: (p: import('../lib/upsell').PastOrder) => void; clear: () => void }>()(
  persist(
    (set) => ({ past: null, save: (past) => set({ past }), clear: () => set({ past: null }) }),
    { name: 'fryday:past-order', version: 1 },
  ),
);
