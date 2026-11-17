import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronLeft, PencilLine, Plus, Search, Star } from 'lucide-react';
import type { Item, TabId } from '../../data/types';
import { useAdmin, api, AdminError } from '../api';
import { Badge, Btn, Input, PageTitle, Segmented } from '../ui';
import { photo, fmt } from '../../lib/format';
import { go } from '../../lib/router';
import { useToast } from '../../components/Toast';
import { normalizeQuery } from '../../lib/search';

function ItemRow({ item, first, last, onMove, onSoldOut, busy, starred, onStar }: { item: Item; first: boolean; last: boolean; onMove: (d: -1 | 1) => void; onSoldOut: () => void; busy: boolean; starred: boolean; onStar: () => void }) {
  const soldOut = !!item.soldOutUntil;
  return (
    <li className={`flex items-center gap-2.5 rounded-2xl bg-surface p-2.5 shadow-card ${soldOut || !item.available ? 'opacity-75' : ''}`}>
      <button onClick={() => go(`item/${item.id}`)} className="flex min-w-0 flex-1 items-center gap-2.5 text-start">
        <span className="grid size-14 shrink-0 place-items-center rounded-xl bg-surface-2">
          {item.image ? <img src={photo(item.image, 'sm')} alt="" loading="lazy" className="size-12 object-contain" /> : <span className="text-[11px] text-muted">بدون صورة</span>}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-bold">{item.name}</span>
          <span className="flex flex-wrap items-center gap-1.5 text-[13px] text-muted">
            <bdi className="num">{item.id}</bdi> · {item.price != null ? <bdi className="num">{fmt(item.price)}</bdi> : 'حسب الطلب'}
            {soldOut && <Badge tone="danger">خالص اليوم</Badge>}
            {!item.available && <Badge>مخفي</Badge>}
          </span>
        </span>
      </button>
      <button onClick={onStar} disabled={busy || !item.image || !item.orderable} aria-pressed={starred} aria-label={starred ? 'شيله من الأكثر طلباً' : 'ضيفه للأكثر طلباً'} title="الأكثر طلباً"
        className="grid size-10 shrink-0 place-items-center rounded-xl disabled:opacity-25">
        <Star size={19} className={starred ? 'fill-primary text-primary-2' : 'text-muted'} />
      </button>
      <button onClick={onSoldOut} disabled={busy} className={`h-10 shrink-0 rounded-xl px-2.5 text-[12.5px] font-bold ${soldOut ? 'bg-ok/12 text-ok' : 'bg-danger/8 text-danger'}`}>
        {soldOut ? 'رجّعه' : 'خالص اليوم'}
      </button>
      <div className="flex shrink-0 flex-col">
        <button aria-label="لفوك" disabled={first} onClick={() => onMove(-1)} className="grid h-7 w-9 place-items-center text-muted disabled:opacity-25"><ArrowUp size={16} /></button>
        <button aria-label="لجوه" disabled={last} onClick={() => onMove(1)} className="grid h-7 w-9 place-items-center text-muted disabled:opacity-25"><ArrowDown size={16} /></button>
      </div>
    </li>
  );
}

