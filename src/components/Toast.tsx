import { AnimatePresence, motion } from 'motion/react';
import { create } from 'zustand';
import { CircleCheck } from 'lucide-react';
import { useEffect } from 'react';

export const useToast = create<{ msg: string | null; id: number; show: (m: string) => void; hide: () => void }>((set) => ({
  msg: null,
  id: 0,
  show: (msg) => set((s) => ({ msg, id: s.id + 1 })),
  hide: () => set({ msg: null }),
}));

export function Toast() {
  const { msg, id, hide } = useToast();
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(hide, 2200);
    return () => clearTimeout(t);
  }, [msg, id, hide]);
  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[60] flex justify-center px-4" aria-live="polite">
      <AnimatePresence>
        {msg && (
          <motion.div key={id} initial={{ y: -40, opacity: 0, scale: 0.95 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: -30, opacity: 0 }} transition={{ type: 'spring', stiffness: 500, damping: 32 }}
            className="flex items-center gap-2 rounded-full bg-[#141414] px-4 py-2.5 text-[15px] font-bold text-white shadow-[0_10px_30px_-8px_rgba(0,0,0,0.5)]">
            <CircleCheck size={18} className="text-[#4ade80]" /> {msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
