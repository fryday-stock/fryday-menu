import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Bike, Clock, Plus, Timer, ArrowRight, Phone } from 'lucide-react';
import type { Item } from '../../data/types';
import { useMenu } from '../../data/MenuContext';
import { useMenuBrowser, SectionChips, SectionList, SearchInput } from '../../components/MenuBrowser';
import { Plate } from '../../components/Plate';
import { Price } from '../../components/Price';
import { Logo } from '../../components/Logo';
import { ClosedNotice } from '../../components/StatusPill';
import { feeSummary } from '../../lib/delivery';
import { etaFor } from '../../data/defaults';
import { DarkHero } from './Hero';
import { AnimatedPrice } from '../../components/AnimatedPrice';
import { MealUpsell } from '../../components/MealUpsell';
import { Featured, PastOrderCard, SeasonStrip } from '../../components/SalesBlocks';
import { Cat } from '../../components/CatMascot';
import { useCart } from '../../store/cart';
import { QtyStepper } from '../../components/QtyStepper';
import { SizePicker, OptionGroupView, NoteField } from '../../components/OptionGroups';
import { useCartSummary } from '../../hooks/useCartSummary';
import { useItemConfig } from '../../hooks/useItemConfig';
import { hourLabel } from '../../lib/hours';
import { photo } from '../../lib/format';
import { go } from '../../lib/router';
import { useQuickAdd, useBump, AddBar, MotionTap } from '../shared';
import { TAB_ICONS, TextRow, Footer } from '../common';
import type { ThemeDef } from '../types';


/* شريط المعلومات: وقت التوصيل، الأجرة، الدوام (فوق نهاية الرأس الغامق) */
function InfoCard() {
  const { data } = useMenu();
  const s = data.settings;
  const fee = feeSummary(s, data.zones);
  return (
    <div className="relative z-10 mx-4 -mt-[70px] grid grid-cols-3 divide-x divide-x-reverse divide-line rounded-[22px] bg-surface py-3 text-center shadow-[0_18px_40px_-20px_rgba(26,22,18,0.55)]">
      <div className="px-1">
        <Timer size={18} className="mx-auto mb-0.5 text-accent" />
        <p className={`text-[14px] font-extrabold ${s.busy.enabled ? 'text-[#b45309]' : ''}`}><bdi className="num">{etaFor(s, 'delivery')}</bdi> دقيقة</p>
        <p className="text-[11.5px] text-muted">{s.busy.enabled ? 'ضغط طلبات' : 'التوصيل تقريباً'}</p>
      </div>
      <div className="px-1">
        <Bike size={18} className="mx-auto mb-0.5 text-accent" />
        <p className="text-[14px] font-extrabold">{fee}</p>
        <p className="text-[11.5px] text-muted">{s.delivery.feeMode === 'map' ? 'حسب موقعك' : 'أجرة التوصيل'}</p>
      </div>
      <div className="px-1">
        <Clock size={18} className="mx-auto mb-0.5 text-accent" />
        <p className="text-[14px] font-extrabold">{hourLabel(s.hours.open)}</p>
        <p className="text-[11.5px] text-muted">لـ {hourLabel(s.hours.close)}</p>
      </div>
    </div>
  );
}

function Promo({ onGo }: { onGo: () => void }) {
  return (
    <button onClick={onGo} className="relative mx-4 mt-4 flex w-[calc(100%-2rem)] items-center overflow-hidden rounded-[22px] bg-primary p-4 pe-[44%] text-start text-on-primary">
      <div className="absolute -left-8 -bottom-10 size-44 rounded-full bg-white/30" />
      <div className="relative">
        <p className="text-[12.5px] font-extrabold tracking-wide opacity-75">عرض ثابت</p>
        <p className="text-[21px] leading-tight font-extrabold">خليها وجبة!</p>
        <p className="mt-0.5 text-[13.5px] leading-snug font-semibold opacity-85">أي بركر + بطاطا وحلقات بصل وببسي بـ <bdi className="num">3,000</bdi> بس</p>
        <span className="mt-2 inline-flex h-9 items-center rounded-full bg-cta px-4 text-[13.5px] font-bold text-on-cta">شوف البركر</span>
      </div>
      <img src={photo('burger-zinger.webp', 'sm')} alt="" className="absolute bottom-3 left-[17%] w-[30%] drop-shadow-[0_12px_10px_rgba(0,0,0,0.35)]" />
      <img src={photo('fries-classic.webp', 'sm')} alt="" className="absolute bottom-2 left-2 w-[20%] -rotate-12 drop-shadow-[0_10px_8px_rgba(0,0,0,0.3)]" />
    </button>
  );
}

