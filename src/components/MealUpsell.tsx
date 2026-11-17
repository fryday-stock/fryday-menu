import { AnimatePresence, motion } from 'motion/react';
import { useMenu } from '../data/MenuContext';
import { useUpsell } from '../store/upsell';
import { useCart } from '../store/cart';
import { useToast } from './Toast';
import { photo, fmt } from '../lib/format';

/** "تحوّله لوجبة؟" — نافذة صغيرة بعد إضافة بركر أو توست بدون وجبة */
export function MealUpsell() {
  const { data } = useMenu();
  const meal = useUpsell((s) => s.meal);
  const close = useUpsell((s) => s.close);
  const lines = useCart((s) => s.lines);
  const updateSel = useCart((s) => s.updateSel);
  const toast = useToast((s) => s.show);
  const yes = () => {
    if (!meal) return;
    const line = lines.find((l) => l.key === meal.lineKey);
    if (line) {
      updateSel(line.key, { ...line.sel, [meal.group]: [meal.optionId] });
      toast(`صار ${meal.itemName} وجبة 🍟`);
    }
    close();
  };
  const fries = data.items.find((i) => i.id === 'F060')?.image ?? 'fries-classic.webp';
  return (
    <AnimatePresence>
      {meal && (
        <div className="fixed inset-0 z-[55] flex items-end justify-center" role="dialog" aria-modal="true" aria-label="تحوّله لوجبة؟">
          <motion.div className="absolute inset-0 bg-black/45" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={close} />
          <motion.div initial={{ y: 60, opacity: 0, scale: 0.96 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 60, opacity: 0 }} transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            className="pb-safe relative mx-3 mb-3 w-full max-w-[460px] overflow-hidden rounded-[26px] bg-surface p-5 pt-4 shadow-2xl">
            <div className="absolute -top-16 -left-16 size-52 rounded-full bg-primary/30 blur-2xl" />
            <div className="relative flex items-end justify-center gap-0 pt-1">
              {meal.image && <img src={photo(meal.image, 'sm')} alt="" className="relative z-10 h-24 w-32 object-contain drop-shadow-[0_10px_10px_rgba(0,0,0,0.3)]" />}
              <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.15, type: 'spring', stiffness: 500, damping: 18 }} className="z-20 -mx-2 mb-8 grid size-9 place-items-center rounded-full bg-cta text-[20px] font-extrabold text-on-cta">+</motion.span>
              <motion.img initial={{ x: -30, rotate: -15, opacity: 0 }} animate={{ x: 0, rotate: -6, opacity: 1 }} transition={{ delay: 0.1, type: 'spring', stiffness: 260, damping: 18 }} src={photo(fries, 'sm')} alt="" className="relative z-10 h-24 w-24 object-contain drop-shadow-[0_10px_10px_rgba(0,0,0,0.3)]" />
            </div>
            <h2 className="relative mt-2 text-center text-[21px] leading-snug font-extrabold">تحوّله لوجبة؟</h2>
            <p className="relative mt-1 text-center text-[15px] leading-7 text-muted">
              <b className="text-fg">{meal.itemName}</b> ويا {meal.label}
              <br />
              بـ <b className="whitespace-nowrap text-fg"><bdi className="num">{fmt(meal.price)}</bdi> د.ع</b> بس
            </p>
            <div className="relative mt-4 grid grid-cols-[1fr_auto] gap-2">
              <button autoFocus onClick={yes} className="h-14 rounded-[18px] bg-primary text-[17px] font-extrabold text-on-primary shadow-[0_10px_24px_-10px_var(--t-primary-2)] transition active:scale-[0.97]">نعم، خليها وجبة</button>
              <button onClick={close} className="h-14 rounded-[18px] border border-line px-5 text-[15px] font-bold text-muted">لا شكراً</button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
