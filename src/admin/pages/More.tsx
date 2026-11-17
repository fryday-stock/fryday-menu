import { ChevronLeft, ListChecks, Map, FileSpreadsheet, KeyRound, ExternalLink, Clapperboard, TrendingUp, Moon } from 'lucide-react';
import { go } from '../../lib/router';
import { PageTitle } from '../ui';

const LINKS = [
  { to: 'banner', label: 'البانر الذكي', hint: 'صور وفيديو الرأس حسب الوقت والجو', Icon: Clapperboard },
  { to: 'sales', label: 'المبيعات', hint: 'الأكثر طلباً، حوّل لوجبة، اقتراحات السلة، القطة', Icon: TrendingUp },
  { to: 'season', label: 'وضع المواسم', hint: 'رمضان، زيارة، مناسبة — أوقات ورسالة خاصة', Icon: Moon },
  { to: 'groups', label: 'مجموعات الخيارات', hint: 'الحجوم، الصوصات، حوّل لوجبة…', Icon: ListChecks },
  { to: 'zones', label: 'مناطق التوصيل', hint: 'الأجور وحدود المناطق على الخريطة', Icon: Map },
  { to: 'excel', label: 'استيراد وتصدير Excel', hint: 'نفس شكل ملف menu.xlsx', Icon: FileSpreadsheet },
  { to: 'password', label: 'تغيير كلمة السر', hint: 'ولّد رمز جديد وحطه بإعدادات Cloudflare', Icon: KeyRound },
];

export function MorePage() {
  return (
    <>
      <PageTitle>المزيد</PageTitle>
      <ul className="space-y-2">
        {LINKS.map(({ to, label, hint, Icon }) => (
          <li key={to}>
            <button onClick={() => go(to)} className="flex min-h-16 w-full items-center gap-3 rounded-[18px] bg-surface p-3.5 text-start shadow-card">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary text-on-primary"><Icon size={20} /></span>
              <span className="flex-1"><span className="block text-[15.5px] font-bold">{label}</span><span className="block text-[13px] text-muted">{hint}</span></span>
              <ChevronLeft size={18} className="text-muted" />
            </button>
          </li>
        ))}
        <li>
          <a href="../" target="_blank" rel="noopener" className="flex min-h-16 w-full items-center gap-3 rounded-[18px] bg-surface p-3.5 shadow-card">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-cta text-on-cta"><ExternalLink size={20} /></span>
            <span className="flex-1 text-[15.5px] font-bold">فتح المنيو مثل الزبون</span>
          </a>
        </li>
      </ul>
    </>
  );
}
