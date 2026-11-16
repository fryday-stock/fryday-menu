import { lazy, Suspense, useState } from 'react';
import { ArrowRight, Plus, Trash, Pencil, Eraser, LoaderCircle } from 'lucide-react';
import type { Zone } from '../../data/types';
import { useAdmin, api, AdminError } from '../api';
import { Btn, Card, Field, Input, NumInput } from '../ui';
import { go } from '../../lib/router';
import { useToast } from '../../components/Toast';

const ZoneMap = lazy(() => import('../ZoneMap'));

export function ZonesPage() {
  const menu = useAdmin((x) => x.menu)!;
  const loadMenu = useAdmin((x) => x.loadMenu);
  const toast = useToast((x) => x.show);
  const [zones, setZones] = useState<Zone[]>(menu.zones);
  const [sel, setSel] = useState(0);
  const [vertex, setVertex] = useState<number | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const dirty = JSON.stringify(zones) !== JSON.stringify(menu.zones);
  const z = zones[sel];

  const setZone = (p: Partial<Zone>) => setZones((list) => list.map((x, k) => (k === sel ? { ...x, ...p } : x)));
  const save = async () => {
    setBusy(true);
    setErr(null);
    try {
      if (zones.some((x) => x.polygon.length > 0 && x.polygon.length < 3)) throw new Error('كل منطقة لازم بيها 3 نقاط على الأقل');
      await api('zones', { method: 'PUT', body: { zones } });
      await loadMenu();
      setDrawing(false);
      toast('انحفظت المناطق');
    } catch (e) { setErr((e as AdminError).message); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-3 pb-24">
      <div className="flex items-center gap-2">
        <button onClick={() => go('more')} aria-label="رجوع" className="grid size-11 place-items-center rounded-full border border-line bg-surface"><ArrowRight size={19} /></button>
        <h1 className="text-[20px] font-extrabold">مناطق التوصيل</h1>
      </div>

      <div className="flex flex-wrap gap-2">
        {zones.map((x, k) => (
          <button key={x.id} onClick={() => { setSel(k); setVertex(null); setDrawing(false); }} className={`h-11 rounded-xl px-4 text-[14.5px] font-bold ${k === sel ? 'bg-cta text-on-cta' : 'border border-line bg-surface'}`}>{x.name}</button>
        ))}
        <button onClick={() => { const id = `z${Date.now().toString(36)}`; setZones([...zones, { id, name: 'منطقة جديدة', fee: 0, polygon: [] }]); setSel(zones.length); setDrawing(true); }} className="flex h-11 items-center gap-1 rounded-xl border-2 border-dashed border-line px-3 text-[14px] font-bold text-muted"><Plus size={16} /> منطقة</button>
      </div>

      {z && (
        <>
          <Card className="space-y-3">
            <div className="grid grid-cols-[1fr_8rem] gap-2">
              <Field label="اسم المنطقة"><Input value={z.name} onChange={(e) => setZone({ name: e.target.value })} /></Field>
              <Field label="الأجرة (د.ع)"><NumInput value={z.fee} onChange={(n) => setZone({ fee: n ?? 0 })} /></Field>
            </div>
          </Card>
          <Card title="الحدود على الخريطة">
            <ul className="mb-3 list-disc space-y-0.5 ps-5 text-[13px] leading-6 text-muted">
              <li>اسحب النقاط السودة لتعديل الحدود.</li>
              <li>اضغط النقطة الصفرة الصغيرة (وسط الضلع) حتى تضيف نقطة جديدة.</li>
              <li>اضغط نقطة سودة وبعدها "احذف النقطة".</li>
            </ul>
            <Suspense fallback={<div className="grid h-[380px] place-items-center rounded-[18px] bg-surface-2"><LoaderCircle className="animate-spin text-muted" /></div>}>
              <ZoneMap zones={zones} selected={sel} tiles={menu.settings.map} restaurant={menu.settings.location} drawing={drawing} activeVertex={vertex} onVertex={setVertex}
                onChange={(polygon) => setZone({ polygon })} />
            </Suspense>
            <div className="mt-3 flex flex-wrap gap-2">
              <Btn size="sm" variant="danger" disabled={vertex == null || z.polygon.length <= 3} onClick={() => { setZone({ polygon: z.polygon.filter((_, k) => k !== vertex) }); setVertex(null); }}><Trash size={15} /> احذف النقطة</Btn>
              <Btn size="sm" variant={drawing ? 'primary' : 'ghost'} onClick={() => { if (!drawing && !confirm('ترسم الحدود من جديد؟ النقاط الحالية تنمسح.')) return; if (!drawing) setZone({ polygon: [] }); setDrawing(!drawing); setVertex(null); }}>
                {drawing ? <><Pencil size={15} /> خلصت الرسم</> : <><Eraser size={15} /> ارسم من جديد</>}
              </Btn>
            </div>
            {drawing && <p className="mt-2 rounded-xl bg-[#fff7e6] p-2.5 text-[13px] font-semibold text-[#92400e]">وضع الرسم: اضغط على الخريطة نقطة نقطة حول المنطقة (<bdi className="num">{z.polygon.length}</bdi> نقطة لحد هسه).</p>}
          </Card>
          <Btn variant="danger" size="sm" onClick={() => { if (confirm(`تحذف منطقة "${z.name}"؟`)) { setZones(zones.filter((_, k) => k !== sel)); setSel(0); } }}><Trash size={15} /> حذف هذي المنطقة</Btn>
        </>
      )}

      {err && <p role="alert" className="rounded-xl bg-danger/10 p-3 text-[14px] font-semibold text-danger">{err}</p>}
      {dirty && (
        <div className="pb-safe fixed inset-x-0 bottom-0 z-[1000] mx-auto flex max-w-[640px] gap-2 border-t border-line bg-bg/95 p-3 backdrop-blur">
          <Btn onClick={save} busy={busy} className="flex-1">احفظ المناطق</Btn>
          <Btn variant="ghost" onClick={() => { setZones(menu.zones); setDrawing(false); setVertex(null); }} disabled={busy}>تراجع</Btn>
        </div>
      )}
    </div>
  );
}
