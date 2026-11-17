import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useMenu } from '../data/MenuContext';
import { isOpenAt } from '../lib/hours';
import { activeSeason, effectiveHours } from '../data/defaults';
import { useNow } from '../lib/useNow';

/** للتجربة بالمرحلة 0 فقط: تجاوز الدوام حتى أحمد يجرب الطلب بأي وقت */
export const useDemo = create<{ forceOpen: boolean; set: (v: boolean) => void }>()(
  persist((set) => ({ forceOpen: false, set: (forceOpen) => set({ forceOpen }) }), { name: 'fryday:demo' }),
);

export function useOpen() {
  const { data } = useMenu();
  const now = useNow();
  // وضع التجربة يشتغل بس بدون سيرفر (GitHub Pages) — السيرفر دائماً يتأكد من الدوام
  const force = useDemo((s) => s.forceOpen) && !data.live;
  const real = isOpenAt(now, effectiveHours(data.settings, now));
  const season = activeSeason(data.settings, now);
  const paused = data.settings.paused.enabled;
  const hoursOpen = real || force;
  const open = hoursOpen && !paused;
  /** سبب تسكير زر الطلب (يطلع للزبون) */
  const reason = paused ? data.settings.paused.message : !hoursOpen ? (season?.hours.enabled ? `${season.name}: الطلبات من ${season.hours.open} لـ ${season.hours.close}` : data.settings.closedMessage) : '';
  return { open, hoursOpen, paused, realOpen: real, forced: force && !real, now, reason, season };
}
