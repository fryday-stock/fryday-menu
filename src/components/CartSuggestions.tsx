import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Plus, X, Check, Soup } from 'lucide-react';
import { useMenu } from '../data/MenuContext';
import { useCart } from '../store/cart';
import type { ResolvedLine } from '../store/cart';
import { cartSuggestions, needsOptions, type Suggestion } from '../lib/upsell';
import { defaultSelection } from '../lib/price';
import { photo, fmt } from '../lib/format';
import { go } from '../lib/router';
import { useToast } from './Toast';
import { Price } from './Price';

/** "تكمّل طلبك؟" — صف أفقي بالسلة: مشروب / حلو / صلصة حسب محتوى السلة */
export function CartSuggestions({ lines }: { lines: ResolvedLine[] }) {
  const { data } = useMenu();
  const add = useCart((s) => s.add);
  const updateSel = useCart((s) => s.updateSel);
  const toast = useToast((s) => s.show);
  const [sauceFor, setSauceFor] = useState<Suggestion | null>(null);
  const list = cartSuggestions(lines, data);
  if (!list.length) return null;

  const tap = (sg: Suggestion) => {
    if (sg.kind === 'sauce') return setSauceFor(sg);
    const it = sg.item!;
    if (needsOptions(it, data.groups)) return go(`item/${it.id}`);
    add(it.id, defaultSelection(it, data.groups), 1, '');
    if (navigator.vibrate) navigator.vibrate(10);
    toast(`انضاف ${it.name}`);
  };
  const line = sauceFor ? lines.find((l) => l.key === sauceFor.lineKey) : null;

  return (
    <section className="mt-4" aria-labelledby="sug-h">
      <h2 id="sug-h" className="mb-2 text-[16px] font-extrabold">تكمّل طلبك؟</h2>
      <div className="no-scrollbar -mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1">
        <AnimatePresence initial={false}>
          {list.map((sg) => {
            const key = sg.item?.id ?? `sauce-${sg.lineKey}`;
            return (
              <motion.button key={key} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} onClick={() => tap(sg)}
                className="relative flex w-[132px] shrink-0 flex-col rounded-[18px] bg-surface p-2.5 pt-2 text-start shadow-card transition active:scale-[0.96]">
                <span className="grid h-[74px] place-items-center rounded-[14px] bg-surface-2">
                  {sg.kind === 'sauce'
                    ? <Soup size={34} className="text-accent" aria-hidden />
                    : sg.item!.image ? <img src={photo(sg.item!.image, 'sm')} alt="" loading="lazy" className="h-[68px] w-[100px] object-contain" /> : <span className="text-[12px] text-muted">{sg.item!.name}</span>}
                </span>
                <span className="mt-1.5 line-clamp-1 text-[13.5px] font-bold">{sg.kind === 'sauce' ? 'صلصة إضافية' : sg.item!.name}</span>
                <span className="text-[12.5px] text-muted">{sg.kind === 'sauce' ? `مع ${sg.lineName}` : sg.kind === 'drink' ? 'مشروب' : 'حلو'}</span>
                <span className="mt-1 flex items-center justify-between">
                  {sg.kind === 'sauce' ? <span className="text-[13px] font-extrabold">+<bdi className="num">{fmt(sg.group!.options[0]?.price ?? 0)}</bdi></span> : <Price value={sg.item!.price!} className="text-[13.5px] font-extrabold" />}
                  <span className="grid size-8 place-items-center rounded-full bg-cta text-on-cta"><Plus size={16} strokeWidth={3} /></span>
                </span>
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {sauceFor && line && (
          <div className="fixed inset-0 z-[55] flex items-end justify-center" role="dialog" aria-modal="true" aria-label="اختار الصلصة">
            <motion.div className="absolute inset-0 bg-black/45" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSauceFor(null)} />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 420, damping: 38 }}
              className="pb-safe relative max-h-[75dvh] w-full max-w-[480px] overflow-y-auto rounded-t-[26px] bg-bg p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-[18px] font-extrabold">صلصة لـ {line.item.name}</h3>
                <button onClick={() => setSauceFor(null)} aria-label="سكّر" className="grid size-11 place-items-center rounded-full bg-surface-2"><X size={19} /></button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {sauceFor.group!.options.map((o) => {
                  const on = (line.sel[sauceFor.group!.code] ?? []).includes(o.id);
                  return (
                    <button key={o.id} onClick={() => {
                      const cur = line.sel[sauceFor.group!.code] ?? [];
                      updateSel(line.key, { ...line.sel, [sauceFor.group!.code]: on ? cur.filter((x) => x !== o.id) : [...cur, o.id] });
                      toast(`انضافت صلصة ${o.name}`);
                      setSauceFor(null);
                    }} className={`flex min-h-12 items-center justify-between gap-2 rounded-2xl border-2 px-3 text-[14.5px] font-bold transition ${on ? 'border-primary bg-primary/12' : 'border-line bg-surface'}`}>
                      <span className="flex items-center gap-1.5">{on && <Check size={16} strokeWidth={3} />}{o.name}</span>
                      <bdi className="num text-[12.5px] text-muted">+{fmt(o.price)}</bdi>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
