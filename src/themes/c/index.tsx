import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, BadgeCheck, Bike, Plus, Share2, Tag, Phone, ShoppingBag } from 'lucide-react';
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
import { useToast } from '../../components/Toast';
import { hourLabel } from '../../lib/hours';
import { photo, fmt } from '../../lib/format';
import { go } from '../../lib/router';
import { useQuickAdd, useBump, AddBar, MotionTap } from '../shared';
import { TAB_ICONS, TextRow, Footer } from '../common';
import type { ThemeDef } from '../types';

function useShare() {
  const toast = useToast((s) => s.show);
  return async (title: string) => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title, url });
      else { await navigator.clipboard.writeText(url); toast('انسخ الرابط'); }
    } catch { /* ألغى المشاركة */ }
  };
}

function Cover() {
  const share = useShare();
  return (
    <div className="relative h-[290px] overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(110%_80%_at_60%_25%,#7a0d1c_0%,#3a0610_45%,#0c0c0e_85%)]" />
      <div className="absolute inset-0 opacity-25 [background-image:radial-gradient(#ff5a6a_1px,transparent_1.6px)] [background-size:26px_26px] [mask-image:radial-gradient(70%_60%_at_50%_30%,black,transparent)]" />
      <p className="absolute top-16 right-5 z-10 text-[30px] leading-[1.15] font-bold text-white [text-shadow:0_4px_20px_rgba(0,0,0,0.6)]">مقرمش<br /><span className="text-primary-2">من أول عضة</span></p>
      <p className="absolute top-[150px] right-5 z-10 text-[13px] text-white/65">قرمشيات · بركر · مشويات</p>
      <img src={photo('crispy-5pcs.webp')} alt="وجبة كنتاكي" fetchPriority="high" className="absolute bottom-12 -left-10 w-[60%] drop-shadow-[0_24px_24px_rgba(0,0,0,0.75)]" />
      <img src={photo('fries-classic.webp', 'sm')} alt="" className="absolute bottom-20 left-[36%] w-[20%] rotate-6 drop-shadow-[0_18px_18px_rgba(0,0,0,0.7)]" />
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-bg to-transparent" />
      <button onClick={() => share('منيو فرايدي')} aria-label="شارك المنيو" className="absolute top-4 left-4 grid size-11 place-items-center rounded-full bg-white/12 text-white backdrop-blur-md"><Share2 size={19} /></button>
    </div>
  );
}

function RestaurantHead() {
  const { data } = useMenu();
  const s = data.settings;
  const minFee = Math.min(...data.zones.map((z) => z.fee));
  return (
    <div className="relative z-10 -mt-14 px-4">
      <div className="flex items-end gap-3">
        <div className="rounded-full bg-bg p-1.5 shadow-[0_10px_30px_-8px_rgba(232,17,45,0.55)]"><Logo size={78} /></div>
        <div className="min-w-0 flex-1 pb-1">
          <h1 className="flex items-center gap-1.5 text-[24px] leading-tight font-bold">{s.restaurantName} <BadgeCheck size={20} className="text-primary-2" aria-label="المطعم الرسمي" /></h1>
          <div className="mt-1 flex items-center gap-2"><StatusPill /><span className="text-[12.5px] text-muted">{s.tagline}</span></div>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-3 rounded-[22px] border border-line bg-surface p-2.5 pe-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-primary text-white shadow-[0_8px_20px_-6px_var(--t-primary)]"><Bike size={22} /></span>
        <div className="flex-1">
          <p className="text-[15px] font-semibold">يوصلك خلال <bdi className="num">{s.etaMinutes}</bdi> دقيقة تقريباً</p>
          <p className="text-[12.5px] text-muted">التوصيل من <bdi className="num">{fmt(minFee)}</bdi> د.ع · الدوام {hourLabel(s.hours.open)} – {hourLabel(s.hours.close)}</p>
        </div>
      </div>
    </div>
  );
}

const OFFERS = [
  { id: 'F077', title: 'عرض المقبلات', sub: 'اختار أي 3 أطباق مقبلات', img: null },
  { id: 'F001', title: 'خليها وجبة', sub: 'أي بركر + بطاطا وحلقات بصل وببسي', extra: 3000, img: 'burger-fryday.webp' },
  { id: 'F020', title: 'وجبة جامبو', sub: '8 قطع كرسبي + 8 ستربس للشلة', img: 'crispy-8pcs.webp' },
];

