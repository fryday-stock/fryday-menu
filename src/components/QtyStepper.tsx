import { Minus, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  size?: 'md' | 'lg';
  /** شكل الأزرار */
  look?: 'soft' | 'outline' | 'dark' | 'yellow';
  label?: string;
}

const looks = {
  soft: { wrap: 'bg-surface-2', btn: 'bg-surface text-fg shadow-sm', plus: 'bg-surface text-fg shadow-sm' },
  outline: { wrap: '', btn: 'border border-line text-fg bg-surface', plus: 'bg-primary text-on-primary' },
  dark: { wrap: 'bg-surface-2', btn: 'bg-surface text-fg', plus: 'bg-primary text-on-primary' },
  yellow: { wrap: '', btn: 'border border-line text-fg bg-surface', plus: 'bg-primary text-on-primary' },
};

export function QtyStepper({ value, onChange, min = 1, size = 'md', look = 'soft', label = 'الكمية' }: Props) {
  const s = size === 'lg' ? 'size-11' : 'size-10';
  const l = looks[look];
  return (
    <div className={`inline-flex items-center gap-1 rounded-full p-1 ${l.wrap}`} role="group" aria-label={label}>
      <button type="button" aria-label="نقّص" disabled={value <= min} onClick={() => onChange(value - 1)} className={`${s} grid place-items-center rounded-full transition active:scale-90 disabled:opacity-40 ${l.btn}`}>
        <Minus size={18} strokeWidth={2.5} />
      </button>
      <span className="relative w-8 overflow-hidden text-center text-[17px] font-bold" aria-live="polite">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.bdi key={value} className="num block" initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -12, opacity: 0 }} transition={{ duration: 0.16 }}>
            {String(value).padStart(2, '0')}
          </motion.bdi>
        </AnimatePresence>
      </span>
      <button type="button" aria-label="زيد" disabled={value >= 99} onClick={() => onChange(value + 1)} className={`${s} grid place-items-center rounded-full transition active:scale-90 ${l.plus}`}>
        <Plus size={18} strokeWidth={2.5} />
      </button>
    </div>
  );
}
