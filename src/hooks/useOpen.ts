import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useMenu } from '../data/MenuContext';
import { isOpenAt } from '../lib/hours';
import { useNow } from '../lib/useNow';

/** للتجربة بالمرحلة 0 فقط: تجاوز الدوام حتى أحمد يجرب الطلب بأي وقت */
export const useDemo = create<{ forceOpen: boolean; set: (v: boolean) => void }>()(
  persist((set) => ({ forceOpen: false, set: (forceOpen) => set({ forceOpen }) }), { name: 'fryday:demo' }),
);

export function useOpen() {
  const { data } = useMenu();
  const now = useNow();
  const force = useDemo((s) => s.forceOpen);
  const real = isOpenAt(now, data.settings.hours);
  return { open: real || force, realOpen: real, forced: force && !real, now };
}
