import { ShoppingBag, Trash, Plus } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useMenu } from '../data/MenuContext';
import { useCartSummary } from '../hooks/useCartSummary';
import { useOpen } from '../hooks/useOpen';
import { useCart } from '../store/cart';
import { selectionSummary } from '../lib/price';
import { photo } from '../lib/format';
import { Price } from '../components/Price';
import { QtyStepper } from '../components/QtyStepper';
import { ScreenHeader } from '../components/ScreenHeader';
import { ClosedNotice } from '../components/StatusPill';
import { useTheme } from '../themes/ThemeContext';
import { back, go } from '../lib/router';
import { feeSummary } from '../lib/delivery';

export function CartScreen() {
  const t = useTheme();
  const { data } = useMenu();
  const { lines, count, subtotal } = useCartSummary();
  const setQty = useCart((s) => s.setQty);
  const remove = useCart((s) => s.remove);
  const { open, reason } = useOpen();
  const min = data.settings.minOrder;
  const belowMin = min.enabled && subtotal < min.amount;

  return (
    <div className="flex min-h-full flex-col">
      <ScreenHeader title="سلتك" onBack={() => back('')} end={count ? <span className="text-[13px] font-bold whitespace-nowrap text-muted"><bdi className="num">{count}</bdi> قطع</span> : null} />

      {lines.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 pb-24 text-center">
          <div className="grid size-24 place-items-center rounded-full bg-surface-2 text-muted"><ShoppingBag size={40} /></div>
          <h2 className="text-[20px] font-extrabold">سلتك فاضية</h2>
          <p className="text-[15px] text-muted">اختار من المنيو واضغط + حتى يبين هنا.</p>
          <button onClick={() => go('', { replace: true })} className={`mt-2 h-12 px-8 text-[16px] font-bold ${t.look.cta}`}>تصفح المنيو</button>
        </div>
      ) : (
        <>
          <div className="flex-1 px-4 pb-4">
            <ClosedNotice className="mb-3" />
            <ul className="flex flex-col gap-3">
              <AnimatePresence initial={false}>
                {lines.map((l) => {
                  const summary = selectionSummary(l.item, data.groups, l.sel);
                  return (
                    <motion.li key={l.key} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -60, transition: { duration: 0.18 } }}
                      className={`flex gap-3 p-3 ${t.look.card}`}>
                      {l.item.image && (
                        <div className="grid size-20 shrink-0 place-items-center rounded-2xl bg-surface-2">
                          <img src={photo(l.item.image, 'sm')} alt="" loading="lazy" className="size-[74px] object-contain" />
                        </div>
                      )}
                      <div className="flex min-w-0 flex-1 flex-col">
                        <div className="flex items-start gap-2">
                          <h3 className="flex-1 text-[16px] font-bold leading-snug">{l.item.name}</h3>
                          <button aria-label={`احذف ${l.item.name}`} onClick={() => remove(l.key)} className="-m-2 grid size-10 shrink-0 place-items-center rounded-full text-muted transition active:scale-90 active:text-danger">
                            <Trash size={18} />
                          </button>
                        </div>
                        {summary && <p className="text-[13px] leading-snug text-muted">{summary}</p>}
                        {l.note && <p className="text-[13px] leading-snug text-muted">ملاحظة: {l.note}</p>}
                        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                          <Price value={l.total} className="text-[16px] font-extrabold" />
                          <QtyStepper value={l.qty} min={0} onChange={(n) => setQty(l.key, n)} look={t.look.stepper} label={`كمية ${l.item.name}`} />
                        </div>
                      </div>
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </ul>

            <button onClick={() => go('', { replace: true })} className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line text-[15px] font-bold text-muted transition active:scale-[0.98]">
              <Plus size={18} /> أضف أصناف ثانية
            </button>

            <div className={`mt-4 space-y-2 p-4 text-[15px] ${t.look.card}`}>
              <div className="flex justify-between"><span className="text-muted">المجموع</span><Price value={subtotal} className="font-bold" /></div>
              <div className="flex justify-between text-[14px]"><span className="text-muted">التوصيل</span><span className="text-muted">{data.settings.delivery.feeMode === 'map' ? 'يتحسب من موقعك على الخريطة' : data.settings.delivery.feeMode === 'cashier' ? data.settings.messages.cashierFee : `${feeSummary(data.settings, data.zones)} د.ع`}</span></div>
              {belowMin && <p className="text-[14px] font-semibold text-danger">أقل مبلغ للطلب <Price value={min.amount} /></p>}
            </div>
          </div>

          <div className="pb-safe sticky bottom-0 z-10 bg-gradient-to-t from-bg via-bg to-bg/0 px-4 pt-4">
            {!open && <p className="mb-2 text-center text-[14px] font-semibold text-danger">{reason}</p>}
            <button disabled={!open || belowMin} onClick={() => go('checkout')}
              className={`flex h-14 w-full items-center justify-between px-5 text-[17px] font-bold transition active:scale-[0.98] disabled:opacity-45 ${t.look.cta}`}>
              <span>كمّل الطلب</span>
              <Price value={subtotal} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
