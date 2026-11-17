import { useState } from 'react';
import { ArrowRight, Sparkles, RotateCcw } from 'lucide-react';
import type { Settings } from '../../data/types';
import { useAdmin, api, AdminError } from '../api';
import { Btn, Card, Field, Input, Toggle } from '../ui';
import { ItemPicker, MediaUpload } from '../pickers';
import { go } from '../../lib/router';
import { useToast } from '../../components/Toast';
import { CatSvg } from '../../components/CatMascot';
import { photo } from '../../lib/format';

/** إعدادات زيادة قيمة الطلب: الوجبة، اقتراحات السلة، الأكثر طلباً، الطلب السابق، القطة */
export function SalesPage() {
  const saved = useAdmin((x) => x.menu!.settings);
  const save = useAdmin((x) => x.saveSettings);
  const loadMenu = useAdmin((x) => x.loadMenu);
  const toast = useToast((x) => x.show);
  const [s, setS] = useState<Settings>(saved);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const dirty = JSON.stringify(s) !== JSON.stringify(saved);
  const up = <K extends keyof Settings>(k: K, v: Partial<Settings[K]>) => setS((x) => ({ ...x, [k]: { ...(x[k] as object), ...(v as object) } }));

  const onSave = async () => {
    setBusy('save');
    setErr(null);
    try { setS(await save(s)); toast('انحفظ'); } catch (e) { setErr((e as AdminError).message); } finally { setBusy(null); }
  };
  const autoRank = async () => {
    setBusy('auto');
    setErr(null);
    try {
      const r = await api<{ items: string[]; orders: number }>('featured/auto', { body: {} });
      const m = await loadMenu();
      setS(m.settings);
      toast(`انرتبت من ${r.orders} طلب`);
    } catch (e) { setErr((e as AdminError).message); } finally { setBusy(null); }
  };

  return (
    <div className="space-y-3 pb-24">
      <div className="flex items-center gap-2">
        <button onClick={() => go('more')} aria-label="رجوع" className="grid size-11 place-items-center rounded-full border border-line bg-surface"><ArrowRight size={19} /></button>
        <h1 className="text-[20px] font-extrabold">المبيعات</h1>
      </div>

      <Card title="⭐ الأكثر طلباً">
        <Toggle checked={s.featured.enabled} onChange={(enabled) => up('featured', { enabled })} label="يطلع بأول المنيو" />
        <Field label="العنوان" className="mt-2"><Input value={s.featured.title} onChange={(e) => up('featured', { title: e.target.value })} /></Field>
        <p className="mt-3 mb-1.5 text-[14px] font-bold">الأصناف (بالترتيب) — أو حط ⭐ من صفحة المنيو</p>
        <ItemPicker value={s.featured.items} onChange={(items) => up('featured', { items })} max={10} />
        <Btn size="sm" variant="primary" className="mt-3" busy={busy === 'auto'} onClick={autoRank}><Sparkles size={16} /> رتّب تلقائياً من الطلبات (آخر 30 يوم)</Btn>
        <p className="mt-1 text-[12.5px] text-muted">يحتاج 10 طلبات مؤكدة على الأقل. الترتيب ينحفظ مباشرة.</p>
      </Card>

      <Card title="حوّل لوجبة؟">
        <Toggle checked={s.upsell.meal.enabled} onChange={(enabled) => setS((x) => ({ ...x, upsell: { ...x.upsell, meal: { ...x.upsell.meal, enabled } } }))} label="يسأل بعد إضافة بركر أو توست" hint={`يستخدم مجموعة الخيارات ${s.upsell.meal.group} — وما يسأل إذا الزبون اختار الوجبة أصلاً`} />
      </Card>

      <Card title="تكمّل طلبك؟ (بالسلة)">
        <Toggle checked={s.upsell.cart.enabled} onChange={(enabled) => setS((x) => ({ ...x, upsell: { ...x.upsell, cart: { ...x.upsell.cart, enabled } } }))} label="اقتراحات حسب محتوى السلة" hint="ماكو مشروب ← مشروبات · أكل بدون حلو ← حلويات · مقالي ← صلصة إضافية" />
        <p className="mt-3 mb-1.5 text-[14px] font-bold">المشروبات المقترحة</p>
        <ItemPicker value={s.upsell.cart.drinks} onChange={(drinks) => setS((x) => ({ ...x, upsell: { ...x.upsell, cart: { ...x.upsell.cart, drinks } } }))} max={8} />
        <p className="mt-3 mb-1.5 text-[14px] font-bold">الحلويات المقترحة</p>
        <ItemPicker value={s.upsell.cart.sweets} onChange={(sweets) => setS((x) => ({ ...x, upsell: { ...x.upsell, cart: { ...x.upsell.cart, sweets } } }))} max={8} />
      </Card>

      <Card title="اطلب نفس طلبك السابق">
        <Toggle checked={s.reorder.enabled} onChange={(enabled) => up('reorder', { enabled })} label="كارت الطلب السابق بأول المنيو" hint="محفوظ على موبايل الزبون بس. يتجاهل الخالص ويوضح اللي تغير سعره" />
      </Card>

      <Card title="قطة فرايدي">
        <Toggle checked={s.mascot.enabled} onChange={(enabled) => up('mascot', { enabled })} label="القطة تقفز على السلة لما ينضاف شي" hint="ما تطلع إذا الموبايل مفعّل عليه تقليل الحركة" />
        <div className="mt-3 flex items-center gap-3">
          <span className="grid size-20 shrink-0 place-items-center rounded-2xl bg-surface-2">{s.mascot.image ? <img src={photo(s.mascot.image, 'lg')} alt="" className="size-16 object-contain" /> : <CatSvg size={60} />}</span>
          <div className="flex-1 space-y-2">
            <MediaUpload allowVideo={false} value={null} onChange={(m) => up('mascot', { image: m.src })} />
            {s.mascot.image && <Btn size="sm" variant="ghost" onClick={() => up('mascot', { image: null })}><RotateCcw size={15} /> رجّع القطة المرسومة</Btn>}
          </div>
        </div>
      </Card>

      {err && <p role="alert" className="rounded-xl bg-danger/10 p-3 text-[14px] font-semibold text-danger">{err}</p>}
      {dirty && (
        <div className="pb-safe fixed inset-x-0 bottom-0 z-40 mx-auto flex max-w-[640px] gap-2 border-t border-line bg-bg/95 p-3 backdrop-blur">
          <Btn onClick={onSave} busy={busy === 'save'} className="flex-1">احفظ</Btn>
          <Btn variant="ghost" onClick={() => setS(saved)} disabled={!!busy}>تراجع</Btn>
        </div>
      )}
    </div>
  );
}
