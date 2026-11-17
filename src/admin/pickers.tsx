import { useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Check, Film, ImagePlus, Plus, Search, X } from 'lucide-react';
import type { Item } from '../data/types';
import { useAdmin, api } from './api';
import { compressImage } from './image';
import { Btn, Input } from './ui';
import { photo } from '../lib/format';
import { normalizeQuery } from '../lib/search';

/** اختيار أصناف (واحد أو أكثر) بنافذة بحث */
export function ItemPicker({ value, onChange, multi = true, label = 'اختار أصناف', max = 12 }: { value: string[]; onChange: (ids: string[]) => void; multi?: boolean; label?: string; max?: number }) {
  const menu = useAdmin((x) => x.menu)!;
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const byId = useMemo(() => new Map(menu.items.map((i) => [i.id, i])), [menu.items]);
  const list = useMemo(() => {
    const n = normalizeQuery(q);
    return menu.items.filter((i) => i.orderable && (!n || normalizeQuery(`${i.name} ${i.nameEn ?? ''} ${i.id} ${i.section}`).includes(n)));
  }, [q, menu.items]);
  const toggle = (id: string) => {
    if (!multi) { onChange([id]); setOpen(false); return; }
    onChange(value.includes(id) ? value.filter((x) => x !== id) : value.length >= max ? value : [...value, id]);
  };
  const move = (k: number, d: -1 | 1) => { const a = [...value]; [a[k], a[k + d]] = [a[k + d], a[k]]; onChange(a); };
  return (
    <div>
      {value.length > 0 && (
        <ul className="mb-2 space-y-1.5">
          {value.map((id, k) => {
            const it = byId.get(id);
            return (
              <li key={id} className="flex items-center gap-2 rounded-xl bg-surface-2 p-1.5">
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-surface">{it?.image ? <img src={photo(it.image, 'sm')} alt="" className="size-9 object-contain" /> : null}</span>
                <span className="min-w-0 flex-1 truncate text-[14px] font-bold">{it?.name ?? <span className="text-danger">صنف محذوف ({id})</span>}</span>
                {multi && <>
                  <button aria-label="لفوك" disabled={k === 0} onClick={() => move(k, -1)} className="grid size-9 place-items-center text-muted disabled:opacity-25"><ArrowUp size={15} /></button>
                  <button aria-label="لجوه" disabled={k === value.length - 1} onClick={() => move(k, 1)} className="grid size-9 place-items-center text-muted disabled:opacity-25"><ArrowDown size={15} /></button>
                </>}
                <button aria-label="شيل" onClick={() => onChange(value.filter((x) => x !== id))} className="grid size-9 place-items-center text-muted"><X size={16} /></button>
              </li>
            );
          })}
        </ul>
      )}
      <Btn size="sm" variant="ghost" onClick={() => setOpen(true)}><Plus size={16} /> {label}</Btn>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-end bg-black/50" role="dialog" aria-modal="true" aria-label={label} onClick={() => setOpen(false)}>
          <div className="pb-safe mx-auto flex max-h-[85dvh] w-full max-w-[640px] flex-col rounded-t-[24px] bg-bg p-4" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between"><h2 className="text-[18px] font-extrabold">{label}</h2><button onClick={() => setOpen(false)} aria-label="سكّر" className="grid size-11 place-items-center rounded-full bg-surface-2"><X size={19} /></button></div>
            <label className="relative mb-3 block"><Search size={18} className="pointer-events-none absolute top-3.5 right-3.5 text-muted" /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="دوّر بالاسم أو الكود" className="ps-10" /></label>
            <ul className="flex-1 space-y-1 overflow-y-auto">
              {list.map((i: Item) => {
                const on = value.includes(i.id);
                return (
                  <li key={i.id}>
                    <button onClick={() => toggle(i.id)} className={`flex min-h-13 w-full items-center gap-3 rounded-xl px-2 text-start ${on ? 'bg-primary/15' : ''}`}>
                      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-surface">{i.image ? <img src={photo(i.image, 'sm')} alt="" loading="lazy" className="size-9 object-contain" /> : null}</span>
                      <span className="min-w-0 flex-1"><span className="block truncate text-[14.5px] font-bold">{i.name}</span><span className="text-[12px] text-muted">{i.section} · <bdi>{i.id}</bdi></span></span>
                      {on && <Check size={18} className="text-ok" strokeWidth={3} />}
                    </button>
                  </li>
                );
              })}
            </ul>
            {multi && <Btn onClick={() => setOpen(false)} className="mt-3">تم (<bdi className="num">{value.length}</bdi>)</Btn>}
          </div>
        </div>
      )}
    </div>
  );
}

