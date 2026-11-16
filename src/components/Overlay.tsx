import { useEffect, type ReactNode } from 'react';
import { motion } from 'motion/react';

let locks = 0;

/** طبقة فوق المنيو (الصنف / السلة / الطلب) — المنيو يبقى تحتها فيحافظ على مكان السكرول */
export function Overlay({ children, from = 'bottom', label, className = '' }: { children: ReactNode; from?: 'bottom' | 'side'; label: string; className?: string }) {
  useEffect(() => {
    // عداد: أكثر من طبقة ممكن تكون مفتوحة لحظة الانتقال
    locks++;
    document.body.style.overflow = 'hidden';
    return () => {
      locks = Math.max(0, locks - 1);
      if (!locks) document.body.style.overflow = '';
    };
  }, []);
  const initial = from === 'bottom' ? { y: '100%' } : { x: '-100%' };
  const exit = from === 'bottom' ? { y: '100%', transition: { duration: 0.22, ease: 'easeIn' as const } } : { x: '-100%', transition: { duration: 0.2, ease: 'easeIn' as const } };
  return (
    <div className="fixed inset-0 z-40" role="dialog" aria-modal="true" aria-label={label}>
      <motion.div className="absolute inset-0 bg-black/45" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.18 } }} transition={{ duration: 0.2 }} />
      <motion.div
        className={`app-frame absolute inset-x-0 top-0 mx-auto h-[100dvh] min-h-0 overflow-y-auto overscroll-contain ${className}`}
        initial={initial}
        animate={{ x: 0, y: 0 }}
        exit={exit}
        transition={{ type: 'spring', stiffness: 380, damping: 38, mass: 0.9 }}
      >
        {children}
      </motion.div>
    </div>
  );
}
