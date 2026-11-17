import type { Env } from '../../server/env';
import { ensureReady, getSettings } from '../../server/db';
import { json } from '../../server/http';

/**
 * GET /api/weather — حرارة النجف هسه من Open-Meteo (مجاني، بدون مفتاح).
 * محفوظة بالكاش ساعة، حتى ما نطلب من Open-Meteo بكل زيارة.
 */
export const onRequestGet: PagesFunction<Env> = async ({ env, request, waitUntil }) => {
  const cache = (caches as unknown as { default: Cache }).default;
  const key = new Request(new URL('/api/weather?v=1', request.url).toString());
  const hit = await cache.match(key);
  if (hit) return hit;
  let lat = 32.0162;
  let lng = 44.345;
  try {
    if (env.DB) { await ensureReady(env.DB); const s = await getSettings(env.DB); lat = s.location.lat; lng = s.location.lng; }
  } catch { /* نستخدم موقع المطعم الافتراضي */ }
  let tempC: number | null = null;
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 3500);
    const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(3)}&longitude=${lng.toFixed(3)}&current=temperature_2m&timezone=Asia%2FBaghdad`, { signal: ctl.signal });
    clearTimeout(t);
    if (r.ok) {
      const d = (await r.json()) as { current?: { temperature_2m?: number } };
      if (typeof d.current?.temperature_2m === 'number') tempC = Math.round(d.current.temperature_2m * 10) / 10;
    }
  } catch { /* بدون جو — البانر يشتغل حسب الوقت بس */ }
  const res = json({ tempC, at: new Date().toISOString() }, { cache: tempC == null ? 'public, max-age=300' : 'public, max-age=3600' });
  waitUntil(cache.put(key, res.clone()));
  return res;
};
