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
