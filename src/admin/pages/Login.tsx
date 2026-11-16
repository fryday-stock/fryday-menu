import { useState } from 'react';
import { Eye, EyeOff, KeyRound } from 'lucide-react';
import { Logo } from '../../components/Logo';
import { api, useAdmin, AdminError } from '../api';
import { Btn, inputCls } from '../ui';

export function Login() {
  const configured = useAdmin((x) => x.configured);
  const check = useAdmin((x) => x.check);
  const [pw, setPw] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await api('login', { body: { password: pw } });
      setPw('');
      await check();
    } catch (x) {
      setErr((x as AdminError).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="theme-a grid min-h-dvh place-items-center bg-[#0e0a07] p-5 text-fg" style={{ fontFamily: 'Cairo, system-ui, sans-serif' }}>
      <div className="w-full max-w-sm">
        <div className="mb-5 flex flex-col items-center gap-2 text-white">
          <Logo size={84} />
          <h1 className="text-[22px] font-extrabold">لوحة فرايدي</h1>
        </div>
        {!configured ? (
          <div className="space-y-3 rounded-[22px] bg-surface p-5">
            <p className="text-[16px] font-extrabold">اللوحة بعدها ما مفعّلة</p>
            <p className="text-[14.5px] leading-7 text-muted">
              لازم تضيف كلمة السر بإعدادات Cloudflare أول. افتح صفحة توليد كلمة السر، انسخ الرمز، وحطه بإعدادات المشروع باسم{' '}
              <bdi dir="ltr" className="font-bold text-fg">ADMIN_PASSWORD_HASH</bdi>.
            </p>
            <a href="#/password" className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-cta font-bold text-on-cta"><KeyRound size={18} /> توليد كلمة السر</a>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3 rounded-[22px] bg-surface p-5">
            <label className="block">
              <span className="mb-1.5 block text-[15px] font-bold">كلمة السر</span>
              <span className="relative block">
                <input type={show ? 'text' : 'password'} value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" autoFocus dir="ltr" className={`${inputCls} ps-12 text-end`} />
                <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'إخفاء كلمة السر' : 'إظهار كلمة السر'} className="absolute top-0 left-0 grid size-12 place-items-center text-muted">
                  {show ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </span>
            </label>
            {err && <p role="alert" className="text-[14px] font-semibold text-danger">{err}</p>}
            <Btn type="submit" busy={busy} disabled={!pw} className="w-full">دخول</Btn>
            <a href="#/password" className="block pt-1 text-center text-[13px] font-semibold text-muted underline underline-offset-4">نسيت كلمة السر؟ ولّد وحدة جديدة</a>
          </form>
        )}
      </div>
    </div>
  );
}
