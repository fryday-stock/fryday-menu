import { useMemo, useRef, useState } from 'react';
import { ArrowRight, ImagePlus, Images, Trash, X } from 'lucide-react';
import type { Item, TabId } from '../../data/types';
import { useAdmin, api, AdminError } from '../api';
import { compressImage } from '../image';
import { Btn, Card, Field, Input, NumInput, Segmented, TextArea, Toggle } from '../ui';
import { photo } from '../../lib/format';
import { go } from '../../lib/router';
import { useToast } from '../../components/Toast';

const PREFIX: Record<TabId, string> = { food: 'F', drinks: 'D', sweets: 'S' };

export function ImagePicker({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) {
  const menu = useAdmin((x) => x.menu)!;
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [gallery, setGallery] = useState(false);
  const all = useMemo(() => [...new Set(menu.items.map((i) => i.image).filter((x): x is string => !!x))].sort(), [menu.items]);

  const upload = async (f: File) => {
    setBusy(true);
    setErr(null);
    try {
      const { full, thumb } = await compressImage(f);
      const form = new FormData();
      form.append('file', new File([full], 'image.webp', { type: 'image/webp' }));
      form.append('thumb', new File([thumb], 'thumb.webp', { type: 'image/webp' }));
      const r = await api<{ url: string }>('upload', { form });
      onChange(r.url);
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); if (fileRef.current) fileRef.current.value = ''; }
  };

  return (
    <div>
      <div className="flex items-center gap-3">
        <div className="grid size-28 shrink-0 place-items-center rounded-2xl bg-surface-2">
          {value ? <img src={photo(value, 'lg')} alt="" className="size-26 object-contain" /> : <span className="text-[12px] text-muted">بدون صورة</span>}
        </div>
        <div className="flex flex-1 flex-col gap-2">
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
          <Btn size="sm" variant="dark" busy={busy} onClick={() => fileRef.current?.click()}><ImagePlus size={16} /> رفع صورة</Btn>
          <Btn size="sm" variant="ghost" onClick={() => setGallery(true)}><Images size={16} /> من صور المنيو</Btn>
          {value && <Btn size="sm" variant="danger" onClick={() => onChange(null)}><X size={16} /> شيل الصورة</Btn>}
        </div>
      </div>
      <p className="mt-2 text-[12.5px] text-muted">الصورة تنضغط تلقائياً (WebP أقل من 150KB). الأحسن صورة بخلفية شفافة.</p>
      {err && <p role="alert" className="mt-1 text-[13px] font-semibold text-danger">{err}</p>}
      {gallery && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/50" role="dialog" aria-modal="true" aria-label="صور المنيو" onClick={() => setGallery(false)}>
          <div className="pb-safe mx-auto max-h-[80dvh] w-full max-w-[640px] overflow-y-auto rounded-t-[24px] bg-bg p-4" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between"><h2 className="text-[18px] font-extrabold">اختار صورة</h2><button onClick={() => setGallery(false)} aria-label="سكّر" className="grid size-11 place-items-center rounded-full bg-surface-2"><X size={19} /></button></div>
            <div className="grid grid-cols-4 gap-2">
              {all.map((f) => (
                <button key={f} onClick={() => { onChange(f); setGallery(false); }} className={`grid aspect-square place-items-center rounded-xl bg-surface p-1 ${f === value ? 'ring-2 ring-fg' : ''}`}>
                  <img src={photo(f, 'sm')} alt={f} loading="lazy" className="max-h-full object-contain" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function ItemEditor({ id, copyFrom }: { id?: string; copyFrom?: string }) {
  const menu = useAdmin((x) => x.menu)!;
  const loadMenu = useAdmin((x) => x.loadMenu);
  const toast = useToast((x) => x.show);
  const isNew = id === 'new';
  const existing = isNew ? undefined : menu.items.find((i) => i.id === id);
  const startTab = (isNew && (['food', 'drinks', 'sweets'] as TabId[]).includes(copyFrom as TabId) ? copyFrom : existing?.tab ?? 'food') as TabId;

  const nextId = (tab: TabId) => {
    const nums = menu.items.filter((i) => i.id.startsWith(PREFIX[tab])).map((i) => Number(i.id.slice(1)));
    return `${PREFIX[tab]}${String(Math.max(0, ...nums) + 1).padStart(3, '0')}`;
  };
  const [f, setF] = useState<Item>(() => existing ?? {
    id: nextId(startTab), tab: startTab, section: menu.tabs.find((t) => t.id === startTab)!.sections[0]?.name ?? '',
    name: '', nameEn: null, desc: null, price: 0, orderable: true, groups: [], image: null, available: true,
  });
  const [newSection, setNewSection] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const set = (p: Partial<Item>) => setF((x) => ({ ...x, ...p }));

  if (!isNew && !existing) return <p className="text-muted">الصنف مو موجود. <button className="underline" onClick={() => go('menu')}>رجوع</button></p>;

  const sections = menu.tabs.find((t) => t.id === f.tab)!.sections.map((s) => s.name);
  const save = async () => {
    setBusy(true);
    setErr(null);
    try {
      if (isNew && menu.items.some((i) => i.id === f.id)) throw new Error('هذا الكود موجود — اختار كود ثاني');
      await api(`items/${f.id}`, { method: 'PUT', body: { ...f, price: f.price } });
      await loadMenu();
      toast(isNew ? 'انضاف الصنف' : 'انحفظ');
      go('menu');
    } catch (e) { setErr((e as AdminError).message); } finally { setBusy(false); }
  };
  const del = async () => {
    if (!confirm(`متأكد تحذف "${f.name}"؟ ما يرجع.`)) return;
    setBusy(true);
    try { await api(`items/${f.id}`, { method: 'DELETE' }); await loadMenu(); toast('انحذف'); go('menu'); } catch (e) { setErr((e as AdminError).message); setBusy(false); }
  };

  return (
    <div className="space-y-3 pb-20">
      <div className="flex items-center gap-2">
        <button onClick={() => go('menu')} aria-label="رجوع" className="grid size-11 place-items-center rounded-full border border-line bg-surface"><ArrowRight size={19} /></button>
        <h1 className="text-[20px] font-extrabold">{isNew ? 'صنف جديد' : f.name}</h1>
      </div>

      <Card>
        <ImagePicker value={f.image} onChange={(image) => set({ image })} />
      </Card>

      <Card className="space-y-3">
        <Segmented value={f.tab} onChange={(tab) => set({ tab, section: menu.tabs.find((t) => t.id === tab)!.sections[0]?.name ?? '', ...(isNew ? { id: nextId(tab) } : {}) })} options={menu.tabs.map((t) => [t.id, t.name] as [TabId, string])} />
        <Field label="القسم">
          {newSection ? (
            <Input value={f.section} onChange={(e) => set({ section: e.target.value })} placeholder="اسم القسم الجديد" autoFocus />
          ) : (
            <select value={f.section} onChange={(e) => (e.target.value === '__new' ? (setNewSection(true), set({ section: '' })) : set({ section: e.target.value }))} className="h-12 w-full rounded-xl border border-line bg-surface px-3 text-[16px]">
              {sections.map((s) => <option key={s} value={s}>{s}</option>)}
              <option value="__new">+ قسم جديد…</option>
            </select>
          )}
        </Field>
        <Field label="الاسم بالعربي" hint="نفس الاسم بنظام الكاشير"><Input value={f.name} onChange={(e) => set({ name: e.target.value })} /></Field>
        <Field label="الاسم بالإنكليزي" hint="اختياري"><Input dir="ltr" value={f.nameEn ?? ''} onChange={(e) => set({ nameEn: e.target.value || null })} className="text-end" /></Field>
        <Field label="الوصف / المكونات" hint="اختياري"><TextArea value={f.desc ?? ''} onChange={(e) => set({ desc: e.target.value || null })} rows={3} /></Field>
        <Toggle checked={f.price == null} onChange={(v) => set({ price: v ? null : 0, orderable: !v })} label='السعر "حسب الطلب"' hint="ما ينطلب أونلاين — يطلع للزبون زر اتصال" />
        {f.price != null && <Field label="السعر (د.ع)"><NumInput value={f.price} onChange={(n) => set({ price: n ?? 0 })} /></Field>}
        <Field label="الكود" hint={isNew ? 'يتولد تلقائياً — تگدر تغيره' : 'ما يتغير'}>
          <Input dir="ltr" value={f.id} disabled={!isNew} onChange={(e) => set({ id: e.target.value.toUpperCase() })} className="text-end" />
        </Field>
      </Card>

      <Card title="مجموعات الخيارات">
        <div className="space-y-1">
          {Object.values(menu.groups).map((g) => (
            <label key={g.code} className="flex min-h-11 items-center gap-3">
              <input type="checkbox" className="size-5 accent-[#17140f]" checked={f.groups.includes(g.code)} onChange={(e) => set({ groups: e.target.checked ? [...f.groups, g.code] : f.groups.filter((x) => x !== g.code) })} />
              <span className="flex-1 text-[14.5px]"><b>{g.name}</b> <span className="text-muted">— {g.options.map((o) => o.name).slice(0, 3).join('، ')}{g.options.length > 3 ? '…' : ''}</span></span>
              <bdi dir="ltr" className="text-[11px] text-muted">{g.code}</bdi>
            </label>
          ))}
        </div>
      </Card>

      <Card><Toggle checked={f.available} onChange={(available) => set({ available })} label="يطلع بالمنيو" hint="اطفيه حتى تخفي الصنف لفترة طويلة. للنفاد اليومي استخدم زر &quot;خالص اليوم&quot;." /></Card>

      {err && <p role="alert" className="rounded-xl bg-danger/10 p-3 text-[14px] font-semibold text-danger">{err}</p>}
      <div className="pb-safe fixed inset-x-0 bottom-0 z-40 mx-auto flex max-w-[640px] gap-2 border-t border-line bg-bg/95 p-3 backdrop-blur">
        <Btn onClick={save} busy={busy} disabled={!f.name.trim() || !f.section.trim()} className="flex-1">احفظ</Btn>
        {!isNew && <Btn variant="danger" onClick={del} disabled={busy} aria-label="حذف الصنف"><Trash size={18} /></Btn>}
      </div>
    </div>
  );
}
