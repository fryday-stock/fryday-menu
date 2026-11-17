import { useState } from 'react';
import { ArrowRight, Moon, CalendarDays, Sparkles } from 'lucide-react';
import type { Season, Settings } from '../../data/types';
import { useAdmin, AdminError } from '../api';
import { Badge, Btn, Card, Field, Input, TextArea, Toggle } from '../ui';
import { go } from '../../lib/router';
import { useToast } from '../../components/Toast';
import { activeSeason } from '../../data/defaults';

/** قوالب جاهزة — كلها تتعدل */
const PRESETS: Record<Season['kind'], Omit<Season, 'enabled' | 'until' | 'kind'> & { label: string; Icon: typeof Moon }> = {
  ramadan: { label: 'رمضان', Icon: Moon, name: 'رمضان كريم', message: 'رمضان كريم 🌙 الطلبات من الفطور للسحور', hours: { enabled: true, open: '17:00', close: '03:00' } },
  ziyara: { label: 'زيارة', Icon: CalendarDays, name: 'أيام الزيارة', message: 'تقبل الله زيارتكم — الطلبات شغالة طول اليوم', hours: { enabled: true, open: '10:00', close: '02:00' } },
  event: { label: 'مناسبة', Icon: Sparkles, name: 'مناسبة خاصة', message: 'عدنا مناسبة خاصة — اطلب هسه', hours: { enabled: false, open: '12:00', close: '24:00' } },
};

export function SeasonPage() {
  const saved = useAdmin((x) => x.menu!.settings);
  const save = useAdmin((x) => x.saveSettings);
  const toast = useToast((x) => x.show);
  const [s, setS] = useState<Settings>(saved);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const se = s.season;
  const set = (p: Partial<Season>) => setS((x) => ({ ...x, season: { ...x.season, ...p } }));
  const dirty = JSON.stringify(s) !== JSON.stringify(saved);
  const live = activeSeason(saved);

  const onSave = async (next = s) => {
    setBusy(true);
    setErr(null);
    try { setS(await save(next)); toast(next.season.enabled ? 'الموسم شغال' : 'رجع الطبيعي'); } catch (e) { setErr((e as AdminError).message); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-3 pb-24">
      <div className="flex items-center gap-2">
        <button onClick={() => go('more')} aria-label="رجوع" className="grid size-11 place-items-center rounded-full border border-line bg-surface"><ArrowRight size={19} /></button>
        <h1 className="flex-1 text-[20px] font-extrabold">وضع المواسم</h1>
        {live ? <Badge tone="ok">شغال: {live.name}</Badge> : <Badge>طبيعي</Badge>}
      </div>

      <Card title="نوع الموسم">
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(PRESETS) as Season['kind'][]).map((k) => {
            const P = PRESETS[k];
            return (
              <button key={k} onClick={() => set({ kind: k, name: P.name, message: P.message, hours: P.hours })}
                className={`flex h-20 flex-col items-center justify-center gap-1 rounded-2xl border-2 text-[14px] font-bold ${se.kind === k ? 'border-primary bg-primary/12' : 'border-line bg-surface'}`}>
                <P.Icon size={22} /> {P.label}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-[12.5px] text-muted">اختيار النوع يعبي القيم الجاهزة — عدّلها مثل ما تحب.</p>
      </Card>

      <Card className="space-y-3">
        <Field label="اسم الموسم"><Input value={se.name} onChange={(e) => set({ name: e.target.value })} /></Field>
        <Field label="الرسالة اللي تطلع فوك المنيو"><TextArea value={se.message} onChange={(e) => set({ message: e.target.value })} /></Field>
        <Toggle checked={se.hours.enabled} onChange={(enabled) => set({ hours: { ...se.hours, enabled } })} label="أوقات طلب خاصة" hint="بدل الدوام العادي طول الموسم" />
        {se.hours.enabled && (
          <div className="grid grid-cols-2 gap-2">
            <Field label="يفتح"><Input type="time" value={se.hours.open} onChange={(e) => set({ hours: { ...se.hours, open: e.target.value } })} /></Field>
            <Field label="يسكّر"><Input type="time" value={se.hours.close === '24:00' ? '00:00' : se.hours.close} onChange={(e) => set({ hours: { ...se.hours, close: e.target.value === '00:00' ? '24:00' : e.target.value } })} /></Field>
          </div>
        )}
        <Field label="ينتهي بتاريخ (اختياري)" hint="بعد هذا اليوم يرجع الطبيعي تلقائياً">
          <Input type="date" value={se.until ?? ''} onChange={(e) => set({ until: e.target.value || null })} />
        </Field>
        <p className="text-[13px] text-muted">البانر الخاص بالموسم: من <button className="font-bold underline" onClick={() => go('banner')}>البانر الذكي</button> ← "شريحة موسم".</p>
      </Card>

      {err && <p role="alert" className="rounded-xl bg-danger/10 p-3 text-[14px] font-semibold text-danger">{err}</p>}
      <div className="pb-safe fixed inset-x-0 bottom-0 z-40 mx-auto flex max-w-[640px] gap-2 border-t border-line bg-bg/95 p-3 backdrop-blur">
        {se.enabled && !dirty ? (
          <Btn variant="danger" busy={busy} className="flex-1" onClick={() => onSave({ ...s, season: { ...se, enabled: false } })}>رجّع الطبيعي</Btn>
        ) : (
          <Btn busy={busy} className="flex-1" onClick={() => onSave({ ...s, season: { ...se, enabled: true } })}>{se.enabled ? 'احفظ التعديلات' : 'شغّل الموسم'}</Btn>
        )}
        {dirty && <Btn variant="ghost" onClick={() => setS(saved)} disabled={busy}>تراجع</Btn>}
      </div>
    </div>
  );
}
