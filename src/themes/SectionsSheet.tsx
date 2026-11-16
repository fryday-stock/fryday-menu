import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import type { Browser } from '../components/MenuBrowser';
import type { TabId } from '../data/types';

/** ورقة "كل الأقسام" — تنفتح من زر الفلتر (B و D) */
export function SectionsSheet({ b, open, onClose }: { b: Browser; open: boolean; onClose: () => void }) {
  const jump = (tab: TabId, name: string) => {
    onClose();
    b.setQuery('');
    b.setTab(tab);
    const t = b.data.tabs.find((x) => x.id === tab)!;
    const sec = t.sections.find((s) => s.name === name)!;
    setTimeout(() => b.scrollToSection(sec.id), 60);
  };
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-40" role="dialog" aria-modal="true" aria-label="كل الأقسام">
          <motion.div className="absolute inset-0 bg-black/45" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 420, damping: 40 }}
            className="pb-safe absolute inset-x-0 bottom-0 mx-auto max-h-[80dvh] max-w-[480px] overflow-y-auto rounded-t-[28px] bg-bg px-4 pt-3">
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-line" />
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-[20px] font-extrabold">كل الأقسام</h2>
              <button onClick={onClose} aria-label="سكّر" className="grid size-11 place-items-center rounded-full bg-surface-2"><X size={20} /></button>
            </div>
            {b.data.tabs.map((t) => (
              <div key={t.id} className="mb-4">
                <p className="mb-2 text-[14px] font-bold text-muted">{t.name}</p>
                <div className="flex flex-wrap gap-2">
                  {t.sections.map((s) => (
                    <button key={s.id} onClick={() => jump(t.id, s.name)} className="h-11 rounded-full border border-line bg-surface px-4 text-[14.5px] font-semibold transition active:scale-95">{s.name}</button>
                  ))}
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
