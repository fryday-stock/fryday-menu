import { useEffect, useState } from 'react';

interface BIP extends Event { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }

/** "أضف للشاشة الرئيسية": أندرويد يطلع نافذة التثبيت، آيفون نعرض الخطوات */
export function useInstall() {
  const [evt, setEvt] = useState<BIP | null>(null);
  const [installed, setInstalled] = useState(() => typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches);
  useEffect(() => {
    const on = (e: Event) => { e.preventDefault(); setEvt(e as BIP); };
    const done = () => setInstalled(true);
    window.addEventListener('beforeinstallprompt', on);
    window.addEventListener('appinstalled', done);
    return () => { window.removeEventListener('beforeinstallprompt', on); window.removeEventListener('appinstalled', done); };
  }, []);
  const ios = typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent);
  return {
    available: !installed && (!!evt || ios),
    ios: ios && !evt,
    install: async () => { if (evt) { await evt.prompt(); setEvt(null); } },
  };
}
