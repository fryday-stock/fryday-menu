import { useEffect, useRef, type ReactNode } from 'react';
import { motion, useAnimationControls } from 'motion/react';
import { Phone } from 'lucide-react';
import type { Item } from '../data/types';
import { useMenu } from '../data/MenuContext';
import { useCart } from '../store/cart';
import { useToast } from '../components/Toast';
import { go } from '../lib/router';
import type { ItemConfig } from '../hooks/useItemConfig';

/** زر + : الصنف بدون خيارات ينضاف مباشرة، والباقي يفتح صفحة الصنف */
export function useQuickAdd() {
  const add = useCart((s) => s.add);
  const toast = useToast((s) => s.show);
  return {
    open: (item: Item) => go(`item/${item.id}`),
    plus: (item: Item) => {
      if (!item.orderable || item.groups.length) return go(`item/${item.id}`);
      add(item.id, {}, 1, '');
      if (navigator.vibrate) navigator.vibrate(10);
      toast(`انضاف ${item.name}`);
    },
  };
}

/** حركة "نبضة" لما ينضاف شي للسلة */
export function useBump() {
  const bump = useCart((s) => s.bump);
  const controls = useAnimationControls();
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    controls.start({ scale: [1, 1.08, 0.97, 1], transition: { duration: 0.42 } });
  }, [bump, controls]);
  return controls;
}

/** زر الإضافة الكبير بأسفل صفحة الصنف (أو زر اتصال إذا الصنف ما ينطلب أونلاين) */
export function AddBar({ item, cfg, onDone, children, className = '' }: { item: Item; cfg: ItemConfig; onDone: () => void; children: (submit: () => void) => ReactNode; className?: string }) {
  const { data } = useMenu();
  const toast = useToast((s) => s.show);
  if (!item.orderable) {
    return (
      <div className={`pb-safe sticky bottom-0 z-10 px-4 pt-3 ${className}`}>
        <p className="mb-2 text-center text-[14px] font-semibold text-muted">هذا الصنف ينطلب بالاتصال — نرتبه وياك حسب المناسبة</p>
        <a href={`tel:${data.settings.callPhone}`} className="flex h-14 w-full items-center justify-center gap-2 rounded-[18px] bg-[#128C4B] text-[17px] font-extrabold text-white">
          <Phone size={20} /> اتصل بينا · <bdi className="num">{data.settings.callPhone}</bdi>
        </a>
      </div>
    );
  }
  const submit = () => {
    if (cfg.submit()) {
      toast(`انضاف ${item.name}`);
      onDone();
    }
  };
  return <div className={`pb-safe sticky bottom-0 z-10 ${className}`}>{children(submit)}</div>;
}

export function MotionTap({ children, className = '', onClick, label }: { children: ReactNode; className?: string; onClick: () => void; label: string }) {
  return (
    <motion.button type="button" aria-label={label} whileTap={{ scale: 0.86 }} onClick={(e) => { e.stopPropagation(); onClick(); }} className={className}>
      {children}
    </motion.button>
  );
}