/* ───────── صف صنف (أسلوب توترز) ───────── */
function RowCard({ item }: { item: Item }) {
  const q = useQuickAdd();
  return (
    <div role="button" tabIndex={0} onClick={() => q.open(item)} onKeyDown={(e) => e.key === 'Enter' && q.open(item)}
      className="flex min-h-[132px] cursor-pointer items-stretch gap-3 rounded-[22px] bg-surface p-3 shadow-card transition active:scale-[0.985]">
      <div className="flex min-w-0 flex-1 flex-col py-1">
        <h3 className="text-[16.5px] leading-snug font-bold">{item.name}</h3>
        {item.nameEn && <p dir="ltr" className="text-end text-[12px] font-semibold text-muted/90">{item.nameEn}</p>}
        {item.desc && <p className="clamp-2 mt-1 text-[13px] leading-[1.55] text-muted">{item.desc}</p>}
        <div className="mt-auto pt-2">
          {item.price != null ? (
            <span className="flex items-baseline gap-1.5">
              {item.groups.some((g) => g.startsWith('PIZZA')) && <span className="text-[12px] font-semibold text-muted">يبدي من</span>}
              <Price value={item.price} className="text-[17px] font-extrabold" />
            </span>
          ) : (
            <span className="text-[14px] font-bold text-accent">حسب الطلب</span>
          )}
        </div>
      </div>
      <div className="relative w-[124px] shrink-0">
        <div className="absolute inset-x-0 top-3 bottom-0 rounded-[18px] bg-surface-2" />
        <Plate file={item.image!} alt={item.name} className="absolute -top-3 -right-2 -left-2 bottom-3" />
        {item.orderable ? (
          <MotionTap label={`أضف ${item.name}`} onClick={() => q.plus(item)} className="absolute -bottom-1 -left-1 grid size-11 place-items-center rounded-full bg-cta text-on-cta shadow-[0_8px_16px_-6px_rgba(0,0,0,0.5)] ring-4 ring-surface">
            <Plus size={22} strokeWidth={2.75} />
          </MotionTap>
        ) : (
          <span className="absolute -bottom-1 -left-1 grid size-11 place-items-center rounded-full bg-[#128C4B] text-white ring-4 ring-surface"><Phone size={18} /></span>
        )}
      </div>
    </div>
  );
}

/** قطة فرايدي تقفز على أيقونة السلة لما ينضاف شي */
function CartCat() {
  const { data } = useMenu();
  const bump = useCart((x) => x.bump);
  const reduce = useReducedMotion();
  const [show, setShow] = useState(0);
  const seen = useRef(0);
  useEffect(() => {
    // أول إضافة: شريط السلة ينخلق بنفس اللحظة — نقفز إذا الإضافة صارت هسه
    const fresh = Date.now() - bump < 1500;
    if (bump === seen.current || !fresh) { seen.current = bump; return; }
    seen.current = bump;
    if (!data.settings.mascot.enabled || reduce) return;
    setShow(bump);
    const t = setTimeout(() => setShow(0), 1300);
    return () => clearTimeout(t);
  }, [bump, data.settings.mascot.enabled, reduce]);
  return (
    <AnimatePresence>
      {show > 0 && (
        <motion.span key={show} aria-hidden className="pointer-events-none absolute -top-[44px] -right-1 z-10 drop-shadow-[0_0_2px_#fff] [filter:drop-shadow(0_0_1.5px_#fff)_drop-shadow(0_4px_6px_rgba(0,0,0,0.35))]"
          initial={{ y: 34, opacity: 0, rotate: -12, scale: 0.6 }}
          animate={{ y: [34, -18, 0, -6, 0], opacity: [0, 1, 1, 1, 1], rotate: [-12, 8, -4, 0, 0], scale: [0.6, 1.1, 0.95, 1.02, 1] }}
          exit={{ y: 20, opacity: 0, scale: 0.7, transition: { duration: 0.25 } }}
          transition={{ duration: 0.75, times: [0, 0.35, 0.6, 0.8, 1], ease: 'easeOut' }}>
          <Cat image={data.settings.mascot.image} size={50} />
        </motion.span>
      )}
    </AnimatePresence>
  );
}

