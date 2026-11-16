import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Bike, Check, LoaderCircle, MapPin, Store, Wallet, LocateFixed } from 'lucide-react';
import { useMenu } from '../data/MenuContext';
import { useCartSummary } from '../hooks/useCartSummary';
import { useOpen } from '../hooks/useOpen';
import { useCustomer, useLastOrder, type Customer } from '../store/customer';
import { toOrderLine } from '../store/cart';
import { buildWhatsAppMessage, mapsLink, type Order } from '../lib/whatsapp';
import { nextLocalOrderNumber } from '../lib/orderNumber';
import { cleanPhone, isValidPhone } from '../lib/validate';
import { Price } from '../components/Price';
import { ScreenHeader } from '../components/ScreenHeader';
import { useTheme } from '../themes/ThemeContext';
import { back, go } from '../lib/router';

type Errors = Partial<Record<'name' | 'phone' | 'zone' | 'address', string>>;
type Geo = { state: 'idle' } | { state: 'loading' } | { state: 'ok'; url: string } | { state: 'error'; msg: string };

function Field({ label, error, children, hint, id }: { label: string; error?: string; children: ReactNode; hint?: string; id: string }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[15px] font-bold">{label}</label>
      {children}
      {error ? (
        <p role="alert" className="mt-1.5 text-[13.5px] font-semibold text-danger">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-[13px] text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

export function CheckoutScreen() {
  const t = useTheme();
  const { data } = useMenu();
  const { lines, subtotal } = useCartSummary();
  const { open } = useOpen();
  const saved = useCustomer((s) => s.c);
  const saveCustomer = useCustomer((s) => s.save);
  const setOrder = useLastOrder((s) => s.set);
  const [c, setC] = useState<Customer>(() => ({ ...saved, zoneId: saved.zoneId || data.zones[0]?.id || '' }));
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [geo, setGeo] = useState<Geo>({ state: 'idle' });
  const refs = useRef<Record<string, HTMLElement | null>>({});

  const zone = data.zones.find((z) => z.id === c.zoneId);
  const delivery = c.type === 'delivery';
  let fee = delivery ? zone?.fee ?? 0 : 0;
  if (delivery && data.settings.freeDelivery.enabled && subtotal >= data.settings.freeDelivery.threshold) fee = 0;
  const total = subtotal + fee;

  useEffect(() => {
    if (!lines.length) go(t.id, { replace: true });
  }, [lines.length, t.id]);

  const validate = (cc: Customer): Errors => {
    const e: Errors = {};
    if (cc.name.trim().length < 2) e.name = 'اكتب اسمك حتى نعرف الطلب لمن';
    if (!isValidPhone(cc.phone)) e.phone = 'رقم الموبايل لازم 11 رقم ويبدي بـ 07 (مثل 07801234567)';
    if (cc.type === 'delivery') {
      if (!cc.zoneId) e.zone = 'اختار المنطقة';
      if (cc.address.trim().length < 3) e.address = 'اكتب الحي والشارع حتى يوصلك السائق';
    }
    return e;
  };

  const update = (patch: Partial<Customer>) => {
    const next = { ...c, ...patch };
    setC(next);
    const e = validate(next);
    // نعرض الخطأ بس للحقول اللي الزبون خلص منها
    setErrors((prev) => Object.fromEntries(Object.keys({ ...prev, ...e }).filter((k) => touched[k] && e[k as keyof Errors]).map((k) => [k, e[k as keyof Errors]])));
  };
  const blur = (k: keyof Errors) => {
    setTouched((s) => ({ ...s, [k]: true }));
    const e = validate(c);
    setErrors((prev) => ({ ...prev, [k]: e[k] }));
  };

  const shareLocation = () => {
    if (!('geolocation' in navigator)) return setGeo({ state: 'error', msg: 'جهازك ما يدعم تحديد الموقع — اكتب العنوان بس' });
    setGeo({ state: 'loading' });
    navigator.geolocation.getCurrentPosition(
      (p) => setGeo({ state: 'ok', url: mapsLink(p.coords.latitude, p.coords.longitude) }),
      (err) => setGeo({ state: 'error', msg: err.code === 1 ? 'ما سمحت بالموقع — عادي، كمّل بالعنوان المكتوب' : 'ما گدرنا نحدد موقعك — كمّل بالعنوان المكتوب' }),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    );
  };

  const submit = () => {
    const e = validate(c);
    setErrors(e);
    setTouched({ name: true, phone: true, zone: true, address: true });
    const first = (['name', 'phone', 'zone', 'address'] as const).find((k) => e[k]);
    if (first) {
      const el = refs.current[first];
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (el instanceof HTMLInputElement) setTimeout(() => el.focus({ preventScroll: true }), 300);
      return;
    }
    const clean: Customer = { ...c, name: c.name.trim(), phone: cleanPhone(c.phone), address: c.address.trim(), landmark: c.landmark.trim() };
    saveCustomer(clean);
    const order: Order = {
      number: nextLocalOrderNumber(),
      lines: lines.map((l) => toOrderLine(l, data)),
      subtotal,
      deliveryFee: fee,
      total,
      type: clean.type,
      customer: { name: clean.name, phone: clean.phone },
      zone: zone?.name,
      address: [clean.address, clean.landmark].filter(Boolean).join('، '),
      mapsUrl: geo.state === 'ok' ? geo.url : undefined,
      note,
      payment: data.settings.payment,
    };
    setOrder({ number: order.number, message: buildWhatsAppMessage(order), total, type: order.type, sent: false, createdAt: Date.now() });
    go(`${t.id}/done`);
  };

  const input = `h-13 w-full px-4 text-[16px] outline-none transition placeholder:text-muted/70 focus:border-primary ${t.look.field}`;
  const err = (k: keyof Errors) => (errors[k] ? 'border-danger! ring-2 ring-danger/15' : '');

  return (
    <div className="flex min-h-full flex-col">
      <ScreenHeader title="إكمال الطلب" onBack={() => back(`${t.id}/cart`)} />
      <div className="flex-1 space-y-5 px-4 pb-6">
        {/* نوع الطلب */}
        <div role="radiogroup" aria-label="نوع الطلب" className="grid grid-cols-2 gap-2 rounded-[20px] bg-surface-2 p-1.5">
          {([['delivery', 'توصيل', Bike], ['pickup', 'استلام من المطعم', Store]] as const).map(([v, label, Icon]) => {
            const on = c.type === v;
            return (
              <button key={v} role="radio" aria-checked={on} onClick={() => update({ type: v })}
                className={`flex h-12 items-center justify-center gap-2 rounded-2xl text-[15px] font-bold transition ${on ? 'bg-surface text-fg shadow-[0_4px_14px_-6px_rgba(0,0,0,0.35)]' : 'text-muted'}`}>
                <Icon size={19} /> {label}
              </button>
            );
          })}
        </div>

        <Field id="f-name" label="الاسم" error={errors.name}>
          <input id="f-name" ref={(el) => { refs.current.name = el; }} className={`${input} ${err('name')}`} value={c.name} autoComplete="name" placeholder="اسمك الكريم"
            onChange={(e) => update({ name: e.target.value })} onBlur={() => blur('name')} aria-invalid={!!errors.name} />
        </Field>

        <Field id="f-phone" label="رقم الموبايل" error={errors.phone} hint="الكاشير يتصل بيك على هذا الرقم إذا احتاج">
          <input id="f-phone" ref={(el) => { refs.current.phone = el; }} dir="ltr" className={`${input} text-end ${err('phone')}`} value={c.phone} inputMode="tel" type="tel" autoComplete="tel" placeholder="07XX XXX XXXX" maxLength={16}
            onChange={(e) => update({ phone: e.target.value })} onBlur={() => blur('phone')} aria-invalid={!!errors.phone} />
        </Field>

        {delivery ? (
          <>
            <div ref={(el) => { refs.current.zone = el; }}>
              <p className="mb-1.5 text-[15px] font-bold">المنطقة</p>
              <div role="radiogroup" aria-label="المنطقة" className="grid grid-cols-2 gap-2">
                {data.zones.map((z) => {
                  const on = z.id === c.zoneId;
                  return (
                    <button key={z.id} role="radio" aria-checked={on} onClick={() => update({ zoneId: z.id })}
                      className={`flex min-h-14 flex-col items-center justify-center rounded-2xl border-2 px-3 py-2 transition active:scale-95 ${on ? 'border-primary bg-primary/10' : 'border-line bg-surface'}`}>
                      <span className="text-[16px] font-bold">{z.name}</span>
                      <span className="text-[13px] text-muted">التوصيل <Price value={z.fee} /></span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 flex items-center gap-1.5 text-[13.5px] font-semibold text-muted"><MapPin size={15} /> {data.settings.deliveryNote}</p>
              {errors.zone && <p role="alert" className="mt-1 text-[13.5px] font-semibold text-danger">{errors.zone}</p>}
            </div>

            <Field id="f-addr" label="العنوان (الحي والشارع)" error={errors.address}>
              <input id="f-addr" ref={(el) => { refs.current.address = el; }} className={`${input} ${err('address')}`} value={c.address} autoComplete="street-address" placeholder="مثلاً: حي الأمير، شارع 20"
                onChange={(e) => update({ address: e.target.value })} onBlur={() => blur('address')} aria-invalid={!!errors.address} />
            </Field>
            <Field id="f-land" label="أقرب نقطة دالة" hint="اختياري — يساعد السائق يوصل أسرع">
              <input id="f-land" className={input} value={c.landmark} placeholder="مثلاً: قرب جامع الحسن" onChange={(e) => update({ landmark: e.target.value })} />
            </Field>

            <div>
              <button type="button" onClick={shareLocation} disabled={geo.state === 'loading'}
                className={`flex h-13 w-full items-center justify-center gap-2 rounded-2xl border-2 text-[15.5px] font-bold transition active:scale-[0.98] ${geo.state === 'ok' ? 'border-ok bg-ok/10 text-ok' : 'border-line bg-surface text-fg'}`}>
                {geo.state === 'loading' ? <LoaderCircle size={19} className="animate-spin" /> : geo.state === 'ok' ? <Check size={19} strokeWidth={3} /> : <LocateFixed size={19} />}
                {geo.state === 'ok' ? 'تمت مشاركة موقعك ✓' : geo.state === 'loading' ? 'جاري تحديد موقعك…' : 'شارك موقعي'}
              </button>
              <p className={`mt-1.5 text-[13px] ${geo.state === 'error' ? 'font-semibold text-danger' : 'text-muted'}`}>
                {geo.state === 'error' ? geo.msg : 'اختياري — يوصل رابط موقعك على خرائط Google ويا الطلب'}
              </p>
            </div>
          </>
        ) : (
          <div className={`flex items-start gap-3 p-4 ${t.look.card}`}>
            <Store size={22} className="mt-0.5 shrink-0 text-primary" />
            <div>
              <p className="text-[15px] font-bold">تستلم طلبك من المطعم</p>
              <p className="text-[14px] text-muted">{data.settings.address}</p>
            </div>
          </div>
        )}

        <Field id="f-note" label="ملاحظة الطلب" hint="اختياري">
          <textarea id="f-note" rows={2} value={note} onChange={(e) => setNote(e.target.value.slice(0, 200))} placeholder="أي شي تحب تگوله للمطعم…"
            className={`w-full resize-none px-4 py-3 text-[16px] outline-none placeholder:text-muted/70 focus:border-primary ${t.look.field}`} />
        </Field>

        <div className={`flex items-center gap-3 p-4 ${t.look.card}`}>
          <Wallet size={22} className="shrink-0 text-ok" />
          <div className="flex-1">
            <p className="text-[15px] font-bold">الدفع: {data.settings.payment}</p>
            <p className="text-[13px] text-muted">تدفع للسائق أو بالمطعم</p>
          </div>
        </div>

        <div className={`space-y-2 p-4 text-[15px] ${t.look.card}`}>
          <div className="flex justify-between"><span className="text-muted">المجموع</span><Price value={subtotal} className="font-semibold" /></div>
          {delivery && <div className="flex justify-between"><span className="text-muted">التوصيل {zone ? `— ${zone.name}` : ''}</span>{fee ? <Price value={fee} className="font-semibold" /> : <span className="font-semibold text-ok">مجاني</span>}</div>}
          <div className="flex justify-between border-t border-dashed border-line pt-2 text-[17px]"><span className="font-bold">الإجمالي</span><Price value={total} className="font-extrabold" /></div>
        </div>
      </div>

      <div className="pb-safe sticky bottom-0 z-10 bg-gradient-to-t from-bg via-bg to-bg/0 px-4 pt-4">
        {!open && <p className="mb-2 text-center text-[14px] font-semibold text-danger">{data.settings.closedMessage}</p>}
        <button disabled={!open} onClick={submit} className={`flex h-14 w-full items-center justify-between px-5 text-[17px] font-bold transition active:scale-[0.98] disabled:opacity-45 ${t.look.cta}`}>
          <span>راجع وأكّد الطلب</span>
          <Price value={total} />
        </button>
      </div>
    </div>
  );
}
