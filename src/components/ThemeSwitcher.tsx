import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Palette, X, Home } from 'lucide-react';
import { THEMES } from '../themes';
import { go } from '../lib/router';
import { useDemo } from '../hooks/useOpen';
import type { ThemeId } from '../themes/types';

/** زر عائم صغير للتبديل بين النماذج (للمرحلة 0 فقط) */
export function ThemeSwitcher({ current }: { current: ThemeId }) {
  const [open, setOpen] = useState(false);
  const forceOpen = useDemo((s) => s.forceOpen);
  const setForce = useDemo((s) => s.set);
  return (
    <div data-proto className="fixed top-1/2 left-0 z-50" dir="rtl">
      <button onClick={() => setOpen((s) => !s)} aria-label="بدّل النموذج" aria-expanded={open}
        className="flex h-11 w-9 flex-col items-center justify-center rounded-e-2xl bg-[#141414]/75 text-white shadow-lg backdrop-blur">
        {open ? <X size={16} /> : <Palette size={15} />}
        <span className="text-[12px] leading-none font-extrabold uppercase">{current}</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.16 }}
            className="absolute top-13 left-2 w-60 rounded-2xl bg-[#141414] p-2 text-white shadow-2xl" style={{ fontFamily: 'Cairo, sans-serif' }}>
            {THEMES.map((t) => (
              <button key={t.id} onClick={() => { setOpen(false); go(t.id); }}
                className={`flex h-12 w-full items-center gap-3 rounded-xl px-3 text-start ${t.id === current ? 'bg-white/12' : ''}`}>
                <span className="flex -space-x-1.5 rtl:space-x-reverse">
                  {t.swatch.slice(0, 3).map((c) => <span key={c} className="size-4 rounded-full ring-2 ring-[#141414]" style={{ background: c }} />)}
                </span>
                <span className="text-[15px] font-bold">{t.letter} — {t.name}</span>
              </button>
            ))}
            <button onClick={() => { setOpen(false); go(''); }} className="flex h-11 w-full items-center gap-3 rounded-xl px-3 text-[14px] text-white/80">
              <Home size={16} /> كل النماذج
            </button>
            <label className="mt-1 flex min-h-11 items-center gap-3 rounded-xl border-t border-white/10 px-3 pt-1 text-[13px] text-white/80">
              <input type="checkbox" checked={forceOpen} onChange={(e) => setForce(e.target.checked)} className="size-5 accent-[#FFC72C]" />
              تجربة الطلب برا الدوام
            </label>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