function CartBar() {
  const { count, subtotal } = useCartSummary();
  const controls = useBump();
  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div className="pb-safe pointer-events-none fixed inset-x-0 bottom-0 z-30 mx-auto max-w-[480px] px-4" initial={{ y: 120 }} animate={{ y: 0 }} exit={{ y: 120 }} transition={{ type: 'spring', stiffness: 380, damping: 32 }}>
          <motion.button animate={controls} onClick={() => go('cart')} className="pointer-events-auto flex h-15 w-full items-center gap-3 rounded-[20px] bg-cta ps-2.5 pe-5 text-on-cta shadow-float">
            <span className="relative grid size-10 place-items-center rounded-[14px] bg-primary text-[16px] font-extrabold text-on-primary"><bdi className="num">{count}</bdi><CartCat /></span>
            <span className="flex-1 text-start text-[16.5px] font-bold">عرض السلة</span>
            <AnimatedPrice value={subtotal} className="text-[17px] font-extrabold" />
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function HomeA() {
  const b = useMenuBrowser();
  // زر البانر "افتح القسم": نروح للتبويب وننزل للقسم
  const openSection = (name: string) => {
    const t = b.data.tabs.find((x) => x.sections.some((s) => s.name === name));
    if (!t) return;
    b.setQuery('');
    b.setTab(t.id);
    setTimeout(() => b.scrollToSection(t.sections.find((s) => s.name === name)!.id), 60);
  };
  return (
    <div className="pb-28">
      <DarkHero onSection={openSection} />
      <InfoCard />
      <ClosedNotice className="mx-4 mt-3" />
      <Promo onGo={() => { b.setTab('food'); setTimeout(() => b.scrollToSection(b.data.tabs[0].sections[0].id), 30); }} />
      <SeasonStrip className="mx-4 mt-3" />
      <PastOrderCard />
      <Featured />
      <SearchInput b={b} className="mx-4 mt-4" inputClassName="bg-surface border border-line shadow-[0_2px_10px_-6px_rgba(0,0,0,0.2)] focus:border-fg/50" />

      <div ref={b.anchorRef} />
      <div ref={b.navRef} className="sticky top-0 z-20 -mt-px bg-bg/92 pt-3 pb-2.5 backdrop-blur-md">
        {!b.results && (
          <div role="tablist" aria-label="التبويبات" className="mx-4 grid grid-cols-3 gap-1 rounded-[18px] bg-surface p-1 shadow-[0_2px_12px_-6px_rgba(0,0,0,0.25)]">
            {b.data.tabs.map((t) => {
              const Icon = TAB_ICONS[t.id];
              const on = b.tab === t.id;
              return (
                <button key={t.id} role="tab" aria-selected={on} onClick={() => b.setTab(t.id)}
                  className={`relative flex h-11 items-center justify-center gap-1.5 rounded-[14px] text-[15px] font-bold transition-colors ${on ? 'text-on-primary' : 'text-muted'}`}>
                  {on && <motion.span layoutId="a-tab" className="absolute inset-0 rounded-[14px] bg-primary" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
                  <Icon size={18} className="relative" /> <span className="relative">{t.name}</span>
                </button>
              );
            })}
          </div>
        )}
        <SectionChips b={b} className="mt-2.5" render={(s, on) => (
          <button className={`h-10 rounded-full px-4 text-[14px] font-bold whitespace-nowrap transition ${on ? 'bg-cta text-on-cta' : 'bg-surface text-fg/75 ring-1 ring-line'}`}>{s.name}</button>
        )} />
      </div>

      <motion.div key={b.results ? 'search' : b.tab} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, ease: 'easeOut' }}>
      <SectionList b={b} layout="rows"
        sectionTitle={(s) => (
          <div className="mb-3 flex items-baseline gap-2">
            <h2 className="text-[21px] font-extrabold">{s.name}</h2>
            <span className="text-[13px] font-semibold text-muted"><bdi className="num">{s.items.length}</bdi> صنف</span>
          </div>
        )}
        renderItem={(i) => <RowCard item={i} />}
        renderTextItem={(i) => <TextRow item={i} className="rounded-none bg-transparent" />}
      />
      </motion.div>
      <Footer />
      <CartBar />
      <MealUpsell />
    </div>
  );
}

