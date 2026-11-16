import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronRight, Plus, ShoppingBag, SlidersHorizontal, Phone } from 'lucide-react';
import type { Item } from '../../data/types';
import { useMenu } from '../../data/MenuContext';
import { useMenuBrowser, SectionChips, SectionList, SearchInput } from '../../components/MenuBrowser';
import { Plate } from '../../components/Plate';
import { Price } from '../../components/Price';
import { Logo } from '../../components/Logo';
import { StatusPill, ClosedNotice } from '../../components/StatusPill';
import { QtyStepper } from '../../components/QtyStepper';
import { SizePicker, OptionGroupView, NoteField } from '../../components/OptionGroups';
import { useCartSummary } from '../../hooks/useCartSummary';
import { useItemConfig } from '../../hooks/useItemConfig';
import { photo } from '../../lib/format';
import { go } from '../../lib/router';
import { useQuickAdd, useBump, AddBar, MotionTap } from '../shared';
import { SectionsSheet } from '../SectionsSheet';
import { TAB_ICONS, TextRow, Footer } from '../common';
import type { ThemeDef } from '../types';

/* بانر عروض غامق — أصناف حقيقية بأسعارها */
const SLIDES = [
  { id: 'F001', kicker: 'الأكثر شهرة', img: 'burger-fryday.webp' },
  { id: 'F024', kicker: 'بيتزا طازجة', img: 'pizza-round.webp' },
  { id: 'F015', kicker: 'للعائلة', img: 'crispy-8pcs.webp' },
];

function PromoCarousel() {
  const { byId } = useMenu();
  const q = useQuickAdd();
  const [i, setI] = useState(0);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => setI((x) => (x + 1) % SLIDES.length), 5000);
    return () => clearInterval(t);
  }, []);
  const s = SLIDES[i];
  const item = byId.get(s.id)!;
  return (
    <div className="mx-4 mt-5">
      <div className="relative h-[164px] overflow-visible rounded-[24px] bg-[#1b1b1f] shadow-[0_18px_32px_-18px_rgba(0,0,0,0.7)]">
        <div className="absolute inset-0 overflow-hidden rounded-[24px]">
          <div className="absolute -left-10 -top-10 size-56 rounded-full bg-primary/35 blur-3xl" />
          <div className="absolute inset-0 opacity-[0.07] [background-image:repeating-linear-gradient(135deg,#fff_0_2px,transparent_2px_14px)]" />
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={s.id} className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}>
            <div className="relative z-10 flex h-full w-[56%] flex-col justify-center ps-5 text-white">
              <span className="text-[12.5px] font-bold text-primary-2">{s.kicker}</span>
              <span className="text-[23px] leading-tight font-extrabold">{item.name}</span>
              <span className="mt-0.5 text-[14px] text-white/75">يبدي من <Price value={item.price!} className="font-bold text-white" /></span>
              <button onClick={() => q.open(item)} className="mt-3 h-10 w-fit rounded-xl bg-gradient-to-l from-primary-2 to-primary px-4 text-[14px] font-bold text-white">اطلب هسه</button>
            </div>
            <motion.img initial={{ x: -20, rotate: -8, opacity: 0 }} animate={{ x: 0, rotate: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 18 }}
              src={photo(s.img)} alt={item.name} className="absolute -top-6 -left-3 z-10 w-[52%] drop-shadow-[0_20px_18px_rgba(0,0,0,0.6)]" />
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="mt-3 flex justify-center gap-1.5" role="tablist" aria-label="العروض">
        {SLIDES.map((x, k) => (
          <button key={x.id} role="tab" aria-selected={k === i} aria-label={`عرض ${k + 1}`} onClick={() => setI(k)} className="grid h-6 w-6 place-items-center">
            <span className={`block h-2 rounded-full transition-all ${k === i ? 'w-6 bg-primary' : 'w-2 bg-line'}`} />
          </button>
        ))}
      </div>
    </div>
  );
}