export function MenuPage() {
  const menu = useAdmin((x) => x.menu)!;
  const loadMenu = useAdmin((x) => x.loadMenu);
  const toast = useToast((x) => x.show);
  const [tab, setTab] = useState<TabId>(() => (sessionStorage.getItem('admin:tab') as TabId) || 'food');
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const t = menu.tabs.find((x) => x.id === tab)!;
  const results = useMemo(() => {
    const n = normalizeQuery(q);
    return n ? menu.items.filter((i) => normalizeQuery(`${i.name} ${i.nameEn ?? ''} ${i.id}`).includes(n)) : null;
  }, [q, menu.items]);

  const run = async (key: string, fn: () => Promise<unknown>, msg?: string) => {
    setBusy(key);
    try { await fn(); await loadMenu(); if (msg) toast(msg); } catch (e) { alert((e as AdminError).message); } finally { setBusy(null); }
  };

  const featured = menu.settings.featured.items;
  const patch = useAdmin((x) => x.patchSettings);
  const star = (i: Item) => run(i.id, () => patch({ featured: { items: featured.includes(i.id) ? featured.filter((x) => x !== i.id) : [...featured, i.id] } }), featured.includes(i.id) ? `${i.name} انشال من الأكثر طلباً` : `${i.name} ⭐ صار بالأكثر طلباً`);
  const soldOut = (i: Item) => run(i.id, () => api(`items/${i.id}/soldout`, { body: { on: !i.soldOutUntil } }), i.soldOutUntil ? `${i.name} رجع متوفر` : `${i.name}: خالص لحد 6 الصبح`);
  const moveItem = (list: Item[], idx: number, d: -1 | 1) => {
    const ids = list.map((i) => i.id);
    [ids[idx], ids[idx + d]] = [ids[idx + d], ids[idx]];
    run('order', () => api('items/order', { body: { ids } }));
  };
  const sectionsByTab = () => Object.fromEntries(menu.tabs.map((x) => [x.id, x.sections.map((s) => s.name)]));
  const moveSection = (idx: number, d: -1 | 1) => {
    const sbt = sectionsByTab();
    const arr = sbt[tab];
    [arr[idx], arr[idx + d]] = [arr[idx + d], arr[idx]];
    run('sec', () => api('sections', { method: 'PUT', body: { sectionsByTab: sbt } }));
  };
  const renameSection = (name: string) => {
    const to = prompt('الاسم الجديد للقسم:', name)?.trim();
    if (!to || to === name) return;
    const sbt = sectionsByTab();
    if (sbt[tab].includes(to)) return alert('هذا الاسم موجود');
    sbt[tab] = sbt[tab].map((x) => (x === name ? to : x));
    run('sec', () => api('sections', { method: 'PUT', body: { sectionsByTab: sbt, rename: { tab, from: name, to } } }), 'تغير اسم القسم');
  };

  const renderList = (items: Item[]) => (
    <ul className="space-y-2">
      {items.map((i, k) => <ItemRow key={i.id} item={i} first={k === 0} last={k === items.length - 1} busy={busy === i.id} onSoldOut={() => soldOut(i)} onMove={(d) => moveItem(items, k, d)} starred={featured.includes(i.id)} onStar={() => star(i)} />)}
    </ul>
  );

  return (
    <>
      <PageTitle action={<Btn size="sm" variant="primary" onClick={() => go(`item/new/${tab}`)}><Plus size={17} /> صنف جديد</Btn>}>المنيو</PageTitle>
      <label className="relative mb-3 block">
        <span className="sr-only">بحث</span>
        <Search size={18} className="pointer-events-none absolute top-3.5 right-3.5 text-muted" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="دوّر على صنف بالاسم أو الكود" className="ps-10" />
      </label>
      {results ? (
        results.length ? renderList(results) : <p className="text-center text-muted">ماكو نتائج</p>
      ) : (
        <>
          <Segmented value={tab} onChange={(v) => { setTab(v); sessionStorage.setItem('admin:tab', v); }} options={menu.tabs.map((x) => [x.id, x.name] as [TabId, string])} />
          <p className="mt-2 text-[13px] text-muted">"خالص اليوم" يخفي الصنف من المنيو ويرجع تلقائياً الساعة 6 الصبح.</p>
          <div className="mt-4 space-y-6">
            {t.sections.map((sec, k) => {
              const items = menu.items.filter((i) => i.tab === tab && i.section === sec.name);
              return (
                <section key={sec.id}>
                  <div className="mb-2 flex items-center gap-1.5">
                    <h2 className="flex-1 text-[17px] font-extrabold">{sec.name} <span className="text-[13px] font-semibold text-muted">(<bdi className="num">{items.length}</bdi>)</span></h2>
                    <button aria-label="تغيير اسم القسم" onClick={() => renameSection(sec.name)} className="grid size-10 place-items-center rounded-xl text-muted"><PencilLine size={16} /></button>
                    <button aria-label="القسم لفوك" disabled={k === 0} onClick={() => moveSection(k, -1)} className="grid size-10 place-items-center rounded-xl text-muted disabled:opacity-25"><ArrowUp size={16} /></button>
                    <button aria-label="القسم لجوه" disabled={k === t.sections.length - 1} onClick={() => moveSection(k, 1)} className="grid size-10 place-items-center rounded-xl text-muted disabled:opacity-25"><ArrowDown size={16} /></button>
                  </div>
                  {items.length ? renderList(items) : <p className="text-[13px] text-muted">القسم فاضي</p>}
                </section>
              );
            })}
          </div>
          <button onClick={() => go(`item/new/${tab}`)} className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line font-bold text-muted">
            <Plus size={18} /> صنف جديد بـ"{t.name}" <ChevronLeft size={16} />
          </button>
        </>
      )}
    </>
  );
}