/* ───────── صفحة الصنف ───────── */
function ItemA({ item, onClose }: { item: Item; onClose: () => void }) {
  const cfg = useItemConfig(item);
  return (
    <div className="flex min-h-full flex-col bg-bg">
      <div className="relative h-[310px] shrink-0 overflow-hidden bg-[radial-gradient(85%_75%_at_50%_45%,#fff3c9_0%,#fbe7ad_45%,#f3d27c_100%)]">
        <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(#fff_1.2px,transparent_1.6px)] [background-size:18px_18px]" />
        <button onClick={onClose} aria-label="رجوع" className="absolute top-4 right-4 z-10 grid size-11 place-items-center rounded-full bg-surface/90 text-fg shadow backdrop-blur"><ArrowRight size={20} /></button>
        {item.image ? (
          <motion.div initial={{ scale: 0.85, y: 20, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 22, delay: 0.05 }} className="absolute inset-x-8 top-10 bottom-4">
            <Plate file={item.image} alt={item.name} size="lg" eager />
          </motion.div>
        ) : (
          <div className="absolute inset-0 grid place-items-center"><Logo size={150} className="shadow-[0_16px_40px_-14px_rgba(0,0,0,0.35)]" /></div>
        )}
      </div>
      <div className="relative -mt-6 flex-1 rounded-t-[28px] bg-bg px-4 pt-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-[25px] leading-tight font-extrabold">{item.name}</h2>
            {item.nameEn && <p className="text-[14px] font-semibold text-muted">{item.nameEn}</p>}
          </div>
          {item.price != null && <Price value={cfg.unit} className="pt-1 text-[22px] font-extrabold" />}
        </div>
        {item.desc && <p className="mt-3 text-[15px] leading-7 text-fg/75">{item.desc}</p>}
        <div className="mt-6 space-y-7 pb-6">
          {cfg.sizeGroup && <SizePicker item={item} group={cfg.sizeGroup} cfg={cfg} look="raised" />}
          {cfg.otherGroups.map((g) => <OptionGroupView key={g.code} group={g} cfg={cfg} look="tiles" />)}
          {item.orderable && <NoteField cfg={cfg} />}
        </div>
      </div>
      <AddBar item={item} cfg={cfg} onDone={onClose} className="border-t border-line bg-bg/95 backdrop-blur">
        {(submit) => (
          <div className="flex items-center gap-3 px-4 pt-3">
            <QtyStepper value={cfg.qty} onChange={cfg.setQty} look="soft" />
            <button onClick={submit} className={`flex h-14 flex-1 items-center justify-between rounded-[18px] px-5 text-[16.5px] font-bold transition active:scale-[0.98] ${cfg.valid ? 'bg-cta text-on-cta' : 'bg-cta/55 text-on-cta'}`}>
              <span>أضف للسلة</span>
              <AnimatedPrice value={cfg.total} className="font-extrabold" />
            </button>
          </div>
        )}
      </AddBar>
    </div>
  );
}

export const themeA: ThemeDef = {
  id: 'a',
  letter: 'A',
  name: 'الخلطة',
  blurb: 'فاتح ومرتب بألوان علبة فرايدي (الأصفر والأسود). رأس مطعم بغلاف ولوغو، والأصناف صفوف واضحة سريعة القراءة.',
  className: 'theme-a',
  themeColor: '#0e0a07',
  swatch: ['#ffc72c', '#17140f', '#f7f4ee', '#e4472b'],
  Home: HomeA,
  Item: ItemA,
  look: {
    stepper: 'soft',
    cta: 'rounded-[18px] bg-cta text-on-cta',
    card: 'rounded-[20px] bg-surface shadow-card',
    field: 'rounded-2xl border border-line bg-surface',
  },
};