function GridCard({ item }: { item: Item }) {
  const q = useQuickAdd();
  return (
    <div role="button" tabIndex={0} onClick={() => q.open(item)} onKeyDown={(e) => e.key === 'Enter' && q.open(item)}
      className="relative mt-7 flex cursor-pointer flex-col rounded-[22px] bg-surface p-3 pt-0 shadow-card transition active:scale-[0.97]">
      <div className="relative -mt-7 h-[124px]">
        <Plate file={item.image!} alt={item.name} className="absolute inset-0" />
      </div>
      <h3 className="mt-2.5 text-[15.5px] leading-snug font-bold clamp-1">{item.name}</h3>
      <p className="clamp-1 text-[12.5px] text-muted">{item.desc ?? item.nameEn ?? item.section}</p>
      <div className="mt-2 flex items-center justify-between">
        {item.price != null ? <Price value={item.price} className="text-[16px] font-extrabold" /> : <span className="text-[13px] font-bold text-primary">حسب الطلب</span>}
        {item.orderable ? (
          <MotionTap label={`أضف ${item.name}`} onClick={() => q.plus(item)} className="-m-1 grid size-11 place-items-center rounded-full bg-cta text-on-cta">
            <Plus size={20} strokeWidth={2.75} />
          </MotionTap>
        ) : (
          <span className="grid size-10 place-items-center rounded-full bg-[#128C4B] text-white"><Phone size={17} /></span>
        )}
      </div>
    </div>
  );
}

