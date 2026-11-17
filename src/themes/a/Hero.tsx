import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useScroll, useTransform, useReducedMotion } from 'motion/react';
import { MapPin, Thermometer } from 'lucide-react';
import type { BannerCta, BannerSlot } from '../../data/types';
import { useMenu } from '../../data/MenuContext';
import { Logo } from '../../components/Logo';
import { Price } from '../../components/Price';
import { StatusPill } from '../../components/StatusPill';
import { resolveMedia, isCutout } from '../../components/HeroMedia';
import { mapsUrl } from '../../lib/delivery';
import { pickSlides, type ResolvedSlide } from '../../lib/banner';
import { useNow } from '../../lib/useNow';
import { usePreviewSlot, useWeather, canAutoplayVideo } from '../../hooks/useBannerContext';
import { useQuickAdd } from '../shared';

const DARK = '#0e0a07';
const LIGHT = '#f7f4ee';

/** إضاءة كل وقت/حالة (لون الضوء خلف الطبق وتدرج الخلفية) */
const MOOD: Record<BannerSlot, { glow: string; top: string }> = {
  lunch: { glow: 'rgba(255,176,64,0.45)', top: '#3a2312' },
  afternoon: { glow: 'rgba(255,150,120,0.40)', top: '#3a1f1c' },
  evening: { glow: 'rgba(255,90,60,0.42)', top: '#3a140f' },
  hot: { glow: 'rgba(80,200,255,0.42)', top: '#0f2a3a' },
  cold: { glow: 'rgba(255,150,60,0.50)', top: '#3a220f' },
  season: { glow: 'rgba(170,140,255,0.42)', top: '#221a3a' },
  any: { glow: 'rgba(255,176,64,0.45)', top: '#3a2312' },
};

function SlideMedia({ slide, interval, reduce }: { slide: ResolvedSlide; interval: number; reduce: boolean }) {
  const [failed, setFailed] = useState(false);
  if (slide.kind === 'cutout') {
    // حركة سينمائية ناعمة (Ken Burns): تكبير بطيء + انزياح خفيف
    return (
      <div className="absolute inset-x-0 top-[104px] h-[262px]">
        <div className="absolute bottom-3 left-1/2 h-9 w-[64%] -translate-x-1/2 rounded-[50%] bg-black/70 blur-[10px]" />
        <motion.img
          src={resolveMedia(slide.src)} alt={slide.item?.name ?? slide.title} decoding="async"
          initial={reduce ? false : { scale: 0.96, x: 8 }} animate={reduce ? undefined : { scale: 1.07, x: -8 }} transition={{ duration: interval + 1, ease: 'linear' }}
          className="relative mx-auto h-full w-[84%] object-contain [filter:drop-shadow(0_26px_28px_rgba(0,0,0,0.7))_saturate(1.08)_contrast(1.04)]"
        />
      </div>
    );
  }
  const poster = slide.poster ? resolveMedia(slide.poster) : undefined;
  const fill = 'absolute inset-0 h-full w-full object-cover';
  if (slide.type === 'video' && !failed && canAutoplayVideo()) {
    return <video src={resolveMedia(slide.src)} poster={poster} autoPlay muted loop playsInline preload="metadata" onError={() => setFailed(true)} className={fill} />;
  }
  const src = slide.type === 'video' ? poster : resolveMedia(slide.src);
  if (!src) return null;
  return (
    <motion.img src={src} alt={slide.title} decoding="async" className={fill}
      initial={reduce ? false : { scale: 1.02 }} animate={reduce ? undefined : { scale: 1.1 }} transition={{ duration: interval + 1, ease: 'linear' }} />
  );
}

/**
 * الرأس السينمائي الغامق + البانر الذكي (حسب الوقت والجو والموسم).
 * كله من الإعدادات: الشرائح المرفوعة من اللوحة، أو تلقائية من صور الأصناف.
 */
