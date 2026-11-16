import { useState } from 'react';
import { ArrowRight, ArrowDown, ArrowUp, ChevronLeft, Plus, Trash, X } from 'lucide-react';
import type { OptionGroup } from '../../data/types';
import { useAdmin, api, AdminError } from '../api';
import { Badge, Btn, Card, Field, Input, NumInput, PageTitle, Segmented, Toggle } from '../ui';
import { go } from '../../lib/router';
import { useToast } from '../../components/Toast';
import { groupTypeLabel } from '../../lib/menuSheet';

export function Groups() {
  const menu = useAdmin((x) => x.menu)!;
  const used = (code: string) => menu.items.filter((i) => i.groups.includes(code)).length;
  return (
    <>
      <div className="mb-3 flex items-center gap-2">
        <button onClick={() => go('more')} aria-label="رجوع" className="grid size-11 place-items-center rounded-full border border-line bg-surface"><ArrowRight size={19} /></button>
        <div className="flex-1"><PageTitle action={<Btn size="sm" variant="primary" onClick={() => go('group/new')}><Plus size={17} /> مجموعة</Btn>}>مجموعات الخيارات</PageTitle></div>
      </div>
      <ul className="space-y-2">
        {Object.values(menu.groups).map((g) => (
          <li key={g.code}>
            <button onClick={() => go(`group/${g.code}`)} className="flex w-full items-center gap-3 rounded-[18px] bg-surface p-3.5 text-start shadow-card">
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2"><b className="text-[15.5px]">{g.name}</b><Badge>{groupTypeLabel(g)}</Badge></span>
                <span className="block truncate text-[13px] text-muted">{g.options.map((o) => o.name).join('، ')}</span>
                <span className="block text-[12px] text-muted"><bdi dir="ltr">{g.code}</bdi> · مستخدمة بـ <bdi className="num">{used(g.code)}</bdi> صنف</span>
              </span>
              <ChevronLeft size={18} className="text-muted" />
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}

type Mode = 'single' | 'multi' | 'exact';

export function GroupEditor({ code }: { code?: string }) {
  const menu = useAdmin((x) => x.menu)!;
  const loadMenu = useAdmin((x) => x.loadMenu);
  const toast = useToast((x) => x.show);
  const isNew = code === 'new';
  const existing = isNew ? undefined : menu.groups[code ?? ''];
  const [g, setG] = useState<OptionGroup>(() => existing ?? { code: '', name: '', kind: 'single', min: 0, max: 1, isSize: false, options: [{ id: '', name: '', price: 0 }] });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  if (!isNew && !existing) return <p className="text-muted">المجموعة مو موجودة.</p>;

  const mode: Mode = g.kind === 'multi' && g.min > 0 && g.min === g.max ? 'exact' : g.kind;
  const setMode = (m: Mode) => setG((x) => m === 'single' ? { ...x, kind: 'single', max: 1, min: Math.min(x.min, 1) } : m === 'multi' ? { ...x, kind: 'multi', max: 99, min: 0 } : { ...x, kind: 'multi', min: 3, max: 3 });
  const setOpt = (k: number, p: Partial<OptionGroup['options'][number]>) => setG((x) => ({ ...x, options: x.options.map((o, i) => (i === k ? { ...o, ...p } : o)) }));
  const move = (k: number, d: -1 | 1) => setG((x) => { const o = [...x.options]; [o[k], o[k + d]] = [o[k + d], o[k]]; return { ...x, options: o }; });

  const save = async () => {
    setBusy(true);
    setErr(null);
    try {
      const c = g.code.trim().toUpperCase();
      if (isNew && menu.groups[c]) throw new Error('هذا الكود موجود');
      const options = g.options.filter((o) => o.name.trim()).map((o, i) => ({ ...o, id: o.id || `${c}-${Date.now().toString(36)}-${i}` }));
      await api(`groups/${c}`, { method: 'PUT', body: { ...g, code: c, options } });
      await loadMenu();
      toast('انحفظت المجموعة');
      go('groups');
    } catch (e) { setErr((e as AdminError).message); } finally { setBusy(false); }
  };
  const del = async () => {
    const n = menu.items.filter((i) => i.groups.includes(g.code)).length;
    if (!confirm(n ? `هذي المجموعة مستخدمة بـ ${n} صنف — تنشال منهم. متأكد؟` : 'متأكد تحذف المجموعة؟')) return;
    setBusy(true);
    try { await api(`groups/${g.code}`, { method: 'DELETE' }); await loadMenu(); toast('انحذفت'); go('groups'); } catch (e) { setErr((e as AdminError).message); setBusy(false); }
  };

  return (
    <div className="space-y-3 pb-24">
      <div className="flex items-center gap-2">
        <button onClick={() => go('groups')} aria-label="رجوع" className="grid size-11 place-items-center rounded-full border border-line bg-surface"><ArrowRight size={19} /></button>
        <h1 className="text-[20px] font-extrabold">{isNew ? 'مجموعة جديدة' : g.name}</h1>
      </div>
      <Card className="space-y-3">
        <Field label="اسم المجموعة (يطلع للزبون)" hint="مثلاً: الحجم، الصوص، اختار 3 مقبلات"><Input value={g.name} onChange={(e) => setG({ ...g, name: e.target.value })} /></Field>
        <Field label="الكود" hint="حروف إنكليزية كبيرة وأرقام (مثل SAUCE_B)"><Input dir="ltr" disabled={!isNew} value={g.code} onChange={(e) => setG({ ...g, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '') })} className="text-end" /></Field>
        <p className="text-[14px] font-bold">طريقة الاختيار</p>
        <Segmented<Mode> value={mode} onChange={setMode} options={[['single', 'واحد بس'], ['multi', 'أكثر من واحد'], ['exact', 'عدد بالضبط']]} />
        {mode === 'exact' ? (
          <Field label="كم خيار لازم يختار؟"><NumInput value={g.min} onChange={(n) => setG({ ...g, min: n ?? 1, max: n ?? 1 })} /></Field>
        ) : (
          <Toggle checked={g.min > 0} onChange={(v) => setG({ ...g, min: v ? 1 : 0 })} label="إجباري" hint={mode === 'single' ? 'الزبون لازم يختار (أول خيار يتحدد تلقائياً)' : 'لازم يختار واحد على الأقل'} />
        )}
        <Toggle checked={g.isSize} onChange={(isSize) => setG({ ...g, isSize })} label="هذي حجوم" hint="تنعرض ككروت حجم بصورة الصنف" />
      </Card>
      <Card title="الخيارات" action={<Btn size="sm" variant="ghost" onClick={() => setG({ ...g, options: [...g.options, { id: '', name: '', price: 0 }] })}><Plus size={16} /> خيار</Btn>}>
        <ul className="space-y-2">
          {g.options.map((o, k) => (
            <li key={k} className="flex items-center gap-1.5">
              <div className="flex flex-col">
                <button aria-label="لفوك" disabled={k === 0} onClick={() => move(k, -1)} className="grid h-6 w-7 place-items-center text-muted disabled:opacity-25"><ArrowUp size={14} /></button>
                <button aria-label="لجوه" disabled={k === g.options.length - 1} onClick={() => move(k, 1)} className="grid h-6 w-7 place-items-center text-muted disabled:opacity-25"><ArrowDown size={14} /></button>
              </div>
              <Input value={o.name} onChange={(e) => setOpt(k, { name: e.target.value })} placeholder="اسم الخيار" className="flex-1" />
              <NumInput value={o.price} onChange={(n) => setOpt(k, { price: n ?? 0 })} aria-label="فرق السعر" className="w-24!" />
              <button aria-label="احذف الخيار" onClick={() => setG({ ...g, options: g.options.filter((_, i) => i !== k) })} className="grid size-11 shrink-0 place-items-center text-muted"><X size={18} /></button>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[12.5px] text-muted">الرقم = فرق السعر (0 = ضمن السعر).</p>
      </Card>
      {err && <p role="alert" className="rounded-xl bg-danger/10 p-3 text-[14px] font-semibold text-danger">{err}</p>}
      <div className="pb-safe fixed inset-x-0 bottom-0 z-40 mx-auto flex max-w-[640px] gap-2 border-t border-line bg-bg/95 p-3 backdrop-blur">
        <Btn onClick={save} busy={busy} disabled={!g.name.trim() || !g.code.trim()} className="flex-1">احفظ</Btn>
        {!isNew && <Btn variant="danger" onClick={del} disabled={busy} aria-label="حذف المجموعة"><Trash size={18} /></Btn>}
      </div>
    </div>
  );
}
