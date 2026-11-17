/**
 * البانر الذكي: يختار شرائح الرأس حسب الموسم ← الجو ← وقت اليوم (توقيت بغداد).
 * إذا ماكو شرائح مرفوعة من اللوحة، يسوي شرائح تلقائية من صور الأصناف المناسبة.
 */
import type { BannerCta, BannerSlot, Item, MenuData, Settings } from '../data/types';
import { activeSeason } from '../data/defaults';
import { localMinutes } from './hours';

export interface ResolvedSlide {
  key: string;
  slot: BannerSlot;
  /** cutout = صورة صنف بخلفية شفافة (عرض سينمائي) · media = صورة/فيديو مرفوع (يملي الرأس) */
  kind: 'cutout' | 'media';
  type: 'image' | 'video';
  src: string;
  poster?: string;
  title: string;
  subtitle?: string;
  cta: BannerCta;
  /** للشرائح التلقائية: الصنف نفسه (اسم وسعر) */
  item?: Item;
}

export type Daypart = 'lunch' | 'afternoon' | 'evening';
export type WeatherState = 'hot' | 'cold' | null;

const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + (m || 0);
};

/** وقت اليوم: الغدا / العصرية / السهرة (برا الأوقات = أقرب وقت: الصبح ← الغدا، بعد نص الليل ← السهرة) */
export function daypartAt(now: Date, s: Settings): Daypart {
  const cur = localMinutes(now, s.hours.utcOffset);
  for (const k of ['lunch', 'afternoon', 'evening'] as Daypart[]) {
    const d = s.banner.dayparts[k];
    const from = toMin(d.from);
    let to = toMin(d.to);
    if (to === 0) to = 1440;
    const inRange = from < to ? cur >= from && cur < to : cur >= from || cur < to;
    if (inRange) return k;
  }
  return cur < 6 * 60 ? 'evening' : 'lunch';
}

export function weatherState(tempC: number | null | undefined, s: Settings): WeatherState {
  if (!s.banner.weather.enabled || tempC == null || !Number.isFinite(tempC)) return null;
  if (tempC >= s.banner.weather.hotAbove) return 'hot';
  if (tempC <= s.banner.weather.coldBelow) return 'cold';
  return null;
}

function autoSlides(slot: BannerSlot, title: string, ids: string[], byId: Map<string, Item>): ResolvedSlide[] {
  return ids
    .map((id) => byId.get(id))
    .filter((i): i is Item => !!i && !!i.image && i.available && i.orderable)
    .map((i) => ({
      key: `auto-${slot}-${i.id}`,
      slot,
      kind: 'cutout' as const,
      type: 'image' as const,
      src: i.image!,
      title,
      subtitle: i.name,
      cta: { type: 'item' as const, target: i.id, label: 'اطلبه' },
      item: i,
    }));
}

export interface PickInput {
  menu: Pick<MenuData, 'items' | 'settings'>;
  now: Date;
  tempC?: number | null;
  /** معاينة من اللوحة: #/?preview=hot */
  preview?: BannerSlot | null;
}

/** الشرائح المناسبة هسه (بالترتيب). فاضية = نرجع لصورة الرأس الافتراضية */
export function pickSlides({ menu, now, tempC, preview }: PickInput): { slides: ResolvedSlide[]; daypart: Daypart; weather: WeatherState; season: boolean } {
  const s = menu.settings;
  const b = s.banner;
  const byId = new Map(menu.items.map((i) => [i.id, i]));
  const isDaypart = (x: unknown): x is Daypart => x === 'lunch' || x === 'afternoon' || x === 'evening';
  const daypart = isDaypart(preview) ? preview : daypartAt(now, s);
  const weather: WeatherState = preview === 'hot' || preview === 'cold' ? preview : preview ? null : weatherState(tempC, s);
  const season = preview === 'season' ? true : !preview && !!activeSeason(s, now);
  if (!b.enabled) return { slides: [], daypart, weather, season };

  const uploaded = (slot: BannerSlot) =>
    b.slides
      .filter((x) => x.enabled && x.slot === slot && x.media?.src)
      .map((x): ResolvedSlide => ({ key: x.id, slot, kind: 'media', type: x.media.type, src: x.media.src, poster: x.media.poster, title: x.title, subtitle: x.subtitle, cta: x.cta, item: x.cta.type === 'item' ? byId.get(x.cta.target) : undefined }));

  const out: ResolvedSlide[] = [];
  if (season) out.push(...uploaded('season'));
  if (weather) {
    const up = uploaded(weather);
    out.push(...(up.length || !b.auto ? up : autoSlides(weather, b.weather[weather].title, b.weather[weather].items, byId)));
  }
  const dp = uploaded(daypart);
  out.push(...(dp.length || !b.auto ? dp : autoSlides(daypart, b.dayparts[daypart].title, b.dayparts[daypart].items, byId)));
  out.push(...uploaded('any'));
  // بدون تكرار نفس الصنف
  const seen = new Set<string>();
  const slides = out.filter((x) => { const k = x.item ? `i:${x.item.id}` : `s:${x.key}`; if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 8);
  return { slides, daypart, weather, season };
}
