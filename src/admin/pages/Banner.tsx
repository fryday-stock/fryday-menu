import { useState } from 'react';
import { ArrowRight, ExternalLink, Plus, Trash } from 'lucide-react';
import type { BannerSlide, BannerSlot, Settings } from '../../data/types';
import { useAdmin, AdminError } from '../api';
import { Badge, Btn, Card, Field, Input, NumInput, Segmented, Toggle } from '../ui';
import { ItemPicker, MediaUpload } from '../pickers';
import { go } from '../../lib/router';
import { useToast } from '../../components/Toast';

export const SLOT_NAMES: Record<BannerSlot, string> = {
  lunch: 'الغدا', afternoon: 'العصرية', evening: 'السهرة', hot: 'الجو حار', cold: 'الجو بارد', season: 'الموسم', any: 'كل الأوقات',
};

function SlideEditor({ slide, onChange, onDelete }: { slide: BannerSlide; onChange: (s: BannerSlide) => void; onDelete: () => void }) {
  const menu = useAdmin((x) => x.menu)!;
  const sections = menu.tabs.flatMap((t) => t.sections.map((s) => s.name));
  const set = (p: Partial<BannerSlide>) => onChange({ ...slide, ...p });
  return (
    <div className="space-y-3 rounded-2xl border border-line bg-surface p-3">
      <div className="flex items-center justify-between gap-2">
        <Badge tone={slide.enabled ? 'ok' : 'muted'}>{slide.enabled ? 'شغالة' : 'مطفية'}</Badge>
        <div className="flex items-center gap-1">
          <Btn size="sm" variant="ghost" onClick={() => set({ enabled: !slide.enabled })}>{slide.enabled ? 'اطفيها' : 'شغّلها'}</Btn>
          <button aria-label="حذف الشريحة" onClick={() => confirm('تحذف هذي الشريحة؟') && onDelete()} className="grid size-10 place-items-center rounded-xl text-danger"><Trash size={17} /></button>
        </div>
      </div>
      <MediaUpload value={slide.media.src ? slide.media : null} onChange={(media) => set({ media })} />
      <Field label="الوقت / الحالة">
        <select value={slide.slot} onChange={(e) => set({ slot: e.target.value as BannerSlot })} className="h-12 w-full rounded-xl border border-line bg-surface px-3 text-[16px]">
          {(Object.keys(SLOT_NAMES) as BannerSlot[]).map((k) => <option key={k} value={k}>{SLOT_NAMES[k]}</option>)}
        </select>
      </Field>
      <Field label="العنوان (قصير)" hint="مثلاً: غداك جاهز 🔥"><Input value={slide.title} maxLength={60} onChange={(e) => set({ title: e.target.value })} /></Field>
      <Field label="سطر تحت العنوان" hint="اختياري"><Input value={slide.subtitle ?? ''} maxLength={80} onChange={(e) => set({ subtitle: e.target.value || undefined })} /></Field>
      <p className="text-[14px] font-bold">الزر</p>
      <Segmented value={slide.cta.type} onChange={(type) => set({ cta: { ...slide.cta, type, target: '' } })} options={[['item', 'يفتح صنف'], ['section', 'يفتح قسم'], ['none', 'بدون زر']]} />
      {slide.cta.type === 'item' && <ItemPicker multi={false} label="اختار الصنف" value={slide.cta.target ? [slide.cta.target] : []} onChange={(ids) => set({ cta: { ...slide.cta, target: ids[0] ?? '' } })} />}
      {slide.cta.type === 'section' && (
        <select value={slide.cta.target} onChange={(e) => set({ cta: { ...slide.cta, target: e.target.value } })} className="h-12 w-full rounded-xl border border-line bg-surface px-3 text-[16px]">
          <option value="">اختار القسم…</option>
          {sections.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      )}
      {slide.cta.type !== 'none' && <Field label="كلمة الزر"><Input value={slide.cta.label} maxLength={20} placeholder="اطلبه" onChange={(e) => set({ cta: { ...slide.cta, label: e.target.value } })} /></Field>}
    </div>
  );
}

export function BannerPage() {
  const saved = useAdmin((x) => x.menu!.settings);
  const save = useAdmin((x) => x.saveSettings);
  const toast = useToast((x) => x.show);
  const [s, setS] = useState<Settings>(saved);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const b = s.banner;
  const setB = (p: Partial<Settings['banner']>) => setS((x) => ({ ...x, banner: { ...x.banner, ...p } }));
  const dirty = JSON.stringify(s) !== JSON.stringify(saved);

  const onSave = async () => {
    setBusy(true);
    setErr(null);
    try {
      if (b.slides.some((x) => !x.media.src)) throw new Error('أكو شريحة بدون صورة أو فيديو — ارفع ملف أو احذفها');
      setS(await save(s));
      toast('انحفظ البانر');
    } catch (e) { setErr((e as AdminError).message ?? (e as Error).message); } finally { setBusy(false); }
  };
  const addSlide = (slot: BannerSlot) => setB({ slides: [...b.slides, { id: `s${Date.now().toString(36)}`, slot, enabled: true, media: { type: 'image', src: '' }, title: '', cta: { type: 'item', target: '', label: 'اطلبه' } }] });
  const preview = (slot: BannerSlot) => window.open(`../#/?preview=${slot}`, '_blank');

  return (
    <div className="space-y-3 pb-24">
      <div className="flex items-center gap-2">
        <button onClick={() => go('more')} aria-label="رجوع" className="grid size-11 place-items-center rounded-full border border-line bg-surface"><ArrowRight size={19} /></button>
        <h1 className="text-[20px] font-extrabold">البانر الذكي</h1>
      </div>

      <Card>
        <Toggle checked={b.enabled} onChange={(enabled) => setB({ enabled })} label="البانر الذكي شغال" hint="الرأس يتغير حسب الوقت والجو والموسم" />
        <Toggle checked={b.auto} onChange={(auto) => setB({ auto })} label="شرائح تلقائية من صور الأصناف" hint="إذا ماكو صورة/فيديو مرفوع لذاك الوقت" />
        <Field label="ثواني لكل شريحة" className="mt-2"><NumInput value={b.intervalSec} onChange={(n) => setB({ intervalSec: n ?? 6 })} /></Field>
        <p className="mt-3 mb-1.5 text-[14px] font-bold">معاينة (تفتح المنيو بهذا الوقت):</p>
        <div className="flex flex-wrap gap-1.5">
          {(['lunch', 'afternoon', 'evening', 'hot', 'cold', 'season'] as BannerSlot[]).map((k) => (
            <button key={k} onClick={() => preview(k)} className="flex h-10 items-center gap-1 rounded-xl border border-line bg-surface px-3 text-[13px] font-bold">{SLOT_NAMES[k]} <ExternalLink size={13} /></button>
          ))}
        </div>
      </Card>

      {(['lunch', 'afternoon', 'evening'] as const).map((k) => {
        const d = b.dayparts[k];
        const setD = (p: Partial<typeof d>) => setB({ dayparts: { ...b.dayparts, [k]: { ...d, ...p } } });
        const up = b.slides.filter((x) => x.slot === k);
        return (
          <Card key={k} title={<>{SLOT_NAMES[k]} <bdi dir="ltr" className="text-[14px] font-bold text-muted">({d.from}–{d.to})</bdi></>}>
            <div className="grid grid-cols-2 gap-2">
              <Field label="من"><Input type="time" value={d.from} onChange={(e) => setD({ from: e.target.value })} /></Field>
              <Field label="لـ"><Input type="time" value={d.to === '24:00' ? '00:00' : d.to} onChange={(e) => setD({ to: e.target.value === '00:00' ? '24:00' : e.target.value })} /></Field>
            </div>
            <Field label="العنوان التلقائي" className="mt-2"><Input value={d.title} onChange={(e) => setD({ title: e.target.value })} /></Field>
            <p className="mt-3 mb-1.5 text-[14px] font-bold">أصناف الشرائح التلقائية</p>
            <ItemPicker value={d.items} onChange={(items) => setD({ items })} max={6} />
            <p className="mt-3 mb-1.5 text-[14px] font-bold">صور/فيديو مرفوعة ({up.length}) {up.length > 0 && <span className="font-normal text-muted">— تطلع بدل التلقائي</span>}</p>
            <div className="space-y-2">
              {up.map((sl) => <SlideEditor key={sl.id} slide={sl} onChange={(n) => setB({ slides: b.slides.map((x) => (x.id === sl.id ? n : x)) })} onDelete={() => setB({ slides: b.slides.filter((x) => x.id !== sl.id) })} />)}
            </div>
            <Btn size="sm" variant="ghost" className="mt-2" onClick={() => addSlide(k)}><Plus size={16} /> شريحة لـ{SLOT_NAMES[k]}</Btn>
          </Card>
        );
      })}

      <Card title="حسب الجو (حرارة النجف)">
        <Toggle checked={b.weather.enabled} onChange={(enabled) => setB({ weather: { ...b.weather, enabled } })} label="يعرف الجو" hint="من Open-Meteo المجاني، يتحدث كل ساعة" />
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Field label="حار فوك (°)"><NumInput value={b.weather.hotAbove} onChange={(n) => setB({ weather: { ...b.weather, hotAbove: n ?? 40 } })} /></Field>
          <Field label="بارد تحت (°)"><NumInput value={b.weather.coldBelow} onChange={(n) => setB({ weather: { ...b.weather, coldBelow: n ?? 15 } })} /></Field>
        </div>
        {(['hot', 'cold'] as const).map((k) => {
          const up = b.slides.filter((x) => x.slot === k);
          return (
            <div key={k} className="mt-4 border-t border-line pt-3">
              <p className="mb-1.5 text-[15px] font-extrabold">{SLOT_NAMES[k]}</p>
              <Field label="العنوان"><Input value={b.weather[k].title} onChange={(e) => setB({ weather: { ...b.weather, [k]: { ...b.weather[k], title: e.target.value } } })} /></Field>
              <p className="mt-2 mb-1.5 text-[14px] font-bold">الأصناف اللي تبرز</p>
              <ItemPicker value={b.weather[k].items} onChange={(items) => setB({ weather: { ...b.weather, [k]: { ...b.weather[k], items } } })} max={6} />
              <div className="mt-2 space-y-2">{up.map((sl) => <SlideEditor key={sl.id} slide={sl} onChange={(n) => setB({ slides: b.slides.map((x) => (x.id === sl.id ? n : x)) })} onDelete={() => setB({ slides: b.slides.filter((x) => x.id !== sl.id) })} />)}</div>
              <Btn size="sm" variant="ghost" className="mt-2" onClick={() => addSlide(k)}><Plus size={16} /> شريحة لـ{SLOT_NAMES[k]}</Btn>
            </div>
          );
        })}
      </Card>

      <Card title="شرائح الموسم وكل الأوقات">
        <div className="space-y-2">
          {b.slides.filter((x) => x.slot === 'season' || x.slot === 'any').map((sl) => <SlideEditor key={sl.id} slide={sl} onChange={(n) => setB({ slides: b.slides.map((x) => (x.id === sl.id ? n : x)) })} onDelete={() => setB({ slides: b.slides.filter((x) => x.id !== sl.id) })} />)}
        </div>
        <div className="mt-2 flex gap-2">
          <Btn size="sm" variant="ghost" onClick={() => addSlide('season')}><Plus size={16} /> شريحة موسم</Btn>
          <Btn size="sm" variant="ghost" onClick={() => addSlide('any')}><Plus size={16} /> كل الأوقات</Btn>
        </div>
      </Card>

      {err && <p role="alert" className="rounded-xl bg-danger/10 p-3 text-[14px] font-semibold text-danger">{err}</p>}
      {dirty && (
        <div className="pb-safe fixed inset-x-0 bottom-0 z-40 mx-auto flex max-w-[640px] gap-2 border-t border-line bg-bg/95 p-3 backdrop-blur">
          <Btn onClick={onSave} busy={busy} className="flex-1">احفظ البانر</Btn>
          <Btn variant="ghost" onClick={() => setS(saved)} disabled={busy}>تراجع</Btn>
        </div>
      )}
    </div>
  );
}
