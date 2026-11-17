import { useMemo } from 'react';
import { motion } from 'motion/react';
import { Plus, RotateCcw, Star, Moon, CalendarDays, Sparkles } from 'lucide-react';
import type { Item } from '../data/types';
import { useMenu } from '../data/MenuContext';
import { usePastOrder } from '../store/customer';
import { useCart } from '../store/cart';
import { rebuildOrder } from '../lib/upsell';
import { activeSeason } from '../data/defaults';
import { photo, fmt } from '../lib/format';
import { go } from '../lib/router';
import { Price } from './Price';
import { useToast } from './Toast';
import { useQuickAdd, MotionTap } from '../themes/shared';
import { useNow } from '../lib/useNow';
import { useCartNotice } from '../store/upsell';

/** "الأكثر طلباً ⭐" — صف أفقي بأول المنيو (يختاره أحمد بالنجمة أو تلقائياً من الطلبات) */
export function Featured() {
  const { data, byId } = useMenu();
  const q = useQuickAdd();
  const f = data.settings.featured;
  const items = useMemo(() => f.items.map((id) => byId.get(id)).filter((i): i is Item => !!i && i.available && !!i.image), [f.items, byId]);
  if (!f.enabled || items.length < 2) return null;
  return (
    <section className="mt-6" aria-labelledby="feat-h">
      <h2 id="feat-h" className="mb-1 flex items-center gap-1.5 px-4 text-[20px] font-extrabold">
        {f.title} <Star size={18} className="fill-primary text-primary-2" aria-hidden />
      </h2>
      <div className="no-scrollbar flex snap-x gap-3 overflow-x-auto px-4 pt-5 pb-2">
        {items.map((i, k) => (
          <motion.div key={i.id} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: k * 0.05 }}
            role="button" tabIndex={0} onClick={() => q.open(i)} onKeyDown={(e) => e.key === 'Enter' && q.open(i)}
            className="relative w-[152px] shrink-0 snap-start cursor-pointer rounded-[22px] bg-surface p-3 pt-0 shadow-card active:scale-[0.97]">
            <span className="absolute top-2 left-2 z-10 grid size-6 place-items-center rounded-full bg-primary text-[11px] font-extrabold text-on-primary"><bdi className="num">{k + 1}</bdi></span>
            <div className="relative -mt-5 h-[104px]">
              <div className="plate-shadow" aria-hidden />
              <img src={photo(i.image!, 'sm')} alt={i.name} loading="lazy" className="relative h-full w-full object-contain" />
            </div>
            <p className="mt-1 line-clamp-1 text-[14.5px] font-bold">{i.name}</p>
            <div className="mt-1 flex items-center justify-between">
              <Price value={i.price!} className="text-[14.5px] font-extrabold" />
              <MotionTap label={`أضف ${i.name}`} onClick={() => q.plus(i)} className="grid size-9 place-items-center rounded-full bg-cta text-on-cta"><Plus size={17} strokeWidth={3} /></MotionTap>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/** "اطلب نفس طلبك السابق" — يرجّع نفس السلة (ويوضح الخالص أو اللي تغير سعره) */
export function PastOrderCard() {
  const { data } = useMenu();
  const past = usePastOrder((s) => s.past);
  const add = useCart((s) => s.add);
  const toast = useToast((s) => s.show);
  if (!data.settings.reorder.enabled || !past?.lines.length) return null;
  const names = past.lines.map((l) => `${l.qty > 1 ? `${l.qty}× ` : ''}${l.name}`).join('، ');
  const firstImg = past.lines.map((l) => data.items.find((i) => i.id === l.itemId)?.image).find(Boolean);
  const again = () => {
    const r = rebuildOrder(past, data);
    for (const l of r.add) add(l.itemId, l.sel, l.qty, l.note);
    const notes: string[] = [];
    if (r.skipped.length) notes.push(`ما انضاف (خالص هسه): ${r.skipped.join('، ')}`);
    for (const p of r.priceChanged) notes.push(`سعر ${p.name} صار ${fmt(p.to)} (كان ${fmt(p.from)})`);
    if (!r.add.length) { toast('أصناف طلبك السابق خالصة هسه'); return; }
    useCartNotice.getState().set(notes);
    toast('انضاف طلبك السابق للسلة');
    go('cart');
  };
  return (
    <section className="mx-4 mt-4 flex items-center gap-3 rounded-[22px] border border-line bg-surface p-3 shadow-card" aria-label="طلبك السابق">
      <div className="grid size-16 shrink-0 place-items-center rounded-2xl bg-surface-2">
        {firstImg ? <img src={photo(firstImg, 'sm')} alt="" className="size-14 object-contain" /> : <RotateCcw className="text-muted" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-extrabold">طلبك السابق — <Price value={past.total} /></p>
        <p className="line-clamp-1 text-[13px] text-muted">{names}</p>
      </div>
      <button onClick={again} className="flex h-11 shrink-0 items-center gap-1.5 rounded-2xl bg-cta px-3.5 text-[13.5px] font-bold text-on-cta active:scale-95">
        <RotateCcw size={15} /> اطلبه ثاني
      </button>
    </section>
  );
}

/** شريط الموسم فوك المنيو (رمضان / زيارة / مناسبة) */
export function SeasonStrip({ className = '' }: { className?: string }) {
  const { data } = useMenu();
  const now = useNow();
  const season = activeSeason(data.settings, now);
  if (!season) return null;
  const Icon = season.kind === 'ramadan' ? Moon : season.kind === 'ziyara' ? CalendarDays : Sparkles;
  return (
    <div role="status" className={`flex items-center gap-3 rounded-[20px] bg-gradient-to-l from-[#1f1a3d] to-[#3b2a6b] p-3.5 text-white shadow-card ${className}`}>
      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-white/12"><Icon size={21} className="text-primary" /></span>
      <div className="min-w-0">
        <p className="text-[15px] font-extrabold">{season.name}</p>
        <p className="text-[13.5px] leading-snug text-white/80">{season.message}{season.hours.enabled ? ` — الطلبات من ${season.hours.open} لـ ${season.hours.close}` : ''}</p>
      </div>
    </div>
  );
}
