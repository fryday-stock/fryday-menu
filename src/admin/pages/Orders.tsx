import { useCallback, useEffect, useState } from 'react';
import { ChevronDown, MapPin, Phone, RefreshCw, Search, MessageCircle, Trash } from 'lucide-react';
import { api, baghdadToday, baghdadTime, AdminError } from '../api';
import { Badge, Card, Empty, Input, PageTitle } from '../ui';
import { Price } from '../../components/Price';
import { fmt } from '../../lib/format';

interface OrderRow {
  id: number; day: string; number: number; created_at: string; status: 'pending' | 'sent'; type: 'delivery' | 'pickup';
  customer_name: string; phone: string; zone: string | null; address: string | null; lat: number | null; lng: number | null;
  subtotal: number; delivery_fee: number | null; total: number; note: string | null; message: string;
  lines: { name: string; qty: number }[];
}
interface Resp { day: string; orders: OrderRow[]; summary: { n: number; total: number; pending: number | null } }

function OrderCard({ o, onDeleted }: { o: OrderRow; onDeleted: () => void }) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const del = async () => {
    if (!confirm(`تحذف الطلب #${o.number}؟\nاستخدمها بس للطلبات التجريبية — الحذف ما يرجع.`)) return;
    setDeleting(true);
    try {
      const r = await api<{ nextNumber: number }>(`orders/${o.id}`, { method: 'DELETE' });
      alert(`انحذف الطلب #${o.number}. الطلب الجاي بهذا اليوم راح ياخذ رقم #${r.nextNumber}.`);
      onDeleted();
    } catch (e) { alert((e as AdminError).message); setDeleting(false); }
  };
  const pending = o.status === 'pending';
  return (
    <li className={`overflow-hidden rounded-[18px] bg-surface shadow-card ${pending ? 'ring-1 ring-[#f59e0b]/50' : ''}`}>
      <button onClick={() => setOpen((s) => !s)} aria-expanded={open} className="flex w-full items-start gap-3 p-3.5 text-start">
        <div className="min-w-16 rounded-xl bg-surface-2 px-2 py-1.5 text-center">
          <p className="text-[19px] leading-tight font-extrabold"><bdi className="num">#{o.number}</bdi></p>
          <p className="text-[12px] text-muted"><bdi className="num">{baghdadTime(o.created_at).split(' ')[0]}</bdi> {baghdadTime(o.created_at).split(' ')[1]}</p>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-[15.5px] font-bold">{o.customer_name}</p>
            {pending ? <Badge tone="warn">غير مؤكد</Badge> : <Badge tone="ok">انرسل ✓</Badge>}
          </div>
          <p className="text-[13px] text-muted">{o.type === 'delivery' ? `توصيل${o.zone ? ` — ${o.zone}` : ''}` : 'استلام من المطعم'} · {o.lines.reduce((a, l) => a + l.qty, 0)} قطعة</p>
          <Price value={o.total} className="text-[15px] font-extrabold" />
        </div>
        <ChevronDown size={18} className={`mt-1 shrink-0 text-muted transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="space-y-3 border-t border-line p-3.5">
          {pending && <p className="rounded-xl bg-[#fef3c7] p-2.5 text-[13px] font-semibold text-[#92400e]">الزبون أكمل الطلب بس ما ضغط "أرسل على واتساب" — ممكن تتصل بيه تأكد.</p>}
          <pre dir="rtl" className="max-h-80 overflow-auto rounded-xl bg-surface-2 p-3 font-sans text-[13px] leading-6 whitespace-pre-wrap">{o.message}</pre>
          <div className="flex flex-wrap gap-2">
            <a href={`tel:${o.phone}`} className="flex h-11 items-center gap-1.5 rounded-xl border border-line px-3.5 text-[14px] font-bold"><Phone size={16} /> <bdi className="num">{o.phone}</bdi></a>
            <a href={`https://wa.me/964${o.phone.slice(1)}`} target="_blank" rel="noopener noreferrer" className="flex h-11 items-center gap-1.5 rounded-xl border border-line px-3.5 text-[14px] font-bold"><MessageCircle size={16} /> واتساب</a>
            {o.lat != null && o.lng != null && (
              <a href={`https://maps.google.com/?q=${o.lat},${o.lng}`} target="_blank" rel="noopener noreferrer" className="flex h-11 items-center gap-1.5 rounded-xl border border-line px-3.5 text-[14px] font-bold"><MapPin size={16} /> الموقع</a>
            )}
            <button onClick={del} disabled={deleting} className="ms-auto flex h-11 items-center gap-1.5 rounded-xl border border-danger/30 bg-danger/8 px-3.5 text-[14px] font-bold text-danger disabled:opacity-50"><Trash size={16} /> حذف (تجريبي)</button>
          </div>
        </div>
      )}
    </li>
  );
}

