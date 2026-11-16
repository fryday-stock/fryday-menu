import { useState } from 'react';
import type { FeeMode, Settings } from '../../data/types';
import { useAdmin, AdminError } from '../api';
import { Btn, Card, Field, Input, NumInput, Segmented, TextArea, Toggle } from '../ui';
import { ImagePicker } from './ItemEditor';
import { useToast } from '../../components/Toast';

export function SettingsPage() {
  const saved = useAdmin((x) => x.menu!.settings);
  const presets = useAdmin((x) => x.presets);
  const save = useAdmin((x) => x.saveSettings);
  const toast = useToast((x) => x.show);
  const [s, setS] = useState<Settings>(saved);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const dirty = JSON.stringify(s) !== JSON.stringify(saved);

  /** تعديل حقل متداخل: up('delivery', { feeMode: 'map' }) */
  const up = <K extends keyof Settings>(k: K, v: Settings[K] extends object ? Partial<Settings[K]> : Settings[K]) =>
    setS((x) => ({ ...x, [k]: typeof v === 'object' && v !== null && !Array.isArray(v) ? { ...(x[k] as object), ...(v as object) } : v }));

  const onSave = async () => {
    setBusy(true);
    setErr(null);
    try { setS(await save(s)); toast('انحفظت الإعدادات'); } catch (e) { setErr((e as AdminError).message); } finally { setBusy(false); }
  };
  const providerKey = Object.entries(presets).find(([, p]) => p.tileUrl === s.map.tileUrl)?.[0] ?? 'custom';

  return (
    <div className="space-y-3 pb-24">
      <h1 className="text-[22px] font-extrabold">الإعدادات</h1>

      <Card title="الطلبات">
        <Toggle tone="danger" checked={s.paused.enabled} onChange={(enabled) => up('paused', { enabled })} label="إيقاف الطلبات مؤقتاً" hint="المنيو يبقى مفتوح بس زر الطلب يتسكر" />
        <Field label="رسالة الإيقاف" className="mt-2"><TextArea value={s.paused.message} onChange={(e) => up('paused', { message: e.target.value })} /></Field>
        <hr className="my-4 border-line" />
        <Toggle tone="warn" checked={s.busy.enabled} onChange={(enabled) => up('busy', { enabled })} label="ضغط عالي" hint="يغير وقت الوصول المتوقع ويطلع تنبيه للزبون" />
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Field label="التوصيل (دقيقة)"><NumInput value={s.busy.deliveryMinutes} onChange={(n) => up('busy', { deliveryMinutes: n ?? 0 })} /></Field>
          <Field label="الاستلام (دقيقة)"><NumInput value={s.busy.pickupMinutes} onChange={(n) => up('busy', { pickupMinutes: n ?? 0 })} /></Field>
        </div>
        <Field label="رسالة الضغط العالي" className="mt-2"><TextArea value={s.busy.message} onChange={(e) => up('busy', { message: e.target.value })} /></Field>
      </Card>

      <Card title="التواصل">
        <div className="space-y-3">
          <Field label="رقم الواتساب لاستلام الطلبات" hint="دولي بدون + أو صفر (مثل 9647715796059)"><Input dir="ltr" inputMode="numeric" value={s.whatsapp} onChange={(e) => up('whatsapp', e.target.value.replace(/\D/g, ''))} className="text-end" /></Field>
          <Field label="أرقام الاتصال" hint="افصل بينها بفارزة"><Input dir="ltr" value={s.phones.join(', ')} onChange={(e) => up('phones', e.target.value.split(/[,،]/).map((x) => x.trim()).filter(Boolean))} className="text-end" /></Field>
          <Field label="رقم زر الاتصال (كيك المناسبات)"><Input dir="ltr" inputMode="tel" value={s.callPhone} onChange={(e) => up('callPhone', e.target.value)} className="text-end" /></Field>
          <Field label="العنوان"><Input value={s.address} onChange={(e) => up('address', e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="موقع المطعم (lat)"><Input dir="ltr" inputMode="decimal" value={s.location.lat} onChange={(e) => up('location', { lat: Number(e.target.value) || 0 })} className="text-end" /></Field>
            <Field label="(lng)"><Input dir="ltr" inputMode="decimal" value={s.location.lng} onChange={(e) => up('location', { lng: Number(e.target.value) || 0 })} className="text-end" /></Field>
          </div>
        </div>
      </Card>

      <Card title="الدوام (توقيت بغداد)">
        <div className="grid grid-cols-2 gap-2">
          <Field label="يفتح"><Input type="time" value={s.hours.open} onChange={(e) => up('hours', { open: e.target.value })} /></Field>
          <Field label="يسكّر" hint="00:00 = نص الليل"><Input type="time" value={s.hours.close === '24:00' ? '00:00' : s.hours.close} onChange={(e) => up('hours', { close: e.target.value === '00:00' ? '24:00' : e.target.value })} /></Field>
        </div>
        <Field label="رسالة برا الدوام" className="mt-2"><Input value={s.closedMessage} onChange={(e) => up('closedMessage', e.target.value)} /></Field>
      </Card>

      <Card title="التوصيل">
        <Toggle checked={s.delivery.enabled} onChange={(enabled) => up('delivery', { enabled })} label="التوصيل مفعّل" />
        <p className="mt-3 mb-1.5 text-[14px] font-bold">طريقة أجرة التوصيل</p>
        <Segmented<FeeMode> value={s.delivery.feeMode} onChange={(feeMode) => up('delivery', { feeMode })} options={[['map', 'تلقائية من الخريطة'], ['fixed', 'مبلغ ثابت'], ['cashier', 'يحددها الكاشير']]} />
        <p className="mt-1.5 text-[12.5px] leading-5 text-muted">
          {s.delivery.feeMode === 'map' && 'الأجرة حسب المنطقة اللي بيها دبوس الزبون (تتعدل من "المناطق").'}
          {s.delivery.feeMode === 'fixed' && 'نفس الأجرة لكل الطلبات داخل مناطق التوصيل.'}
          {s.delivery.feeMode === 'cashier' && 'الزبون يشوف "أجرة التوصيل يأكدها الكاشير" والإجمالي بدون توصيل.'}
        </p>
        {s.delivery.feeMode === 'fixed' && <Field label="الأجرة الثابتة (د.ع)" className="mt-2"><NumInput value={s.delivery.fixedFee} onChange={(n) => up('delivery', { fixedFee: n ?? 0 })} /></Field>}
        <div className="mt-3"><Toggle checked={s.delivery.locationRequired} onChange={(locationRequired) => up('delivery', { locationRequired })} label="تحديد الموقع على الخريطة إجباري" hint="إذا انطفى: الزبون يگدر يكمل بالعنوان المكتوب بس" /></div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Field label="وقت التوصيل (دقيقة)"><NumInput value={s.etaMinutes} onChange={(n) => up('etaMinutes', n ?? 0)} /></Field>
        </div>
        <div className="mt-3 space-y-3">
          <Toggle checked={s.minOrder.enabled} onChange={(enabled) => up('minOrder', { enabled })} label="حد أدنى للطلب" />
          {s.minOrder.enabled && <Field label="أقل مبلغ (د.ع)"><NumInput value={s.minOrder.amount} onChange={(n) => up('minOrder', { amount: n ?? 0 })} /></Field>}
          <Toggle checked={s.freeDelivery.enabled} onChange={(enabled) => up('freeDelivery', { enabled })} label="توصيل مجاني فوق مبلغ معين" />
          {s.freeDelivery.enabled && <Field label="من مبلغ (د.ع)"><NumInput value={s.freeDelivery.threshold} onChange={(n) => up('freeDelivery', { threshold: n ?? 0 })} /></Field>}
          <Field label="ملاحظة مناطق التوصيل"><Input value={s.deliveryNote} onChange={(e) => up('deliveryNote', e.target.value)} /></Field>
          <Field label="رسالة خارج منطقة التوصيل"><Input value={s.messages.outOfZone} onChange={(e) => up('messages', { outOfZone: e.target.value })} /></Field>
          <Field label="رسالة الأجرة يحددها الكاشير"><Input value={s.messages.cashierFee} onChange={(e) => up('messages', { cashierFee: e.target.value })} /></Field>
        </div>
      </Card>

      <Card title="الاستلام من المطعم">
        <Toggle checked={s.pickup.enabled} onChange={(enabled) => up('pickup', { enabled })} label="الاستلام مفعّل" />
        <Field label="وقت التجهيز (دقيقة)" className="mt-2"><NumInput value={s.pickupMinutes} onChange={(n) => up('pickupMinutes', n ?? 0)} /></Field>
      </Card>

      <Card title="صورة الرأس">
        <ImagePicker value={s.hero.image} onChange={(image) => up('hero', { image: image ?? 'burger-mushroom.webp' })} />
        <p className="mt-2 text-[12.5px] text-muted">إذا الصورة لصنف من المنيو، يطلع اسمه وسعره وزر "اطلبه" بالرأس.</p>
      </Card>

      <Card title="مزود الخرائط">
        <Segmented value={providerKey} onChange={(k) => k !== 'custom' && presets[k] && up('map', presets[k])} options={[['osm', 'OpenStreetMap'], ['carto', 'CARTO'], ['custom', 'مخصص']]} />
        <div className="mt-3 space-y-3">
          <Field label="رابط البلاطات" hint="لازم يحتوي {z} {x} {y}"><Input dir="ltr" value={s.map.tileUrl} onChange={(e) => up('map', { tileUrl: e.target.value, provider: 'custom' })} className="text-[13px]" /></Field>
          <Field label="حقوق الخريطة (attribution)"><Input dir="ltr" value={s.map.attribution} onChange={(e) => up('map', { attribution: e.target.value })} className="text-[13px]" /></Field>
          <Field label="أقصى تقريب"><NumInput value={s.map.maxZoom} onChange={(n) => up('map', { maxZoom: n ?? 19 })} /></Field>
        </div>
      </Card>

      <Card title="الدفع">
        <Field label="طريقة الدفع (تطلع بالرسالة)"><Input value={s.payment} onChange={(e) => up('payment', e.target.value)} /></Field>
      </Card>

      {err && <p role="alert" className="rounded-xl bg-danger/10 p-3 text-[14px] font-semibold text-danger">{err}</p>}
      {dirty && (
        <div className="pb-safe fixed inset-x-0 bottom-0 z-40 mx-auto flex max-w-[640px] gap-2 border-t border-line bg-bg/95 p-3 backdrop-blur">
          <Btn onClick={onSave} busy={busy} className="flex-1">احفظ الإعدادات</Btn>
          <Btn variant="ghost" onClick={() => setS(saved)} disabled={busy}>تراجع</Btn>
        </div>
      )}
    </div>
  );
}
