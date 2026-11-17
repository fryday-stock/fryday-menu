import { useEffect, useState } from 'react';
import { useMenu } from '../data/MenuContext';
import type { BannerSlot } from '../data/types';

const SLOTS: BannerSlot[] = ['lunch', 'afternoon', 'evening', 'hot', 'cold', 'season'];

/** معاينة البانر من اللوحة: #/?preview=hot (حتى أحمد يشوف كل وقت بدون ما ينتظر) */
export function usePreviewSlot(): BannerSlot | null {
  const read = () => {
    const v = new URLSearchParams(window.location.hash.split('?')[1] ?? '').get('preview');
    return SLOTS.includes(v as BannerSlot) ? (v as BannerSlot) : null;
  };
  const [p, setP] = useState(read);
  useEffect(() => {
    const on = () => setP(read());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return p;
}

/** حرارة النجف (من /api/weather — كاش ساعة بالسيرفر و30 دقيقة بالموبايل) */
export function useWeather(): number | null {
  const { data } = useMenu();
  const enabled = data.live && data.settings.banner.enabled && data.settings.banner.weather.enabled;
  const [t, setT] = useState<number | null>(() => {
    try {
      const c = JSON.parse(sessionStorage.getItem('fryday:weather') ?? 'null');
      return c && Date.now() - c.at < 30 * 60_000 ? c.tempC : null;
    } catch { return null; }
  });
  useEffect(() => {
    if (!enabled || t != null) return;
    const ctl = new AbortController();
    fetch(`${import.meta.env.BASE_URL}api/weather`, { signal: ctl.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d && typeof d.tempC === 'number') {
          setT(d.tempC);
          try { sessionStorage.setItem('fryday:weather', JSON.stringify({ tempC: d.tempC, at: Date.now() })); } catch { /* */ }
        }
      })
      .catch(() => {});
    return () => ctl.abort();
  }, [enabled, t]);
  return enabled ? t : null;
}

/** نت ضعيف أو توفير بيانات → ما نشغل فيديو (تطلع صورته بداله) */
export function canAutoplayVideo(): boolean {
  const c = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  if (c?.saveData) return false;
  if (c?.effectiveType && /(^|-)2g$|slow/.test(c.effectiveType)) return false;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  return true;
}