/* شريط سفلي: التبويبات + السلة (مرجع B) */
function BottomNav({ b }: { b: ReturnType<typeof useMenuBrowser> }) {
  const { count, subtotal } = useCartSummary();
  const controls = useBump();
  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-30 mx-auto max-w-[480px] rounded-t-[26px] bg-surface/95 px-3 pt-2.5 shadow-[0_-10px_30px_-18px_rgba(0,0,0,0.35)] backdrop-blur [background:#fff]" aria-label="التنقل">
      <div className="flex items-center gap-1.5">
        {b.data.tabs.map((t) => {
          const Icon = TAB_ICONS[t.id];
          const on = b.tab === t.id && !b.results;
          return (
            <button key={t.id} onClick={() => { b.setQuery(''); b.setTab(t.id); }} aria-current={on ? 'page' : undefined} aria-label={t.name}
              className={`relative flex h-12 items-center justify-center gap-1.5 rounded-2xl text-[14px] font-bold transition-[flex] duration-300 ${on ? 'flex-[2.2] text-white' : 'flex-1 text-muted'}`}>
              {on && <motion.span layoutId="b-nav" className="absolute inset-0 rounded-2xl bg-gradient-to-l from-primary-2 to-primary shadow-[0_10px_20px_-10px_var(--t-primary)]" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
              <Icon size={20} className="relative" />
              {on ? <span className="relative">{t.name}</span> : <span className="sr-only">{t.name}</span>}
            </button>
          );
        })}
        <motion.button animate={controls} onClick={() => go('b/cart')} aria-label={`السلة — ${count} قطعة`}
          className={`relative flex h-12 items-center justify-center gap-2 rounded-2xl px-3 transition-[flex] ${count ? 'flex-[2.2] bg-cta text-on-cta' : 'flex-1 text-muted'}`}>
          <span className="relative">
            <ShoppingBag size={20} />
            {count > 0 && <span className="absolute -top-2 -right-2.5 grid min-w-5 place-items-center rounded-full bg-primary px-1 text-[11px] font-extrabold text-white"><bdi className="num">{count}</bdi></span>}
          </span>
          {count > 0 && <Price value={subtotal} className="text-[14.5px] font-extrabold" unitClassName="hidden" />}
        </motion.button>
      </div>
    </nav>
  );
}

function HomeB() {
  const b = useMenuBrowser();
  const [sheet, setSheet] = useState(false);
  return (
    <div className="pb-28">
      <div className="bg-gradient-to-b from-[#ffe1cf] via-[#fff1e8] to-bg pb-1">
        <header className="flex items-center gap-3 px-4 pt-5">
          <Logo size={48} />
          <div className="flex-1">
            <p className="text-[14px] font-medium text-muted">هلا بيك في فرايدي</p>
            <p className="text-[20px] leading-tight font-extrabold">شتشتهي اليوم؟</p>
          </div>
          <StatusPill />
        </header>
        <div className="mx-4 mt-4 flex gap-2.5">
          <SearchInput b={b} className="flex-1" inputClassName="rounded-2xl! bg-white border border-line focus:border-primary" />
          <button onClick={() => setSheet(true)} aria-label="كل الأقسام" className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-b from-primary-2 to-primary text-white shadow-[0_10px_20px_-10px_var(--t-primary)]">
            <SlidersHorizontal size={20} />
          </button>
        </div>
      </div>
      <ClosedNotice className="mx-4 mt-3" />
      {!b.results && <PromoCarousel />}

      <div ref={b.anchorRef} />
      <div ref={b.navRef} className="sticky top-0 z-20 bg-bg/95 pt-3 pb-3 backdrop-blur-md">
        {!b.results && <p className="mb-2 px-4 text-[18px] font-extrabold">{b.data.tabs.find((t) => t.id === b.tab)!.name}</p>}
        <SectionChips b={b} render={(s, on) => (
          <button className={`h-10 rounded-xl px-4 text-[14px] font-bold whitespace-nowrap transition ${on ? 'bg-gradient-to-l from-primary-2 to-primary text-white shadow-[0_8px_16px_-10px_var(--t-primary)]' : 'border border-line bg-white text-fg/75'}`}>{s.name}</button>
        )} />
      </div>

      <SectionList b={b} layout="grid"
        sectionTitle={(s) => <h2 className="mb-1 text-[19px] font-extrabold">{s.name}</h2>}
        renderItem={(i) => <GridCard item={i} />}
        renderTextItem={(i) => <TextRow item={i} plusClass="bg-cta text-on-cta" />}
      />
      <Footer />
      <SectionsSheet b={b} open={sheet} onClose={() => setSheet(false)} />
      <BottomNav b={b} />
    </div>
  );
}

function ItemB({ item, onClose }: { item: Item; onClose: () => void }) {
  const cfg = useItemConfig(item);
  return (
    <div className="flex min-h-full flex-col bg-bg">
      <div className="relative h-[330px] shrink-0">
        <div className="absolute inset-x-0 top-0 h-[250px] overflow-hidden rounded-b-[50%_30%] bg-gradient-to-b from-primary-2 to-primary">
          <div className="absolute -right-10 top-10 size-48 rounded-full bg-white/15" />
          <div className="absolute -left-14 -top-10 size-56 rounded-full bg-white/10" />
        </div>
        <button onClick={onClose} aria-label="رجوع" className="absolute top-4 right-4 z-10 grid size-11 place-items-center rounded-full bg-white/20 text-white backdrop-blur"><ChevronRight size={24} /></button>
        {item.image ? (
          <motion.div initial={{ scale: 0.8, y: 30, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 240, damping: 20 }} className="absolute inset-x-10 top-12 bottom-0">
            <Plate file={item.image} alt={item.name} size="lg" eager />
          </motion.div>
        ) : (
          <div className="absolute inset-x-0 top-16 grid place-items-center"><Logo size={130} /></div>
        )}
      </div>
      <div className="flex-1 px-5 pt-3">
        <h2 className="text-[25px] leading-tight font-extrabold">{item.name}</h2>
        <p className="text-[15px] font-medium text-muted">{item.nameEn ?? item.section}</p>
        {item.desc && <p className="mt-3 text-[15px] leading-7 text-fg/75">{item.desc}</p>}
        <div className="mt-6 space-y-7 pb-6">
          {cfg.sizeGroup && <SizePicker item={item} group={cfg.sizeGroup} cfg={cfg} look="raised" />}
          {cfg.otherGroups.map((g) => <OptionGroupView key={g.code} group={g} cfg={cfg} look="list" />)}
          {item.orderable && <NoteField cfg={cfg} />}
        </div>
      </div>
      <AddBar item={item} cfg={cfg} onDone={onClose} className="rounded-t-[26px] bg-white px-5 pt-4 shadow-[0_-12px_30px_-20px_rgba(0,0,0,0.4)]">
        {(submit) => (
          <>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[18px] font-extrabold">الإجمالي: <Price value={cfg.total} /></p>
              <QtyStepper value={cfg.qty} onChange={cfg.setQty} look="outline" />
            </div>
            <button onClick={submit} className={`h-14 w-full rounded-2xl text-[17px] font-bold text-on-cta transition active:scale-[0.98] ${cfg.valid ? 'bg-cta' : 'bg-cta/55'}`}>أضف للطلب</button>
          </>
        )}
      </AddBar>
    </div>
  );
}

export const themeB: ThemeDef = {
  id: 'b',
  letter: 'B',
  name: 'البرتقالي',
  blurb: 'دافي وشهي بتدرج برتقالي، بانر عروض غامق متحرك، شبكة عمودين، وشريط سفلي للتبويبات والسلة.',
  className: 'theme-b',
  themeColor: '#ffe1cf',
  swatch: ['#f0531c', '#ff8a3d', '#111111', '#fff5ef'],
  Home: HomeB,
  Item: ItemB,
  look: {
    stepper: 'outline',
    cta: 'rounded-2xl bg-cta text-on-cta',
    card: 'rounded-[20px] bg-surface',
    field: 'rounded-2xl border border-line bg-white',
  },
};
