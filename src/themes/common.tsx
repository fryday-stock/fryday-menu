import { Hamburger, Coffee, CakeSlice, Plus, MapPin } from 'lucide-react';
import { mapsUrl } from '../lib/delivery';
import type { Item, TabId } from '../data/types';
import { useMenu } from '../data/MenuContext';
import { Price } from '../components/Price';
import { useQuickAdd, MotionTap } from './shared';

export const TAB_ICONS: Record<TabId, typeof Hamburger> = { food: Hamburger, drinks: Coffee, sweets: CakeSlice };

/* صف نصي للأصناف بدون صورة */
export function TextRow({ item, plusClass = 'bg-cta text-on-cta', className = '' }: { item: Item; plusClass?: string; className?: string }) {
  const q = useQuickAdd();
  return (
    <div role="button" tabIndex={0} onClick={() => q.open(item)} onKeyDown={(e) => e.key === 'Enter' && q.open(item)}
      className={`flex min-h-16 cursor-pointer items-center gap-3 border-b border-line px-1 py-2.5 last:border-0 ${className}`}>
      <div className="min-w-0 flex-1">
        <p className="text-[15.5px] font-bold">{item.name}</p>
        {(item.desc || item.nameEn) && <p className="clamp-1 text-[12.5px] text-muted">{item.desc ?? item.nameEn}</p>}
      </div>
      {item.price != null && <Price value={item.price} className="text-[15px] font-extrabold" />}
      <MotionTap label={`أضف ${item.name}`} onClick={() => q.plus(item)} className={`grid size-11 shrink-0 place-items-center rounded-full ${plusClass}`}>
        <Plus size={20} strokeWidth={2.75} />
      </MotionTap>
    </div>
  );
}

export function Footer({ className = '' }: { className?: string }) {
  const { data } = useMenu();
  const s = data.settings;
  return (
    <footer className={`mx-4 mt-10 border-t border-line pt-5 text-center text-[13px] leading-6 text-muted ${className}`}>
      <p className="font-bold text-fg">{s.restaurantName} — {s.restaurantNameEn}</p>
      <p>{s.address}</p>
      <a href={mapsUrl(s.location)} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-1.5 font-bold text-fg underline underline-offset-4">
        <MapPin size={15} /> موقعنا على الخريطة
      </a>
      <p>اتصال: <bdi className="num">{s.phones.join(' — ')}</bdi></p>
      <p>الدفع {s.payment} · {s.deliveryNote}</p>
    </footer>
  );
}

