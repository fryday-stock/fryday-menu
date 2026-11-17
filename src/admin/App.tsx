import { useEffect, useState, type ReactNode } from 'react';
import { ReceiptText, UtensilsCrossed, Settings2, LayoutGrid, LogOut, ExternalLink, Pause, Flame, LoaderCircle } from 'lucide-react';
import { useRoute, go } from '../lib/router';
import { Logo } from '../components/Logo';
import { Toast, useToast } from '../components/Toast';
import { useAdmin, api, AdminError } from './api';
import { Login } from './pages/Login';
import { PasswordGen } from './pages/PasswordGen';
import { Orders } from './pages/Orders';
import { MenuPage } from './pages/Menu';
import { ItemEditor } from './pages/ItemEditor';
import { SettingsPage } from './pages/Settings';
import { MorePage } from './pages/More';
import { Groups, GroupEditor } from './pages/Groups';
import { ZonesPage } from './pages/Zones';
import { ExcelPage } from './pages/Excel';
import { BannerPage } from './pages/Banner';
import { SalesPage } from './pages/Sales';
import { SeasonPage } from './pages/Season';

const NAV = [
  { id: 'orders', label: 'الطلبات', Icon: ReceiptText },
  { id: 'menu', label: 'المنيو', Icon: UtensilsCrossed },
  { id: 'settings', label: 'الإعدادات', Icon: Settings2 },
  { id: 'more', label: 'المزيد', Icon: LayoutGrid },
];

/** أزرار سريعة: إيقاف الطلبات مؤقتاً + ضغط عالي (تطلع بكل الصفحات) */
function QuickSwitches() {
  const s = useAdmin((x) => x.menu?.settings);
  const patch = useAdmin((x) => x.patchSettings);
  const toast = useToast((x) => x.show);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  if (!s) return null;
  const flip = async (key: 'paused' | 'busy', on: boolean) => {
    setBusyKey(key);
    try {
      await patch({ [key]: { enabled: on } });
      toast(key === 'paused' ? (on ? 'الطلبات متوقفة مؤقتاً' : 'الطلبات رجعت تشتغل') : on ? 'وضع الضغط العالي شغال' : 'رجع الوقت الطبيعي');
    } catch (e) { alert((e as Error).message); } finally { setBusyKey(null); }
  };
  const chip = (key: 'paused' | 'busy', on: boolean, label: string, onLabel: string, Icon: typeof Pause, color: string) => (
    <button onClick={() => flip(key, !on)} disabled={!!busyKey} aria-pressed={on}
      className={`flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border text-[13.5px] font-bold transition ${on ? `${color} border-transparent text-white` : 'border-white/15 bg-white/8 text-white/85'}`}>
      {busyKey === key ? <LoaderCircle size={16} className="animate-spin" /> : <Icon size={16} />} {on ? onLabel : label}
    </button>
  );
  return (
    <div className="flex gap-2 px-4 pb-3">
      {chip('paused', s.paused.enabled, 'إيقاف الطلبات مؤقتاً', 'الطلبات متوقفة — رجّعها', Pause, 'bg-danger')}
      {chip('busy', s.busy.enabled, 'ضغط عالي', `ضغط عالي (${s.busy.deliveryMinutes} د)`, Flame, 'bg-[#d97706]')}
    </div>
  );
}

function Shell({ children, tab }: { children: ReactNode; tab: string }) {
  const setAuthed = useAdmin((x) => x.setAuthed);
  const logout = async () => {
    await api('logout', { body: {} }).catch(() => {});
    setAuthed(false);
  };
  return (
    <div className="theme-a mx-auto min-h-dvh max-w-[640px] bg-bg pb-24 text-fg" style={{ fontFamily: 'Cairo, system-ui, sans-serif' }}>
      <header className="sticky top-0 z-30 bg-[#17140f] text-white">
        <div className="flex items-center gap-3 px-4 py-3">
          <Logo size={40} />
          <div className="flex-1">
            <p className="text-[17px] leading-tight font-extrabold">لوحة فرايدي</p>
            <a href="../" target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-[12.5px] text-white/65">فتح المنيو <ExternalLink size={12} /></a>
          </div>
          <button onClick={logout} className="flex h-10 items-center gap-1.5 rounded-xl border border-white/15 px-3 text-[13px] font-bold text-white/85"><LogOut size={15} /> خروج</button>
        </div>
        <QuickSwitches />
      </header>
      <main className="p-4">{children}</main>
      <nav className="pb-safe fixed inset-x-0 bottom-0 z-30 mx-auto max-w-[640px] border-t border-line bg-surface/95 px-2 pt-1.5 backdrop-blur" aria-label="أقسام اللوحة">
        <div className="grid grid-cols-4">
          {NAV.map(({ id, label, Icon }) => {
            const on = tab === id;
            return (
              <button key={id} onClick={() => go(id)} aria-current={on ? 'page' : undefined} className={`flex h-14 flex-col items-center justify-center gap-0.5 rounded-xl text-[12.5px] font-bold ${on ? 'text-fg' : 'text-muted'}`}>
                <span className={`grid h-7 w-12 place-items-center rounded-full transition ${on ? 'bg-primary' : ''}`}><Icon size={19} /></span>
                {label}
              </button>
            );
          })}
        </div>
      </nav>
      <Toast />
    </div>
  );
}

export function AdminApp() {
  const [page, a, b] = useRoute();
  const { authed, menu, check, loadMenu } = useAdmin();
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => { check().catch((e: AdminError) => setErr(e.message)); }, [check]);
  useEffect(() => { if (authed && !menu) loadMenu().catch((e: AdminError) => setErr(e.message)); }, [authed, menu, loadMenu]);

  if (page === 'password') return <PasswordGen />;
  if (err && authed !== true) {
    return (
      <div className="theme-a grid min-h-dvh place-items-center bg-bg p-6 text-center" style={{ fontFamily: 'Cairo, sans-serif' }}>
        <div className="max-w-sm space-y-3"><Logo size={72} /><p className="text-[16px] font-bold text-danger">{err}</p><button onClick={() => location.reload()} className="h-12 rounded-2xl bg-cta px-6 font-bold text-on-cta">حاول مرة ثانية</button></div>
      </div>
    );
  }
  if (authed === null || (authed && !menu)) {
    return <div className="grid min-h-dvh place-items-center bg-[#f7f4ee]"><LoaderCircle className="animate-spin text-[#685f54]" size={32} /></div>;
  }
  if (!authed) return <Login />;

  const tab = page === 'item' ? 'menu' : ['group', 'groups', 'zones', 'excel', 'banner', 'sales', 'season'].includes(page) ? 'more' : page || 'orders';
  let content: ReactNode;
  switch (page) {
    case 'menu': content = <MenuPage />; break;
    case 'item': content = <ItemEditor id={a} copyFrom={b} />; break;
    case 'settings': content = <SettingsPage />; break;
    case 'more': content = <MorePage />; break;
    case 'groups': content = <Groups />; break;
    case 'group': content = <GroupEditor code={a} />; break;
    case 'zones': content = <ZonesPage />; break;
    case 'excel': content = <ExcelPage />; break;
    case 'banner': content = <BannerPage />; break;
    case 'sales': content = <SalesPage />; break;
    case 'season': content = <SeasonPage />; break;
    default: content = <Orders />;
  }
  return <Shell tab={tab}>{content}</Shell>;
}