function Offers() {
  const { byId } = useMenu();
  const q = useQuickAdd();
  return (
    <div className="no-scrollbar mt-5 flex snap-x gap-3 overflow-x-auto px-4 pb-1">
      {OFFERS.map((o) => {
        const item = byId.get(o.id)!;
        return (
          <button key={o.id} onClick={() => q.open(item)} className="relative flex h-[104px] w-[262px] shrink-0 snap-start items-center overflow-hidden rounded-[20px] border border-line bg-surface p-3.5 text-start">
            <div className="absolute -left-6 -bottom-8 size-28 rounded-full bg-primary/25 blur-2xl" />
            <div className="relative flex-1">
              <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[12px] font-bold text-white"><Tag size={12} /> عرض</span>
              <p className="mt-1.5 text-[16px] font-bold">{o.title}</p>
              <p className="text-[12.5px] leading-snug text-muted">{o.sub}</p>
            </div>
            <div className="relative ms-2 text-center">
              {o.img && <img src={photo(o.img, 'sm')} alt="" loading="lazy" className="mx-auto h-14 w-20 object-contain drop-shadow-[0_10px_10px_rgba(0,0,0,0.6)]" />}
              <p className="text-[15px] font-bold text-primary-2">{o.extra ? <>+<bdi className="num">{fmt(o.extra)}</bdi></> : <bdi className="num">{fmt(item.price!)}</bdi>}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function GridCard({ item }: { item: Item }) {
  const q = useQuickAdd();
  return (
    <div role="button" tabIndex={0} onClick={() => q.open(item)} onKeyDown={(e) => e.key === 'Enter' && q.open(item)}
      className="relative mt-5 flex cursor-pointer flex-col overflow-visible rounded-[20px] border border-line bg-surface pb-3 transition active:scale-[0.97]">
      <div className="relative h-[132px] rounded-t-[20px] bg-[radial-gradient(80%_70%_at_50%_60%,#3a0a12_0%,#17171a_75%)]">
        <Plate file={item.image!} alt={item.name} className="absolute -top-6 inset-x-1 bottom-1" />
      </div>
      <div className="px-3 pt-1.5">
        <h3 className="clamp-1 text-[15px] font-semibold">{item.name}</h3>
        <p className="clamp-1 text-[12px] text-muted">{item.nameEn ?? item.section}</p>
        <div className="mt-2 flex items-center justify-between">
          {item.price != null ? <Price value={item.price} className="text-[15.5px] font-bold" /> : <span className="text-[13px] font-semibold text-primary-2">حسب الطلب</span>}
          {item.orderable ? (
            <MotionTap label={`أضف ${item.name}`} onClick={() => q.plus(item)} className="-m-1 grid size-11 place-items-center rounded-full bg-primary text-white shadow-[0_6px_16px_-4px_var(--t-primary)]">
              <Plus size={20} strokeWidth={2.75} />
            </MotionTap>
          ) : (
            <span className="grid size-10 place-items-center rounded-full bg-[#128C4B] text-white"><Phone size={17} /></span>
          )}
        </div>
      </div>
    </div>
  );
}

function CartBar() {
  const { count, subtotal } = useCartSummary();
  const controls = useBump();
  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div className="pb-safe fixed inset-x-0 bottom-0 z-30 mx-auto max-w-[480px] border-t border-line bg-[#141417]/95 px-4 pt-3 backdrop-blur" initial={{ y: 120 }} animate={{ y: 0 }} exit={{ y: 120 }} transition={{ type: 'spring', stiffness: 380, damping: 32 }}>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <p className="text-[12.5px] text-muted"><bdi className="num">{count}</bdi> قطعة بالسلة</p>
              <Price value={subtotal} className="text-[20px] font-bold" />
            </div>
            <motion.button animate={controls} onClick={() => go('c/cart')} className="flex h-13 items-center gap-2 rounded-full bg-primary px-6 text-[16px] font-bold text-white shadow-[0_10px_24px_-8px_var(--t-primary)]">
              <ShoppingBag size={19} /> عرض السلة
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function HomeC() {
  const b = useMenuBrowser();
  return (
    <div className="pb-28">
      <Cover />
      <RestaurantHead />
      <ClosedNotice className="mx-4 mt-3" />
      {!b.results && <Offers />}
      <SearchInput b={b} className="mx-4 mt-4" inputClassName="bg-surface border border-line text-fg focus:border-primary" />

      <div ref={b.anchorRef} />
      <div ref={b.navRef} className="sticky top-0 z-20 bg-bg/92 pt-3 pb-3 backdrop-blur-md">
        {!b.results && (
          <div role="tablist" aria-label="التبويبات" className="mx-4 grid grid-cols-3 gap-1 rounded-full border border-line bg-surface p-1">
            {b.data.tabs.map((t) => {
              const Icon = TAB_ICONS[t.id];
              const on = b.tab === t.id;
              return (
                <button key={t.id} role="tab" aria-selected={on} onClick={() => b.setTab(t.id)}
                  className={`relative flex h-11 items-center justify-center gap-1.5 rounded-full text-[14.5px] font-semibold transition-colors ${on ? 'text-white' : 'text-muted'}`}>
                  {on && <motion.span layoutId="c-tab" className="absolute inset-0 rounded-full bg-primary shadow-[0_6px_18px_-6px_var(--t-primary)]" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
                  <Icon size={17} className="relative" /> <span className="relative">{t.name}</span>
                </button>
              );
            })}
          </div>
        )}
        <SectionChips b={b} className="mt-2.5" render={(s, on) => (
          <button className={`h-10 rounded-full px-4 text-[14px] font-semibold whitespace-nowrap transition ${on ? 'bg-white text-black' : 'border border-line bg-surface text-fg/80'}`}>{s.name}</button>
        )} />
      </div>

      <SectionList b={b} layout="grid"
        sectionTitle={(s) => <h2 className="mb-1 flex items-center gap-2 text-[19px] font-bold"><span className="h-5 w-1 rounded-full bg-primary" />{s.name}</h2>}
        renderItem={(i) => <GridCard item={i} />}
        renderTextItem={(i) => <TextRow item={i} plusClass="bg-primary text-white" />}
      />
      <Footer />
      <CartBar />
    </div>
  );
}

function ItemC({ item, onClose }: { item: Item; onClose: () => void }) {
  const cfg = useItemConfig(item);
  const share = useShare();
  return (
    <div className="flex min-h-full flex-col bg-bg">
      <div className="relative h-[330px] shrink-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(90%_75%_at_50%_55%,#6e0c1a_0%,#2a060c_55%,#0c0c0e_100%)]" />
        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-bg to-transparent" />
        <div className="absolute inset-x-0 top-0 z-10 flex justify-between p-4">
          <button onClick={onClose} aria-label="رجوع" className="grid size-11 place-items-center rounded-full bg-white/12 text-white backdrop-blur-md"><ArrowRight size={20} /></button>
          <button onClick={() => share(item.name)} aria-label="شارك الصنف" className="grid size-11 place-items-center rounded-full bg-white/12 text-white backdrop-blur-md"><Share2 size={18} /></button>
        </div>
        {item.image ? (
          <motion.div initial={{ scale: 0.86, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 220, damping: 22 }} className="absolute inset-x-6 top-12 bottom-6">
            <Plate file={item.image} alt={item.name} size="lg" eager />
          </motion.div>
        ) : (
          <div className="absolute inset-0 grid place-items-center"><Logo size={150} className="shadow-[0_16px_40px_-14px_rgba(0,0,0,0.45)]" /></div>
        )}
      </div>
      <div className="relative -mt-4 flex-1 rounded-t-[28px] border-t border-line bg-surface px-4 pt-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-[23px] leading-tight font-bold">{item.name}</h2>
            <p className="text-[13.5px] text-muted">{item.nameEn ? `${item.nameEn} · ` : ''}{item.section}</p>
          </div>
          <div className="pt-1"><QtyStepper value={cfg.qty} onChange={cfg.setQty} look="dark" /></div>
        </div>
        {item.desc && <p className="mt-3 text-[14.5px] leading-7 text-fg/70">{item.desc}</p>}
        <div className="mt-6 space-y-7 pb-6">
          {cfg.sizeGroup && <SizePicker item={item} group={cfg.sizeGroup} cfg={cfg} look="img" />}
          {cfg.otherGroups.map((g) => <OptionGroupView key={g.code} group={g} cfg={cfg} look="tiles" />)}
          {item.orderable && <NoteField cfg={cfg} />}
        </div>
      </div>
      <AddBar item={item} cfg={cfg} onDone={onClose} className="border-t border-line bg-[#141417]/95 px-4 pt-3 backdrop-blur">
        {(submit) => (
          <div className="flex items-center gap-3">
            <Price value={cfg.total} className="flex-1 text-[22px] font-bold" />
            <button onClick={submit} className={`h-13 rounded-full px-7 text-[16px] font-bold text-white transition active:scale-[0.97] ${cfg.valid ? 'bg-primary shadow-[0_10px_24px_-8px_var(--t-primary)]' : 'bg-primary/50'}`}>أضف للسلة</button>
          </div>
        )}
      </AddBar>
    </div>
  );
}

export const themeC: ThemeDef = {
  id: 'c',
  letter: 'C',
  name: 'الفخم الأسود',
  blurb: 'أسود وأحمر بإحساس مطعم فخم بالليل. غلاف كبير ولوغو دائري، كروت عروض جانبية، والتخصيص بمربعات بالصور.',
  className: 'theme-c',
  themeColor: '#0c0c0e',
  swatch: ['#e8112d', '#0c0c0e', '#17171a', '#ffffff'],
  Home: HomeC,
  Item: ItemC,
  look: {
    stepper: 'dark',
    cta: 'rounded-full bg-primary text-white',
    card: 'rounded-[20px] border border-line bg-surface',
    field: 'rounded-2xl border border-line bg-surface-2 text-fg',
  },
};
