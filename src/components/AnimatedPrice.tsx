import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { fmt } from '../lib/format';

/** سعر يتحرك بنعومة لما يتغير (يطلع من تحت) — بدون حركة إذا "تقليل الحركة" مفعّل */
export function AnimatedPrice({ value, className = '', unit = true }: { value: number; className?: string; unit?: boolean }) {
  const reduce = useReducedMotion();
  return (
    <span className={`inline-flex items-baseline gap-1 whitespace-nowrap ${className}`}>
      <span className="relative inline-flex overflow-hidden">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.bdi key={value} className="num" initial={reduce ? false : { y: '70%', opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={reduce ? undefined : { y: '-70%', opacity: 0 }} transition={{ type: 'spring', stiffness: 520, damping: 34 }}>
            {fmt(value)}
          </motion.bdi>
        </AnimatePresence>
      </span>
      {unit && <span className="text-[0.72em] font-medium opacity-80">د.ع</span>}
    </span>
  );
}
