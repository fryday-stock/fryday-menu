import { useEffect } from 'react';
import { motion, useScroll, useTransform, useReducedMotion } from 'motion/react';
import { MapPin } from 'lucide-react';
import { useMenu } from '../../data/MenuContext';
import { Logo } from '../../components/Logo';
import { Price } from '../../components/Price';
import { StatusPill } from '../../components/StatusPill';
import { useHeroMedia, resolveMedia } from '../../components/HeroMedia';
import { mapsUrl } from '../../lib/delivery';
import { useQuickAdd } from '../shared';

const DARK = '#0e0a07';
const LIGHT = '#f7f4ee';

/**
 * الرأس السينمائي الغامق (من النموذج C) — ينتقل بنعومة للمنيو الفاتح.
 * الصورة إعداد (settings.hero) مو مكتوبة بالكود.
 */
export function DarkHero() {
  const { data } = useMenu();
  const s = data.settings;
  const media = useHeroMedia(s.hero);
  const q = useQuickAdd();
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  const imgY = useTransform(scrollY, [0, 420], [0, reduce ? 0 : 110]);
  const imgScale = useTransform(scrollY, [0, 420], [1, reduce ? 1 : 1.12]);
  const fade = useTransform(scrollY, [0, 320], [1, 0.25]);

  // صنف الصورة (إذا الصورة لصنف من المنيو) → نطلع اسمه وسعره وزر اطلبه
  const item = media.cutout ? data.items.find((i) => i.image === media.src && i.orderable && i.available) : undefined;

  // لون شريط المتصفح: غامق فوق، فاتح لما ينزل للمنيو
  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    const set = (v: number) => meta?.setAttribute('content', v > 360 ? LIGHT : DARK);
    set(scrollY.get());
    return scrollY.on('change', set);
  }, [scrollY]);

  return (
    <header className="relative h-[500px] overflow-hidden text-white" style={{ background: DARK }}>
      {/* الإضاءة */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_0%,#3a2312_0%,#160e08_52%,#0b0806_100%)]" />
      <div className="absolute top-[140px] left-1/2 h-[240px] w-[360px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(255,176,64,0.42),rgba(255,140,30,0.12)_55%,transparent)]" />
      <div className="absolute -top-24 -right-24 size-72 rounded-full bg-[radial-gradient(closest-side,rgba(255,199,44,0.18),transparent)]" />
      <div className="absolute inset-0 opacity-[0.18] [background-image:radial-gradient(rgba(255,214,140,0.9)_0.8px,transparent_1.3px)] [background-size:20px_20px] [mask-image:radial-gradient(70%_55%_at_50%_30%,black,transparent)]" />

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
      <div className="relative z-10 mt-3 px-4"><StatusPill tone="dark" withHours /></div>

      {/* الصورة / الفيديو */}
      {media.cutout ? (
        <motion.div style={{ y: imgY, scale: imgScale, opacity: fade }} className="absolute inset-x-0 top-[100px] h-[262px]">
          <div className="absolute bottom-3 left-1/2 h-9 w-[64%] -translate-x-1/2 rounded-[50%] bg-black/70 blur-[10px]" />
          <motion.img
            src={resolveMedia(media.src)} alt={item?.name ?? 'فرايدي'} fetchPriority="high" decoding="async" onError={media.onError}
            initial={reduce ? false : { y: 24, opacity: 0, scale: 0.94 }} animate={{ y: 0, opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 120, damping: 18 }}
            className="relative mx-auto h-full w-[84%] object-contain [filter:drop-shadow(0_26px_28px_rgba(0,0,0,0.7))_saturate(1.08)_contrast(1.04)]"
          />
        </motion.div>
      ) : media.type === 'video' ? (
        <video src={resolveMedia(media.src)} poster={media.poster ? resolveMedia(media.poster) : undefined} autoPlay muted loop playsInline onError={media.onError}
          className="absolute inset-0 h-full w-full object-cover opacity-80" />
      ) : (
        <img src={resolveMedia(media.src)} alt={media.title ?? ''} onError={media.onError} className="absolute inset-0 h-full w-full object-cover opacity-80" />
      )}

      {/* اسم الطبق */}
      {item && (
        <motion.button style={{ opacity: fade }} onClick={() => q.open(item)}
          className="absolute bottom-[86px] left-1/2 z-10 flex -translate-x-1/2 items-center gap-2.5 rounded-full whitespace-nowrap border border-white/15 bg-black/40 py-1.5 ps-4 pe-1.5 text-start backdrop-blur-md">
          <span>
            <span className="block text-[15px] leading-tight font-bold">{item.name}</span>
            <Price value={item.price!} className="text-[12.5px] font-semibold text-white/75" />
          </span>
          <span className="grid h-9 place-items-center rounded-full bg-primary px-4 text-[13.5px] font-extrabold text-on-primary">اطلبه</span>
        </motion.button>
      )}

      {/* الانتقال الناعم للمنيو الفاتح */}
      <div className="absolute inset-x-0 bottom-0 h-[120px]" style={{ background: `linear-gradient(to bottom, rgba(14,10,7,0) 0%, rgba(14,10,7,0.35) 30%, ${LIGHT} 100%)` }} />
    </header>
  );
}
