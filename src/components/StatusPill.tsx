import { useMenu } from '../data/MenuContext';
import { useOpen } from '../hooks/useOpen';
import { hoursText } from '../lib/hours';

/** حالة الدوام: مفتوح الآن / مسكّر (مع نقطة + نص، مو لون بس) */
export function StatusPill({ className = '', withHours = false, tone = 'light' }: { className?: string; withHours?: boolean; tone?: 'light' | 'dark' }) {
  const { data } = useMenu();
  const { open, forced } = useOpen();
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] font-bold ${tone === 'dark' ? (open ? 'bg-white/10 text-[#6ee79a] backdrop-blur-md' : 'bg-white/10 text-[#ff9b85] backdrop-blur-md') : open ? 'bg-ok/12 text-ok' : 'bg-danger/12 text-danger'} ${className}`}>
      <span className={`relative inline-block size-2 rounded-full ${open ? (tone === 'dark' ? 'bg-[#4ade80]' : 'bg-ok') : tone === 'dark' ? 'bg-[#ff8a70]' : 'bg-danger'}`}>
        {open && <span className="absolute inset-0 animate-ping rounded-full bg-ok opacity-60 motion-reduce:hidden" />}
      </span>
      {open ? (forced ? 'مفتوح (وضع تجربة)' : 'مفتوح الآن') : 'مسكّر هسه'}
      {withHours && <span className={`font-medium ${tone === 'dark' ? 'text-white/70' : 'opacity-80'}`}>· {hoursText(data.settings.hours)}</span>}
    </span>
  );
}

/** شريط تنبيه برا الدوام */
export function ClosedNotice({ className = '' }: { className?: string }) {
  const { data } = useMenu();
  const { open } = useOpen();
  if (open) return null;
  return (
    <div role="status" className={`rounded-2xl border border-danger/25 bg-danger/8 px-4 py-3 text-[14px] font-semibold text-danger ${className}`}>
      المطعم مسكّر هسه — {data.settings.closedMessage}. تگدر تتصفح المنيو وتجهز سلتك.
    </div>
  );
}
