import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronRight, Phone, Plus, SlidersHorizontal, ShoppingBag } from 'lucide-react';
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

function Banner() {
  const { byId } = useMenu();
  const q = useQuickAdd();
  const item = byId.get('F069')!; // بطاطا فرايدي
  return (
    <button onClick={() => q.open(item)} className="relative mx-4 mt-9 block h-[168px] w-[calc(100%-2rem)] rounded-[26px] bg-primary text-start">
      <div className="absolute inset-0 overflow-hidden rounded-[26px]">
        <div className="absolute -left-12 -top-16 size-64 rounded-full bg-white/30" />
        <div className="absolute -bottom-20 left-24 size-40 rounded-full bg-primary-2" />
      </div>
      <div className="relative z-10 flex h-full w-[58%] flex-col justify-center ps-5">
        <span className="text-[13px] font-semibold text-fg/70">طازجة كل يوم</span>
        <span className="text-[25px] leading-[1.15] font-extrabold">بطاطا فرايدي</span>
        <span className="text-[14px] font-medium text-fg/75">بـ <Price value={item.price!} className="font-bold" /></span>
        <span className="mt-2.5 inline-flex h-10 w-fit items-center rounded-full bg-white px-5 text-[14px] font-bold shadow-sm">اطلب هسه</span>
      </div>
      <img src={photo('fries-classic.webp')} alt="بطاطا فرايدي" fetchPriority="high" className="absolute -top-7 -left-1 z-10 w-[44%] -rotate-6 drop-shadow-[0_18px_16px_rgba(120,80,0,0.45)]" />
    </button>
  );
}

function GridCard({ item }: { item: Item }) {
  const q = useQuickAdd();
  return (
    <div role="button" tabIndex={0} onClick={() => q.open(item)} onKeyDown={(e) => e.key === 'Enter' && q.open(item)}
      className="relative mt-8 flex cursor-pointer flex-col rounded-[22px] border border-line/70 bg-surface px-3 pb-3 shadow-card transition active:scale-[0.97]">
      <div className="relative -mt-8 h-[124px]">
        <div className="absolute inset-x-5 top-5 bottom-3 rounded-full bg-primary/25 blur-xl" />
        <Plate file={item.image!} alt={item.name} className="absolute inset-0" />
      </div>
      <h3 className="mt-1 text-[16px] leading-snug font-bold clamp-1">{item.name}</h3>
      <p className="clamp-1 text-[12.5px] text-muted">{item.nameEn ?? item.section}</p>
      <div className="mt-2 flex items-center justify-between">
        {item.price != null ? (
          <span className="rounded-full bg-surface-2 px-2.5 py-1"><Price value={item.price} className="text-[14.5px] font-bold" /></span>
        ) : <span className="text-[13px] font-bold text-fg/70">حسب الطلب</span>}
        {item.orderable ? (
          <MotionTap label={`أضف ${item.name}`} onClick={() => q.plus(item)} className="-m-1 grid size-11 place-items-center rounded-full bg-primary text-on-primary shadow-[0_8px_16px_-8px_var(--t-primary-2)]">
            <Plus size={21} strokeWidth={2.75} />
          </MotionTap>
        ) : (
          <span className="grid size-10 place-items-center rounded-full bg-[#128C4B] text-white"><Phone size={17} /></span>
        )}
      </div>
    </div>
  );
}