/** لقطة من الفيديو (صورة الغلاف) — تطلع للزبون إذا نته ضعيف */
async function videoPoster(file: File): Promise<File> {
  const url = URL.createObjectURL(file);
  try {
    const v = document.createElement('video');
    v.muted = true;
    v.playsInline = true;
    v.src = url;
    await new Promise<void>((res, rej) => { v.onloadeddata = () => res(); v.onerror = () => rej(new Error('ما گدرنا نقرا الفيديو — لازم MP4')); });
    v.currentTime = Math.min(0.5, (v.duration || 1) / 3);
    await new Promise<void>((res) => { v.onseeked = () => res(); });
    const scale = Math.min(1, 900 / Math.max(v.videoWidth, v.videoHeight));
    const c = document.createElement('canvas');
    c.width = Math.round(v.videoWidth * scale);
    c.height = Math.round(v.videoHeight * scale);
    c.getContext('2d')!.drawImage(v, 0, 0, c.width, c.height);
    const blob = await new Promise<Blob | null>((r) => c.toBlob(r, 'image/webp', 0.72));
    if (!blob) throw new Error('ما گدرنا نطلع صورة من الفيديو');
    return new File([blob], 'poster.webp', { type: 'image/webp' });
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** رفع صورة أو فيديو MP4 (≤1.5MB، صامت) — يرجع المسار وصورة الغلاف */
export function MediaUpload({ value, onChange, allowVideo = true }: { value: { type: 'image' | 'video'; src: string; poster?: string } | null; onChange: (m: { type: 'image' | 'video'; src: string; poster?: string }) => void; allowVideo?: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const pick = async (f: File) => {
    setBusy(true);
    setErr(null);
    try {
      const form = new FormData();
      if (f.type.startsWith('video/')) {
        if (!allowVideo) throw new Error('هنا بس صور');
        if (f.type !== 'video/mp4') throw new Error('الفيديو لازم MP4');
        if (f.size > 1_500_000) throw new Error(`الفيديو ${(f.size / 1_000_000).toFixed(1)}MB — لازم أقل من 1.5MB (صغّره أو قصّره)`);
        const poster = await compressImage(await videoPoster(f));
        form.append('file', f);
        form.append('thumb', new File([poster.full], 'poster.webp', { type: 'image/webp' }));
        const r = await api<{ url: string; poster?: string }>('upload', { form });
        onChange({ type: 'video', src: r.url, poster: r.poster });
      } else {
        const { full, thumb } = await compressImage(f);
        form.append('file', new File([full], 'image.webp', { type: 'image/webp' }));
        form.append('thumb', new File([thumb], 'thumb.webp', { type: 'image/webp' }));
        const r = await api<{ url: string }>('upload', { form });
        onChange({ type: 'image', src: r.url });
      }
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); if (ref.current) ref.current.value = ''; }
  };
  const preview = value ? (value.type === 'video' ? value.poster : value.src) : null;
  return (
    <div>
      <div className="flex items-center gap-3">
        <div className="relative grid aspect-[4/5] w-24 shrink-0 place-items-center overflow-hidden rounded-xl bg-[#17140f]">
          {preview ? <img src={photo(preview, 'lg')} alt="" className="h-full w-full object-cover" /> : <ImagePlus className="text-white/40" />}
          {value?.type === 'video' && <span className="absolute right-1 bottom-1 rounded-md bg-black/60 px-1.5 text-[11px] font-bold text-white">فيديو</span>}
        </div>
        <div className="flex-1 space-y-2">
          <input ref={ref} type="file" accept={allowVideo ? 'image/*,video/mp4' : 'image/*'} className="hidden" onChange={(e) => e.target.files?.[0] && pick(e.target.files[0])} />
          <Btn size="sm" busy={busy} onClick={() => ref.current?.click()} className="w-full">{allowVideo ? <><Film size={16} /> رفع صورة أو فيديو</> : <><ImagePlus size={16} /> رفع صورة</>}</Btn>
          <p className="text-[12px] leading-5 text-muted">{allowVideo ? 'الفيديو: MP4 صامت، أقل من 1.5MB، والأحسن طولي 4:5. يتكرر تلقائياً.' : 'PNG أو WebP بخلفية شفافة.'}</p>
        </div>
      </div>
      {err && <p role="alert" className="mt-1.5 text-[13px] font-semibold text-danger">{err}</p>}
    </div>
  );
}