export function Orders() {
  const [day, setDay] = useState(baghdadToday());
  const [q, setQ] = useState('');
  const [data, setData] = useState<Resp | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await api<Resp>(`orders?day=${day}&q=${encodeURIComponent(q)}`));
      setErr(null);
    } catch (e) { setErr((e as AdminError).message); } finally { setLoading(false); }
  }, [day, q]);

  useEffect(() => {
    const t = setTimeout(load, q ? 350 : 0);
    return () => clearTimeout(t);
  }, [load, q]);
  // تحديث تلقائي كل 30 ثانية لطلبات اليوم
  useEffect(() => {
    if (day !== baghdadToday() || q) return;
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, [day, q, load]);

  const s = data?.summary;
  return (
    <>
      <PageTitle action={<button onClick={load} aria-label="تحديث" className="grid size-11 place-items-center rounded-xl border border-line bg-surface"><RefreshCw size={18} className={loading ? 'animate-spin' : ''} /></button>}>الطلبات</PageTitle>
      <div className="mb-3 grid grid-cols-[1fr_auto] gap-2">
        <label className="relative">
          <span className="sr-only">بحث برقم الطلب أو الموبايل</span>
          <Search size={18} className="pointer-events-none absolute top-3.5 right-3.5 text-muted" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="رقم الطلب أو الموبايل" inputMode="numeric" className="ps-10" />
        </label>
        <input type="date" value={day} max={baghdadToday()} onChange={(e) => setDay(e.target.value || baghdadToday())} aria-label="التاريخ" className="h-12 rounded-xl border border-line bg-surface px-2 text-[15px]" />
      </div>
      {s && !q && (
        <div className="mb-3 grid grid-cols-3 gap-2 text-center">
          <Card className="p-3!"><p className="text-[20px] font-extrabold"><bdi className="num">{s.n}</bdi></p><p className="text-[12px] text-muted">طلب</p></Card>
          <Card className="p-3!"><p className="text-[17px] font-extrabold"><bdi className="num">{fmt(s.total)}</bdi></p><p className="text-[12px] text-muted">د.ع المجموع</p></Card>
          <Card className="p-3!"><p className={`text-[20px] font-extrabold ${s.pending ? 'text-[#b45309]' : ''}`}><bdi className="num">{s.pending ?? 0}</bdi></p><p className="text-[12px] text-muted">غير مؤكد</p></Card>
        </div>
      )}
      {err && <p role="alert" className="mb-3 rounded-xl bg-danger/10 p-3 text-[14px] font-semibold text-danger">{err}</p>}
      {data && (data.orders.length ? (
        <ul className="space-y-2.5">{data.orders.map((o) => <OrderCard key={o.id} o={o as OrderRow} onDeleted={load} />)}</ul>
      ) : (
        <Empty>{q ? 'ماكو نتائج' : 'ماكو طلبات بهذا اليوم بعد'}</Empty>
      ))}
    </>
  );
}
