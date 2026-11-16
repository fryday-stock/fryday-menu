import { useState } from 'react';
import { motion } from 'motion/react';
import { ChevronDown, PartyPopper } from 'lucide-react';
import { useMenu } from '../data/MenuContext';
import { useLastOrder } from '../store/customer';
import { useCart } from '../store/cart';
import { whatsAppLink } from '../lib/whatsapp';
import { Price } from '../components/Price';
import { useTheme } from '../themes/ThemeContext';
import { go } from '../lib/router';
import { postSent } from '../data/source';
import { etaText } from '../lib/hours';
import { Clock } from 'lucide-react';

function WhatsAppIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91A9.85 9.85 0 0 0 12.04 2zm5.8 14.03c-.24.68-1.42 1.3-1.96 1.35-.5.05-.97.24-3.27-.68-2.77-1.09-4.52-3.93-4.66-4.11-.13-.18-1.1-1.47-1.1-2.81 0-1.34.7-2 .95-2.27.25-.27.54-.34.72-.34h.52c.17 0 .39-.06.61.47.24.55.79 1.9.86 2.04.07.13.11.3.02.48-.09.18-.13.29-.27.45-.13.16-.28.35-.4.47-.13.13-.27.28-.12.55.16.27.7 1.15 1.5 1.86 1.03.92 1.9 1.2 2.17 1.34.27.13.43.11.59-.07.16-.18.68-.79.86-1.06.18-.27.36-.23.61-.14.25.09 1.58.75 1.85.88.27.13.45.2.52.31.07.11.07.66-.17 1.33z" />
    </svg>
  );
}

export function DoneScreen() {
  const t = useTheme();
  const { data } = useMenu();
  const order = useLastOrder((s) => s.order);
  const markSent = useLastOrder((s) => s.markSent);
  const clear = useCart((s) => s.clear);
  const [showMsg, setShowMsg] = useState(true);

  if (!order) {
    return (
      <div className="grid min-h-full place-items-center p-8 text-center">
        <div>
          <p className="mb-4 text-[16px] text-muted">ماكو طلب حالياً.</p>
          <button onClick={() => go('', { replace: true })} className={`h-12 px-8 font-bold ${t.look.cta}`}>رجوع للمنيو</button>
        </div>
      </div>
    );
  }

  const link = whatsAppLink(data.settings.whatsapp, order.message);
  const onSend = () => {
    if (order.id != null && order.clientId) postSent(order.id, order.clientId);
    markSent();
    clear();
  };
  const eta = order.etaMinutes ? etaText(new Date(order.createdAt), order.etaMinutes, data.settings.hours.utcOffset) : null;

  return (
    <div className="pb-safe flex min-h-full flex-col px-4 pt-8">
      <div className="text-center">
        <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 18 }}
          className="mx-auto grid size-16 place-items-center rounded-full bg-primary text-on-primary shadow-[0_12px_30px_-10px_var(--t-primary)]">
          <PartyPopper size={30} />
        </motion.div>
        <p className="mt-4 text-[16px] font-semibold text-muted">{order.sent ? 'انرسل طلبك — رقم طلبك' : 'خطوة وحدة بقت! رقم طلبك'}</p>
        <motion.p initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.12, type: 'spring', stiffness: 260, damping: 20 }}
          className="mt-1 text-[64px] leading-none font-extrabold tracking-tight">
          <bdi className="num">#{order.number}</bdi>
        </motion.p>
        <p className="mt-3 text-[15px] text-muted">
          الإجمالي <Price value={order.total} className="font-bold text-fg" /> · {order.type === 'delivery' ? 'توصيل' : 'استلام من المطعم'} · كاش
        </p>
        {eta && (
          <p className="mx-auto mt-3 inline-flex items-center gap-2 rounded-full bg-surface px-4 py-2 text-[15px] font-bold shadow-sm">
            <Clock size={17} className="text-accent" />
            {order.type === 'delivery' ? 'يوصلك تقريباً الساعة' : 'يكون جاهز تقريباً الساعة'} <bdi className="num">{eta.split(' ')[0]}</bdi> {eta.split(' ').slice(1).join(' ')}
          </p>
        )}
      </div>

      <div className={`mt-6 overflow-hidden ${t.look.card}`}>
        <button onClick={() => setShowMsg((s) => !s)} aria-expanded={showMsg} className="flex h-12 w-full items-center justify-between px-4 text-[15px] font-bold">
          معاينة رسالة الطلب
          <ChevronDown size={18} className={`transition ${showMsg ? 'rotate-180' : ''}`} />
        </button>
        {showMsg && (
          <pre dir="rtl" className="max-h-[38vh] overflow-y-auto border-t border-line bg-surface-2/60 px-4 py-3 font-sans text-[13.5px] leading-7 whitespace-pre-wrap">{order.message}</pre>
        )}
      </div>

      <div className="mt-auto pt-6">
        <ol className="mb-4 space-y-1.5 text-[14px] text-muted">
          <li>١. اضغط الزر الأخضر — ينفتح واتساب والرسالة جاهزة.</li>
          <li>٢. اضغط إرسال بالواتساب.</li>
          <li>٣. الكاشير يأكد طلبك برسالة.</li>
        </ol>
        <a href={link} target="_blank" rel="noopener noreferrer" onClick={onSend}
          className="flex h-15 w-full items-center justify-center gap-2.5 rounded-[18px] bg-[#128C4B] text-[18px] font-extrabold text-white shadow-[0_14px_30px_-12px_#128C4B] transition active:scale-[0.98]">
          <WhatsAppIcon size={24} /> أرسل الطلب على واتساب
        </a>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {!order.sent && (
            <button onClick={() => go('checkout', { replace: true })} className="h-12 rounded-2xl border border-line bg-surface text-[15px] font-bold">تعديل البيانات</button>
          )}
          <button onClick={() => go('', { replace: true })} className={`h-12 rounded-2xl border border-line bg-surface text-[15px] font-bold ${order.sent ? 'col-span-2' : ''}`}>رجوع للمنيو</button>
        </div>
      </div>
    </div>
  );
}
