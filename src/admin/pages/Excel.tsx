import { useRef, useState } from 'react';
import { ArrowRight, Download, Upload, TriangleAlert, Plus, Minus, PencilLine } from 'lucide-react';
import readExcelFile from 'read-excel-file/browser';
import writeExcelFile from 'write-excel-file/browser';
import type { Item } from '../../data/types';
import { useAdmin, api, AdminError, baghdadToday } from '../api';
import { buildMenuSheets, parseMenuSheets, type ParsedMenu } from '../../lib/menuSheet';
import { Badge, Btn, Card } from '../ui';
import { go } from '../../lib/router';
import { fmt } from '../../lib/format';
import { useToast } from '../../components/Toast';

const FIELDS: [keyof Item, string][] = [['name', 'الاسم'], ['price', 'السعر'], ['section', 'القسم'], ['tab', 'التبويب'], ['nameEn', 'الإنكليزي'], ['desc', 'الوصف'], ['groups', 'الخيارات'], ['image', 'الصورة'], ['available', 'متوفر']];
const show = (v: unknown) => (v == null || v === '' ? '—' : Array.isArray(v) ? v.join(',') || '—' : typeof v === 'number' ? fmt(v) : typeof v === 'boolean' ? (v ? 'نعم' : 'لا') : String(v));

interface Diff {
  added: Item[];
  removed: Item[];
  changed: { item: Item; changes: [string, unknown, unknown][] }[];
  groupsChanged: string[];
  zonesChanged: string[];
}

