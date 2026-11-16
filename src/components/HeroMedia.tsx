import { useState } from 'react';
import type { HeroMedia as Media, Settings } from '../data/types';
import { photo } from '../lib/format';

/** صورة صنف (burger-mushroom.webp) أو رابط كامل (من اللوحة/R2 بالمرحلة 1) */
export function resolveMedia(src: string): string {
  return /^(https?:|\/|data:|blob:)/.test(src) ? src : photo(src, 'lg');
}

/** صورة صنف مقصوصة بخلفية شفافة؟ (تنعرض "سينمائي" بإضاءة وظل، مو cover) */
export const isCutout = (src: string) => !/^(https?:|\/|data:|blob:)/.test(src);

/**
 * محتوى الرأس: بالمرحلة 2 يصير البانر الذكي (صور/فيديو من اللوحة).
 * إذا ماكو محتوى أو فشل التحميل → يرجع للصورة الافتراضية (settings.hero.image).
 */
export function useHeroMedia(hero: Settings['hero']): Media & { cutout: boolean; onError: () => void } {
  const [failed, setFailed] = useState(false);
  const m = !failed ? hero.media[0] : undefined;
  const media: Media = m ?? { type: 'image', src: hero.image };
  return { ...media, cutout: media.type === 'image' && isCutout(media.src), onError: () => setFailed(true) };
}