export function DarkHero({ onSection }: { onSection: (name: string) => void }) {
  const { data } = useMenu();
  const s = data.settings;
  const q = useQuickAdd();
  const reduce = !!useReducedMotion();
  const now = useNow();
  const tempC = useWeather();
  const preview = usePreviewSlot();
  const { scrollY } = useScroll();
  // مع السكرول: الرأس يصغر وينزل بنعومة ويخفت
  const shrink = useTransform(scrollY, [0, 420], [1, reduce ? 1 : 0.86]);
  const drift = useTransform(scrollY, [0, 420], [0, reduce ? 0 : 90]);
  const fade = useTransform(scrollY, [0, 320], [1, 0.2]);

  const picked = useMemo(() => pickSlides({ menu: data, now, tempC, preview }), [data, now, tempC, preview]);
  const slides: ResolvedSlide[] = useMemo(() => {
    if (picked.slides.length) return picked.slides;
    // ماكو شرائح → صورة الرأس الافتراضية (إعداد)
    const src = s.hero.image;
    const item = isCutout(src) ? data.items.find((i) => i.image === src && i.orderable && i.available) : undefined;
    return [{ key: 'default', slot: 'any', kind: isCutout(src) ? 'cutout' : 'media', type: 'image', src, title: '', subtitle: item?.name, cta: item ? { type: 'item', target: item.id, label: 'اطلبه' } : { type: 'none', target: '', label: '' }, item }];
  }, [picked.slides, s.hero.image, data.items]);

  const [idx, setIdx] = useState(0);
  const cur = slides[idx % slides.length];
  const interval = s.banner.intervalSec;
  useEffect(() => { setIdx(0); }, [slides.length, preview]);
  useEffect(() => {
    if (slides.length < 2) return;
    const t = setInterval(() => { if (!document.hidden) setIdx((x) => (x + 1) % slides.length); }, interval * 1000);
    return () => clearInterval(t);
  }, [slides.length, interval, idx]);

  // سحب يمين/يسار لتبديل الشريحة
  const touch = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => { touch.current = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touch.current == null || slides.length < 2) return;
    const dx = e.changedTouches[0].clientX - touch.current;
    touch.current = null;
    if (Math.abs(dx) > 45) setIdx((x) => (x + (dx > 0 ? -1 : 1) + slides.length) % slides.length);
  };

  // لون شريط المتصفح: غامق فوق، فاتح لما ينزل للمنيو
  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    const set = (v: number) => meta?.setAttribute('content', v > 360 ? LIGHT : DARK);
    set(scrollY.get());
    return scrollY.on('change', set);
  }, [scrollY]);

  const act = (cta: BannerCta, slide: ResolvedSlide) => {
    if (cta.type === 'item') { const it = slide.item ?? data.items.find((i) => i.id === cta.target); if (it) q.open(it); }
    else if (cta.type === 'section') onSection(cta.target);
  };
  const mood = MOOD[cur.slot] ?? MOOD.any;
  const headline = cur.kind === 'cutout' ? cur.title : '';

  return (
    <header className="relative h-[500px] overflow-hidden text-white" style={{ background: DARK }} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      {/* الإضاءة حسب الوقت/الجو */}
      <motion.div className="absolute inset-0" animate={{ background: `radial-gradient(120% 80% at 50% 0%, ${mood.top} 0%, #160e08 52%, #0b0806 100%)` }} transition={{ duration: 1.2 }} />
      <motion.div className="absolute top-[140px] left-1/2 h-[240px] w-[360px] -translate-x-1/2 rounded-full" animate={{ background: `radial-gradient(closest-side, ${mood.glow}, rgba(0,0,0,0) 72%)` }} transition={{ duration: 1.2 }} />
      <div className="absolute inset-0 opacity-[0.16] [background-image:radial-gradient(rgba(255,214,140,0.9)_0.8px,transparent_1.3px)] [background-size:20px_20px] [mask-image:radial-gradient(70%_55%_at_50%_30%,black,transparent)]" />

      {/* الشريحة */}
      <motion.div style={{ scale: shrink, y: drift, opacity: fade }} className="absolute inset-0 origin-top">
        <AnimatePresence initial={false} mode="sync">
          <motion.div key={cur.key} className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduce ? 0 : 0.9 }}>
            <SlideMedia slide={cur} interval={interval} reduce={reduce} />
            {cur.kind === 'media' && <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/10 to-black/60" />}
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* الشريط العلوي */}
      <div className="relative z-10 flex items-center gap-3 px-4 pt-4">
        <Logo size={50} />
        <div className="min-w-0 flex-1">
          <p className="text-[21px] leading-tight font-extrabold">{s.restaurantName}</p>
          <p className="text-[12.5px] font-semibold text-white/60">{s.tagline} · النجف</p>
        </div>
        <a href={mapsUrl(s.location)} target="_blank" rel="noopener noreferrer"
          className="flex h-11 items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3.5 text-[13.5px] font-bold backdrop-blur-md">
          <MapPin size={16} /> موقعنا
        </a>
      </div>
      <div className="relative z-10 mt-3 flex flex-wrap items-center gap-2 px-4">
        <StatusPill tone="dark" withHours />
        {tempC != null && (
          <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[13px] font-bold text-white/85 backdrop-blur-md">
            <Thermometer size={14} /> النجف <bdi className="num">{Math.round(tempC)}°</bdi>
          </span>
        )}
      </div>

      {/* عنوان الشريحة (الوقت / الجو) */}
      <AnimatePresence mode="wait">
        {headline && (
          <motion.p key={`h-${cur.key}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.4 }}
            style={{ opacity: fade }}
            className="absolute bottom-[146px] left-1/2 z-10 -translate-x-1/2 rounded-full bg-primary/95 px-3.5 py-1 text-[13.5px] font-extrabold whitespace-nowrap text-on-primary shadow-[0_6px_20px_-6px_rgba(0,0,0,0.6)]">
            {headline}
          </motion.p>
        )}
      </AnimatePresence>

      {/* شريحة مرفوعة: عنوان كبير + زر */}
      {cur.kind === 'media' && (cur.title || cur.cta.type !== 'none') && (
        <motion.div key={`m-${cur.key}`} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} style={{ opacity: fade }}
          className="absolute inset-x-4 bottom-[96px] z-10">
          {cur.title && <p className="text-[26px] leading-tight font-extrabold [text-shadow:0_2px_16px_rgba(0,0,0,0.7)]">{cur.title}</p>}
          {cur.subtitle && <p className="mt-1 text-[15px] text-white/85 [text-shadow:0_2px_10px_rgba(0,0,0,0.7)]">{cur.subtitle}</p>}
          {cur.cta.type !== 'none' && (
            <button onClick={() => act(cur.cta, cur)} className="mt-3 h-11 rounded-full bg-primary px-5 text-[15px] font-extrabold text-on-primary shadow-lg active:scale-95">{cur.cta.label || 'شوف'}</button>
          )}
        </motion.div>
      )}

      {/* صنف الشريحة التلقائية: اسمه وسعره وزر اطلبه */}
      {cur.kind === 'cutout' && cur.item && (
        <motion.button key={`c-${cur.key}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} style={{ opacity: fade }} onClick={() => act(cur.cta, cur)}
          className="absolute bottom-[90px] left-1/2 z-10 flex -translate-x-1/2 items-center gap-2.5 rounded-full border border-white/15 bg-black/45 py-1.5 ps-4 pe-1.5 text-start whitespace-nowrap backdrop-blur-md">
          <span>
            <span className="block text-[15px] leading-tight font-bold">{cur.item.name}</span>
            <Price value={cur.item.price!} className="text-[12.5px] font-semibold text-white/75" />
          </span>
          <span className="grid h-9 place-items-center rounded-full bg-primary px-4 text-[13.5px] font-extrabold text-on-primary">{cur.cta.label || 'اطلبه'}</span>
        </motion.button>
      )}

      {/* نقاط الشرائح */}
      {slides.length > 1 && (
        <div className="absolute bottom-[76px] left-1/2 z-10 flex -translate-x-1/2 gap-1" role="tablist" aria-label="شرائح البانر">
          {slides.map((x, k) => (
            <button key={x.key} role="tab" aria-selected={k === idx % slides.length} aria-label={`شريحة ${k + 1}`} onClick={() => setIdx(k)} className="grid h-6 w-5 place-items-center">
              <span className={`block h-1.5 rounded-full transition-all duration-300 ${k === idx % slides.length ? 'w-5 bg-primary' : 'w-1.5 bg-white/40'}`} />
            </button>
          ))}
        </div>
      )}

      {/* الانتقال الناعم للمنيو الفاتح */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[120px]" style={{ background: `linear-gradient(to bottom, rgba(14,10,7,0) 0%, rgba(14,10,7,0.35) 30%, ${LIGHT} 100%)` }} />
    </header>
  );
}