export function ExcelPage() {
  const menu = useAdmin((x) => x.menu)!;
  const loadMenu = useAdmin((x) => x.loadMenu);
  const toast = useToast((x) => x.show);
  const fileRef = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<ParsedMenu | null>(null);
  const [diff, setDiff] = useState<Diff | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const exportXlsx = async () => {
    setBusy('export');
    try {
      const sheets = buildMenuSheets(menu);
      const blob = await writeExcelFile(Object.entries(sheets).map(([sheet, data]) => ({ sheet, data, rightToLeft: true }))).toBlob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `fryday-menu-${baghdadToday()}.xlsx`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    } catch (e) { setErr((e as Error).message); } finally { setBusy(null); }
  };

  const onFile = async (file: File) => {
    setBusy('read');
    setErr(null);
    setParsed(null);
    setDiff(null);
    try {
      const all = await readExcelFile(file);
      const sheets = Object.fromEntries(all.map((s: { sheet: string; data: unknown[][] }) => [s.sheet, s.data]));
      const p = parseMenuSheets(sheets);
      // مكتبة القراءة تشيل الإيموجي (🌶) — إذا الاسم نفسه بدون الإيموجي نخلي الاسم القديم
      const strip = (x: string) => x.replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\uFE0F]/gu, '').trim();
      for (const g of Object.values(p.groups)) {
        const old = menu.groups[g.code];
        if (old) g.options = g.options.map((o) => ({ ...o, name: old.options.find((x) => strip(x.name) === strip(o.name))?.name ?? o.name }));
      }
      for (const i of p.items) {
        const old = menu.items.find((x) => x.id === i.id);
        if (old && strip(old.name) === strip(i.name)) i.name = old.name;
      }
      const cur = new Map(menu.items.map((i) => [i.id, i]));
      const next = new Map(p.items.map((i) => [i.id, i]));
      const changed: Diff['changed'] = [];
      for (const i of p.items) {
        const c = cur.get(i.id);
        if (!c) continue;
        const ch = FIELDS.filter(([k]) => JSON.stringify(c[k] ?? null) !== JSON.stringify(i[k] ?? null)).map(([k, label]) => [label, c[k], i[k]] as [string, unknown, unknown]);
        if (ch.length) changed.push({ item: i, changes: ch });
      }
      const norm = (g: unknown) => JSON.stringify({ ...(g as object), options: ((g as { options: { name: string; price: number }[] }).options).map((o) => [o.name, o.price]) });
      const codes = new Set([...Object.keys(menu.groups), ...Object.keys(p.groups)]);
      setParsed(p);
      setDiff({
        added: p.items.filter((i) => !cur.has(i.id)),
        removed: menu.items.filter((i) => !next.has(i.id)),
        changed,
        groupsChanged: [...codes].filter((c) => !menu.groups[c] || !p.groups[c] || norm(menu.groups[c]) !== norm(p.groups[c])),
        zonesChanged: p.zones.filter((z) => menu.zones.find((x) => x.name === z.name)?.fee !== z.fee).map((z) => `${z.name}: ${fmt(z.fee)}`),
      });
    } catch (e) { setErr(`ما گدرنا نقرا الملف: ${(e as Error).message}`); } finally { setBusy(null); if (fileRef.current) fileRef.current.value = ''; }
  };

  const confirmImport = async () => {
    if (!parsed) return;
    if (diff?.removed.length && !confirm(`راح ينحذف ${diff.removed.length} صنف مو موجود بالملف. متأكد؟`)) return;
    setBusy('save');
    try {
      await api('import', { method: 'PUT', body: { items: parsed.items, groups: parsed.groups, sectionsByTab: parsed.sectionsByTab, zones: parsed.zones } });
      await loadMenu();
      toast('انحفظ المنيو من الملف');
      setParsed(null);
      setDiff(null);
    } catch (e) { setErr((e as AdminError).message); } finally { setBusy(null); }
  };

  const nothing = diff && !diff.added.length && !diff.removed.length && !diff.changed.length && !diff.groupsChanged.length && !diff.zonesChanged.length;
  return (
    <div className="space-y-3 pb-24">
      <div className="flex items-center gap-2">
        <button onClick={() => go('more')} aria-label="رجوع" className="grid size-11 place-items-center rounded-full border border-line bg-surface"><ArrowRight size={19} /></button>
        <h1 className="text-[20px] font-extrabold">Excel</h1>
      </div>
      <Card title="تصدير">
        <p className="mb-3 text-[14px] text-muted">ينزل ملف بنفس شكل menu.xlsx (المنيو + الخيارات + المناطق). عدّله وارجع ارفعه.</p>
        <Btn onClick={exportXlsx} busy={busy === 'export'} className="w-full"><Download size={18} /> نزّل المنيو Excel</Btn>
      </Card>
      <Card title="استيراد">
        <p className="mb-3 text-[14px] text-muted">ترفع الملف ← تشوف شنو راح يتغير ← وبعدها تأكد. ما يتغير شي قبل التأكيد.</p>
        <input ref={fileRef} type="file" accept=".xlsx" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
        <Btn variant="ghost" onClick={() => fileRef.current?.click()} busy={busy === 'read'} className="w-full"><Upload size={18} /> اختار ملف Excel</Btn>
      </Card>
      {err && <p role="alert" className="rounded-xl bg-danger/10 p-3 text-[14px] font-semibold text-danger">{err}</p>}

      {diff && parsed && (
        <Card title="مراجعة قبل الحفظ">
          {parsed.warnings.length > 0 && (
            <div className="mb-3 rounded-xl bg-[#fff7e6] p-3 text-[13px] text-[#92400e]">
              <p className="mb-1 flex items-center gap-1.5 font-bold"><TriangleAlert size={16} /> تنبيهات ({parsed.warnings.length})</p>
              <ul className="list-disc space-y-0.5 ps-5">{parsed.warnings.slice(0, 15).map((w) => <li key={w}>{w}</li>)}</ul>
            </div>
          )}
          <div className="mb-3 flex flex-wrap gap-2">
            <Badge tone="ok">{parsed.items.length} صنف بالملف</Badge>
            <Badge tone="ok"><Plus size={12} /> {diff.added.length} جديد</Badge>
            <Badge tone="warn"><PencilLine size={12} /> {diff.changed.length} تغيّر</Badge>
            <Badge tone="danger"><Minus size={12} /> {diff.removed.length} ينحذف</Badge>
          </div>
          {nothing && <p className="text-[14px] text-muted">ماكو أي تغيير عن المنيو الحالي.</p>}
          <div className="max-h-[50vh] space-y-3 overflow-y-auto text-[13.5px]">
            {diff.added.length > 0 && <div><p className="mb-1 font-bold text-ok">أصناف جديدة</p><ul className="space-y-0.5">{diff.added.map((i) => <li key={i.id}><bdi className="num">{i.id}</bdi> — {i.name} ({show(i.price)})</li>)}</ul></div>}
            {diff.changed.length > 0 && (
              <div><p className="mb-1 font-bold text-[#b45309]">تغييرات</p>
                <ul className="space-y-1.5">{diff.changed.map(({ item, changes }) => (
                  <li key={item.id} className="rounded-lg bg-surface-2 p-2"><b>{item.name}</b> <bdi className="num text-muted">{item.id}</bdi>
                    {changes.map(([label, a, b]) => <div key={label} className="text-muted">{label}: <s>{show(a)}</s> ← <b className="text-fg">{show(b)}</b></div>)}
                  </li>
                ))}</ul>
              </div>
            )}
            {diff.removed.length > 0 && <div><p className="mb-1 font-bold text-danger">ينحذفون (مو موجودين بالملف)</p><ul>{diff.removed.map((i) => <li key={i.id}><bdi className="num">{i.id}</bdi> — {i.name}</li>)}</ul></div>}
            {diff.groupsChanged.length > 0 && <p><b>مجموعات خيارات تغيرت:</b> <bdi dir="ltr">{diff.groupsChanged.join(', ')}</bdi></p>}
            {diff.zonesChanged.length > 0 && <p><b>أجور مناطق تغيرت:</b> {diff.zonesChanged.join('، ')}</p>}
          </div>
          <div className="mt-4 flex gap-2">
            <Btn onClick={confirmImport} busy={busy === 'save'} disabled={!!nothing} className="flex-1">أكّد واحفظ</Btn>
            <Btn variant="ghost" onClick={() => { setParsed(null); setDiff(null); }}>إلغاء</Btn>
          </div>
        </Card>
      )}
    </div>
  );
}