function CartPill() {
  const { count, subtotal } = useCartSummary();
  const controls = useBump();
  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div className="pb-safe pointer-events-none fixed inset-x-0 bottom-0 z-30 mx-auto max-w-[480px] px-5" initial={{ y: 120 }} animate={{ y: 0 }} exit={{ y: 120 }} transition={{ type: 'spring', stiffness: 380, damping: 32 }}>
          <motion.button animate={controls} onClick={() => go('d/cart')} className="pointer-events-auto flex h-16 w-full items-center gap-3 rounded-full bg-cta ps-2 pe-6 text-on-cta shadow-float">
            <span className="relative grid size-12 place-items-center rounded-full bg-primary text-on-primary">
              <ShoppingBag size={21} />
              <span className="absolute -top-1 -left-1 grid min-w-6 place-items-center rounded-full bg-white px-1 text-[12px] font-extrabold text-fg ring-2 ring-cta"><bdi className="num">{count}</bdi></span>
            </span>
            <span className="flex-1 text-start text-[17px] font-bold">السلة</span>
            <Price value={subtotal} className="text-[18px] font-bold" />
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function HomeD() {
  const b = useMenuBrowser();
  const { data } = useMenu();
  const [sheet, setSheet] = useState(false);
  return (
    <div className="pb-28">
      <header className="flex items-center gap-3 px-4 pt-5">
        <Logo size={50} />
        <div className="flex-1">
          <p className="text-[14px] leading-tight text-muted">هلا بيك 👋</p>
          <p className="text-[21px] leading-tight font-bold">فرايدي <span className="text-[13px] font-semibold text-muted">Fries &amp; Pastry</span></p>
        </div>
        <a href={`tel:${data.settings.callPhone}`} aria-label="اتصل بالمطعم" className="grid size-12 place-items-center rounded-full border-2 border-primary bg-surface text-fg shadow-[0_6px_16px_-10px_var(--t-primary-2)]"><Phone size={20} /></a>
      </header>
      <div className="mt-3 flex items-center justify-between px-4">
        <StatusPill withHours />
      </div>
      <div className="mx-4 mt-4 flex gap-2.5">
        <SearchInput b={b} className="flex-1" inputClassName="bg-surface border-2 border-line focus:border-primary" />
        <button onClick={() => setSheet(true)} aria-label="كل الأقسام" className="grid size-12 shrink-0 place-items-center rounded-full border-2 border-line bg-surface"><SlidersHorizontal size={20} /></button>
      </div>
      <ClosedNotice className="mx-4 mt-3" />
      {!b.results && <Banner />}

      {!b.results && (
        <div className="mt-5 -mb-2 flex items-baseline justify-between px-4">
          <h2 className="text-[19px] font-bold">الأقسام</h2>
          <button onClick={() => setSheet(true)} className="h-10 text-[14px] font-semibold text-muted">شوف الكل</button>
        </div>
      )}
      <div ref={b.anchorRef} />
      <div ref={b.navRef} className="sticky top-0 z-20 bg-bg/95 pt-3 pb-1 backdrop-blur-md">
        {!b.results && (
          <>
            <div role="tablist" aria-label="التبويبات" className="flex gap-2 px-4">
              {b.data.tabs.map((t) => {
                const Icon = TAB_ICONS[t.id];
                const on = b.tab === t.id;
                return (
                  <button key={t.id} role="tab" aria-selected={on} onClick={() => b.setTab(t.id)}
                    className={`flex h-11 items-center gap-1.5 rounded-full border-2 px-4 text-[15px] font-semibold transition ${on ? 'border-primary bg-primary text-on-primary' : 'border-primary/60 bg-surface text-fg'}`}>
                    <Icon size={18} /> {t.name}
                  </button>
                );
              })}
            </div>
          </>
        )}
        <SectionChips b={b} className="mt-2 border-b border-line" render={(s, on) => (
          <button className={`relative h-11 px-2 text-[14.5px] font-semibold whitespace-nowrap transition ${on ? 'text-fg' : 'text-muted'}`}>
            {s.name}
            {on && <motion.span layoutId="d-sec" className="absolute inset-x-1 bottom-0 h-[3px] rounded-full bg-primary" />}
          </button>
        )} />
      </div>

      <SectionList b={b} layout="grid"
        sectionTitle={(s) => <h2 className="mb-0 text-[20px] font-bold">{s.name}</h2>}
        renderItem={(i) => <GridCard item={i} />}
        renderTextItem={(i) => <TextRow item={i} plusClass="bg-primary text-on-primary" />}
      />
      <Footer />
      <SectionsSheet b={b} open={sheet} onClose={() => setSheet(false)} />
      <CartPill />
    </div>
  );
}

function ItemD({ item, onClose }: { item: Item; onClose: () => void }) {
  const cfg = useItemConfig(item);
  return (
    <div className="flex min-h-full flex-col bg-bg">
      <header className="flex h-16 items-center px-4">
        <button onClick={onClose} aria-label="رجوع" className="grid size-11 place-items-center rounded-full border-2 border-primary bg-surface shadow-[0_6px_16px_-10px_var(--t-primary-2)]"><ChevronRight size={22} /></button>
        <h1 className="flex-1 text-center text-[19px] font-bold">التفاصيل</h1>
        <span className="size-11" />
      </header>
      <div className="relative h-[270px] shrink-0">
        <div className="absolute inset-x-10 inset-y-6 rounded-full bg-[radial-gradient(closest-side,#ffe48a,#fff7dc_60%,transparent)]" />
        {item.image ? (
          <motion.div initial={{ scale: 0.85, rotate: -6, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 220, damping: 18 }} className="absolute inset-x-8 inset-y-2">
            <Plate file={item.image} alt={item.name} size="lg" eager />
          </motion.div>
        ) : (
          <div className="absolute inset-0 grid place-items-center"><Logo size={130} /></div>
        )}
      </div>
      <div className="flex-1 px-5 pt-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-[25px] leading-tight font-bold">{item.name}</h2>
            {item.nameEn && <p className="text-[14px] text-muted">{item.nameEn}</p>}
          </div>
          {item.price != null && <span className="mt-1 rounded-full bg-primary px-3.5 py-1"><Price value={cfg.unit} className="text-[20px] font-bold text-on-primary" /></span>}
        </div>
        {item.desc && (
          <>
            <h3 className="mt-4 text-[17px] font-bold">الوصف</h3>
            <p className="mt-1 text-[14.5px] leading-7 text-muted">{item.desc}</p>
          </>
        )}
        <div className="mt-5 space-y-6 border-t border-dashed border-line pt-5 pb-6">
          {cfg.sizeGroup && <SizePicker item={item} group={cfg.sizeGroup} cfg={cfg} look="pills" />}
          {cfg.otherGroups.map((g) => <OptionGroupView key={g.code} group={g} cfg={cfg} look="list" />)}
          {item.orderable && <NoteField cfg={cfg} />}
        </div>
      </div>
      <AddBar item={item} cfg={cfg} onDone={onClose} className="bg-bg/95 px-5 pt-3 backdrop-blur">
        {(submit) => (
          <div className="flex items-center gap-3">
            <QtyStepper value={cfg.qty} onChange={cfg.setQty} look="yellow" />
            <button onClick={submit} className={`flex h-14 flex-1 items-center justify-center gap-2 rounded-full text-[17px] font-bold text-on-primary transition active:scale-[0.98] ${cfg.valid ? 'bg-primary shadow-[0_12px_24px_-12px_var(--t-primary-2)]' : 'bg-primary/55'}`}>
              أضف للسلة · <Price value={cfg.total} />
            </button>
          </div>
        )}
      </AddBar>
    </div>
  );
}

export const themeD: ThemeDef = {
  id: 'd',
  letter: 'D',
  name: 'الأصفر',
  blurb: 'أبسط وأفتح واحد: أبيض وأصفر فرايدي، خط مدور لطيف، وشريط سلة أسود. مناسب للعائلة وللي يحب البساطة.',
  className: 'theme-d',
  themeColor: '#ffffff',
  swatch: ['#ffc20e', '#ffffff', '#121212', '#fff7dc'],
  Home: HomeD,
  Item: ItemD,
  look: {
    stepper: 'yellow',
    cta: 'rounded-full bg-primary text-on-primary',
    card: 'rounded-[22px] border border-line bg-surface',
    field: 'rounded-2xl border-2 border-line bg-surface',
  },
};
