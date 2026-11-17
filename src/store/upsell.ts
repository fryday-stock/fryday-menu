import { create } from 'zustand';

/** سؤال "تحوّله لوجبة؟" المعلّق (يطلع بعد ما تنسد صفحة الصنف) */
export interface MealAsk {
  lineKey: string;
  itemName: string;
  image: string | null;
  group: string;
  optionId: string;
  price: number;
  label: string;
}

export const useUpsell = create<{ meal: MealAsk | null; ask: (m: MealAsk) => void; close: () => void }>((set) => ({
  meal: null,
  ask: (meal) => set({ meal }),
  close: () => set({ meal: null }),
}));

/** ملاحظة تطلع بأول السلة (مثلاً: صنف من طلبك السابق خالص، أو سعره تغير) */
export const useCartNotice = create<{ notes: string[]; set: (n: string[]) => void }>((set) => ({ notes: [], set: (notes) => set({ notes }) }));
