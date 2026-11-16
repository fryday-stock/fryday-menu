import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import { Bike, Check, MapPin, Store, Wallet, PencilLine, CircleAlert, LoaderCircle } from 'lucide-react';
import { useMenu } from '../data/MenuContext';
import { useCartSummary } from '../hooks/useCartSummary';
import { useOpen } from '../hooks/useOpen';
import { useCustomer, useLastOrder, type Customer } from '../store/customer';
import { toOrderLine } from '../store/cart';
import { buildWhatsAppMessage, type Order } from '../lib/whatsapp';
import { mapsUrl, quoteDelivery, zoneAt, type LatLng, type DeliveryQuote } from '../lib/delivery';
import { nextLocalOrderNumber } from '../lib/orderNumber';
import { cleanPhone, isValidPhone } from '../lib/validate';
import { fmt } from '../lib/format';
import { Price } from '../components/Price';
import { ScreenHeader } from '../components/ScreenHeader';
import { useTheme } from '../themes/ThemeContext';
import { back, go } from '../lib/router';

const MapPicker = lazy(() => import('../components/MapPicker'));

type ErrKey = 'name' | 'phone' | 'location' | 'address';
type Errors = Partial<Record<ErrKey, string>>;
type Gps = 'idle' | 'locating' | 'ok' | 'denied' | 'unavailable';

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

function quoteText(q: DeliveryQuote, cashierMsg: string): string {
  if (q.kind === 'fee') return q.fee ? `التوصيل ${fmt(q.fee)} د.ع` : 'التوصيل مجاني';
  if (q.kind === 'cashier') return cashierMsg;
  return '';
}

export function CheckoutScreen() {
  const t = useTheme();
  const { data } = useMenu();
  const s = data.settings;
  const { lines, subtotal } = useCartSummary();
  const { open } = useOpen();
  const saved = useCustomer((x) => x.c);
  const saveCustomer = useCustomer((x) => x.save);
  const setOrder = useLastOrder((x) => x.set);

  const canDeliver = s.delivery.enabled;
  const canPickup = s.pickup.enabled;
  const [c, setC] = useState<Customer>(() => ({
    ...saved,
    type: !canDeliver ? 'pickup' : !canPickup ? 'delivery' : saved.type,
  }));
  // الدبوس المؤكد: نرجّع آخر دبوس محفوظ إذا بعده داخل منطقة توصيل
  const [pin, setPin] = useState<LatLng | null>(() => (saved.pin && zoneAt(saved.pin, data.zones) ? saved.pin : null));
  const [mapOpen, setMapOpen] = useState(false);
  const [center, setCenter] = useState<LatLng>(() => saved.pin ?? s.location);
  const [gpsTarget, setGpsTarget] = useState<LatLng | null>(null);
  const [gps, setGps] = useState<Gps>('idle');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const refs = useRef<Record<string, HTMLElement | null>>({});

  const delivery = c.type === 'delivery';
  const quote = quoteDelivery(s, data.zones, pin, subtotal);
  const live = quoteDelivery(s, data.zones, center, subtotal); // حالة نص الخريطة قبل التأكيد
  const fee = delivery && quote.kind === 'fee' ? quote.fee : 0;
  const cashierFee = delivery && quote.kind === 'cashier';
  const total = subtotal + (delivery ? fee : 0);

  useEffect(() => {
    if (!lines.length) go('', { replace: true });
  }, [lines.length]);

  const validate = (cc: Customer): Errors => {
    const e: Errors = {};
    if (cc.name.trim().length < 2) e.name = 'اكتب اسمك حتى نعرف الطلب لمن';
    if (!isValidPhone(cc.phone)) e.phone = 'رقم الموبايل لازم 11 رقم ويبدي بـ 07 (مثل 07801234567)';
    if (cc.type === 'delivery') {
      if (quote.kind === 'need-pin') e.location = 'حدد موقعك على الخريطة حتى نكمل الطلب';
      if (quote.kind === 'out') e.location = s.messages.outOfZone;
      if (cc.address.trim().length < 3) e.address = 'اكتب الحي والشارع حتى يوصلك السائق';
    }
    return e;
  };

  const update = (patch: Partial<Customer>) => {
    const next = { ...c, ...patch };
    setC(next);
    const e = validate(next);
    setErrors((prev) => Object.fromEntries(Object.keys({ ...prev, ...e }).filter((k) => touched[k] && e[k as ErrKey]).map((k) => [k, e[k as ErrKey]])));
  };
  const blur = (k: ErrKey) => {
    setTouched((x) => ({ ...x, [k]: true }));
    setErrors((prev) => ({ ...prev, [k]: validate(c)[k] }));
  };

  const locate = () => {
    if (!('geolocation' in navigator)) { setGps('unavailable'); return; }
    setGps('locating');
    navigator.geolocation.getCurrentPosition(
      (p) => { setGps('ok'); setGpsTarget({ lat: p.coords.latitude, lng: p.coords.longitude }); },
      (err) => setGps(err.code === 1 ? 'denied' : 'unavailable'),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 },
    );
  };
  const openMap = () => {
    setMapOpen(true);
    setPin(null);
    locate();
  };
  const confirmPin = () => {
    if (live.kind === 'out') return;
    setPin(center);
    setMapOpen(false);
    setErrors((e) => ({ ...e, location: undefined }));
  };

  const submit = () => {
    const e = validate(c);
    setErrors(e);
    setTouched({ name: true, phone: true, location: true, address: true });
    const first = (['name', 'phone', 'location', 'address'] as const).find((k) => e[k]);
    if (first) {
      const el = refs.current[first];
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (el instanceof HTMLInputElement) setTimeout(() => el.focus({ preventScroll: true }), 300);
      return;
    }
    const zone = quote.kind === 'fee' || quote.kind === 'cashier' ? quote.zone : null;
    const clean: Customer = { ...c, name: c.name.trim(), phone: cleanPhone(c.phone), address: c.address.trim(), landmark: c.landmark.trim(), zoneId: zone?.id ?? '', pin: pin ?? saved.pin ?? null };
    saveCustomer(clean);
    const order: Order = {
      number: nextLocalOrderNumber(),
      lines: lines.map((l) => toOrderLine(l, data)),
      subtotal,
      deliveryFee: delivery ? (cashierFee ? null : fee) : 0,
      total,
      type: clean.type,
      customer: { name: clean.name, phone: clean.phone },
      zone: zone?.name,
      address: [clean.address, clean.landmark].filter(Boolean).join('، '),
      mapsUrl: delivery && pin ? mapsUrl(pin) : undefined,
      note,
      payment: s.payment,
    };
    setOrder({ number: order.number, message: buildWhatsAppMessage(order), total, type: order.type, sent: false, createdAt: Date.now() });
    go('done');
  };

  const input = `h-13 w-full px-4 text-[16px] outline-none transition placeholder:text-muted/70 focus:border-primary ${t.look.field}`;
  const err = (k: ErrKey) => (errors[k] ? 'border-danger! ring-2 ring-danger/15' : '');

  if (!canDeliver && !canPickup) {
    return (
      <div className="flex min-h-full flex-col">
        <ScreenHeader title="إكمال الطلب" onBack={() => back('cart')} />
        <p className="p-8 text-center text-[16px] text-muted">الطلب أونلاين متوقف هسه. تگدر تتصل بينا: <bdi className="num">{s.callPhone}</bdi></p>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col">
      <ScreenHeader title="إكمال الطلب" onBack={() => back('cart')} />
      <div className="flex-1 space-y-5 px-4 pb-6">
        {/* نوع الطلب */}
        {canDeliver && canPickup && (
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
        )}

        {/* موقع التوصيل */}
        {delivery && (
          <section ref={(el) => { refs.current.location = el; }} aria-labelledby="loc-h">
            <div className="mb-1.5 flex items-center justify-between">
              <h2 id="loc-h" className="text-[15px] font-bold">موقع التوصيل</h2>
              {s.delivery.locationRequired && <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-[12px] font-bold text-muted">إجباري</span>}
            </div>

            {pin && !mapOpen ? (
              <div className={`flex items-center gap-3 rounded-[20px] border-2 p-3.5 ${quote.kind === 'out' ? 'border-danger/40 bg-danger/5' : 'border-ok/35 bg-ok/8'}`}>
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-ok text-white"><MapPin size={20} /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-[15.5px] font-extrabold">تم تحديد موقعك{quote.kind !== 'need-pin' && quote.kind !== 'out' && quote.zone ? ` — ${quote.zone.name}` : ''}</p>
                  <p className="text-[14px] font-semibold text-fg/75">{quoteText(quote, s.messages.cashierFee)}</p>
                </div>
                <button type="button" onClick={() => { setCenter(pin); setMapOpen(true); setPin(null); }} className="flex h-11 shrink-0 items-center gap-1 rounded-full border border-line bg-surface px-3.5 text-[14px] font-bold">
                  <PencilLine size={15} /> تعديل
                </button>
              </div>
            ) : mapOpen ? (
              <div>
                <Suspense fallback={<div className="grid h-[300px] place-items-center rounded-[20px] border border-line bg-surface-2"><LoaderCircle className="animate-spin text-muted" /></div>}>
                  <MapPicker start={center} target={gpsTarget} zones={data.zones} restaurant={s.location} onMove={setCenter} onLocate={locate} locating={gps === 'locating'} />
                </Suspense>
                <p className="mt-2 text-[13.5px] leading-6 text-muted" role="status">
                  {gps === 'locating' && 'جاري تحديد موقعك…'}
                  {(gps === 'denied' || gps === 'unavailable') && 'ما گدرنا نحدد موقعك تلقائياً — حرّك الخريطة بإصبعك وخلي الدبوس على بيتك.'}
                  {(gps === 'ok' || gps === 'idle') && 'حرّك الخريطة حتى يصير الدبوس بالضبط على بيتك.'}
                </p>
                <div className={`mt-2 flex items-center gap-2 rounded-2xl px-3.5 py-2.5 text-[14.5px] font-bold ${live.kind === 'out' ? 'bg-danger/10 text-danger' : 'bg-ok/10 text-ok'}`}>
                  {live.kind === 'out' ? <CircleAlert size={18} /> : <MapPin size={18} />}
                  {live.kind === 'out' ? s.messages.outOfZone : `${live.kind !== 'need-pin' && live.zone ? live.zone.name + ' — ' : ''}${quoteText(live, s.messages.cashierFee)}`}
                </div>
                <button type="button" onClick={confirmPin} disabled={live.kind === 'out'}
                  className={`mt-3 flex h-13 w-full items-center justify-center gap-2 text-[16px] font-bold transition active:scale-[0.98] disabled:opacity-40 ${t.look.cta}`}>
                  <Check size={19} strokeWidth={3} /> أكّد الموقع هنا
                </button>
              </div>
            ) : (
              <div>
                <button type="button" onClick={openMap}
                  className={`flex h-14 w-full items-center justify-center gap-2 rounded-[18px] border-2 border-dashed text-[16px] font-extrabold transition active:scale-[0.98] ${errors.location ? 'border-danger text-danger' : 'border-fg/25 bg-surface text-fg'}`}>
                  <MapPin size={20} /> حدد موقعي على الخريطة
                </button>
                <p className="mt-1.5 text-[13px] text-muted">نحتاج موقعك حتى نحسب أجرة التوصيل ويوصلك السائق بالضبط. {s.deliveryNote}.</p>
              </div>
            )}
            {errors.location && <p role="alert" className="mt-1.5 text-[13.5px] font-semibold text-danger">{errors.location}</p>}
          </section>
        )}

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
            <Field id="f-addr" label="العنوان (الحي والشارع)" error={errors.address}>
              <input id="f-addr" ref={(el) => { refs.current.address = el; }} className={`${input} ${err('address')}`} value={c.address} autoComplete="street-address" placeholder="مثلاً: حي الأمير، شارع 20"
                onChange={(e) => update({ address: e.target.value })} onBlur={() => blur('address')} aria-invalid={!!errors.address} />
            </Field>
            <Field id="f-land" label="أقرب نقطة دالة" hint="اختياري — يساعد السائق يوصل أسرع">
              <input id="f-land" className={input} value={c.landmark} placeholder="مثلاً: قرب جامع الحسن" onChange={(e) => update({ landmark: e.target.value })} />
            </Field>
          </>
        ) : (
          <div className={`flex items-start gap-3 p-4 ${t.look.card}`}>
            <Store size={22} className="mt-0.5 shrink-0 text-accent" />
            <div className="flex-1">
              <p className="text-[15px] font-bold">تستلم طلبك من المطعم</p>
              <p className="text-[14px] text-muted">{s.address}</p>
              <a href={mapsUrl(s.location)} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex h-10 items-center gap-1.5 text-[14px] font-bold underline underline-offset-4">
                <MapPin size={15} /> موقعنا على الخريطة
              </a>
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
            <p className="text-[15px] font-bold">الدفع: {s.payment}</p>
            <p className="text-[13px] text-muted">{delivery ? 'تدفع للسائق' : 'تدفع بالمطعم'}</p>
          </div>
        </div>

        <div className={`space-y-2 p-4 text-[15px] ${t.look.card}`}>
          <div className="flex justify-between"><span className="text-muted">المجموع</span><Price value={subtotal} className="font-semibold" /></div>
          {delivery && (
            <div className="flex justify-between gap-3">
              <span className="text-muted">التوصيل{quote.kind === 'fee' && quote.zone ? ` — ${quote.zone.name}` : ''}</span>
              {quote.kind === 'fee' ? (quote.fee ? <Price value={quote.fee} className="font-semibold" /> : <span className="font-semibold text-ok">مجاني</span>)
                : quote.kind === 'cashier' ? <span className="text-end text-[14px] font-semibold text-muted">{s.messages.cashierFee}</span>
                : <span className="text-[14px] font-semibold text-muted">بعد تحديد الموقع</span>}
            </div>
          )}
          <div className="flex justify-between border-t border-dashed border-line pt-2 text-[17px]">
            <span className="font-bold">الإجمالي{delivery && quote.kind !== 'fee' ? ' (بدون التوصيل)' : ''}</span>
            <Price value={total} className="font-extrabold" />
          </div>
        </div>
      </div>

      <div className="pb-safe sticky bottom-0 z-10 bg-gradient-to-t from-bg via-bg to-bg/0 px-4 pt-4">
        {!open && <p className="mb-2 text-center text-[14px] font-semibold text-danger">{s.closedMessage}</p>}
        <button disabled={!open || (delivery && mapOpen)} onClick={submit} className={`flex h-14 w-full items-center justify-between px-5 text-[17px] font-bold transition active:scale-[0.98] disabled:opacity-45 ${t.look.cta}`}>
          <span>{delivery && mapOpen ? 'أكّد موقعك أول' : 'راجع وأكّد الطلب'}</span>
          <Price value={total} />
        </button>
      </div>
    </div>
  );
}
