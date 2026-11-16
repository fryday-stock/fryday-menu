import { useState } from 'react';
import { Copy, Check, ShieldCheck, ArrowRight } from 'lucide-react';
import { Logo } from '../../components/Logo';
import { Btn, Field, inputCls } from '../ui';

/** نفس صيغة السيرفر: pbkdf2-sha256 + عدد التكرارات + salt + hash */
async function makeHash(password: string): Promise<string> {
  const iterations = 30_000; // مناسب لحد CPU بخطة Cloudflare المجانية (والسيرفر يقبل لحد 100k)
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256));
  const b64 = (u: Uint8Array) => btoa(String.fromCharCode(...u));
  return ['pbkdf2-sha256', iterations, b64(salt), b64(bits)].join('$');
}

/**
 * توليد hash كلمة السر — يشتغل كله داخل متصفح أحمد، كلمة السر ما تنرسل لأي مكان.
 * الناتج ينحط بإعدادات Cloudflare باسم ADMIN_PASSWORD_HASH.
 */
export function PasswordGen() {
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [hash, setHash] = useState('');
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const tooShort = a.length > 0 && a.length < 10;
  const mismatch = b.length > 0 && a !== b;
  const can = a.length >= 10 && a === b;

  const gen = async () => {
    setBusy(true);
    setHash(await makeHash(a));
    setA('');
    setB('');
    setBusy(false);
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(hash); } catch { /* المستخدم ينسخ يدوي */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="theme-a min-h-dvh bg-bg p-5 text-fg" style={{ fontFamily: 'Cairo, system-ui, sans-serif' }}>
      <div className="mx-auto max-w-md space-y-4">
        <div className="flex items-center gap-3"><Logo size={52} /><h1 className="text-[21px] font-extrabold">توليد كلمة سر اللوحة</h1></div>
        <div className="flex gap-2.5 rounded-2xl bg-ok/10 p-3.5 text-[14px] leading-7 text-ok">
          <ShieldCheck size={22} className="mt-1 shrink-0" />
          <p>كلمة السر تتحول هنا داخل موبايلك لرمز مشفّر — <b>ما تنرسل لأي مكان</b> ولا تنحفظ. الرمز هو اللي تحطه بإعدادات Cloudflare، وكلمة السر نفسها تبقى براسك بس.</p>
        </div>
        {!hash ? (
          <div className="space-y-3 rounded-[20px] bg-surface p-4 shadow-card">
            <Field label="كلمة السر الجديدة" hint="10 حروف أو أكثر. خلّيها صعبة (حروف وأرقام ورموز)." error={tooShort ? 'قصيرة — لازم 10 أو أكثر' : null}>
              <input type="password" dir="ltr" autoComplete="new-password" value={a} onChange={(e) => setA(e.target.value)} className={`${inputCls} text-end`} />
            </Field>
            <Field label="أعد كتابتها" error={mismatch ? 'ما متطابقة' : null}>
              <input type="password" dir="ltr" autoComplete="new-password" value={b} onChange={(e) => setB(e.target.value)} className={`${inputCls} text-end`} />
            </Field>
            <Btn onClick={gen} disabled={!can} busy={busy} className="w-full">ولّد الرمز</Btn>
          </div>
        ) : (
          <div className="space-y-3 rounded-[20px] bg-surface p-4 shadow-card">
            <p className="text-[15px] font-bold">الرمز جاهز — انسخه:</p>
            <textarea readOnly dir="ltr" value={hash} rows={4} onFocus={(e) => e.currentTarget.select()} className="w-full rounded-xl border border-line bg-surface-2 p-3 font-mono text-[12.5px] break-all" />
            <Btn onClick={copy} variant="primary" className="w-full">{copied ? <><Check size={18} /> تم النسخ</> : <><Copy size={18} /> انسخ الرمز</>}</Btn>
            <ol className="list-decimal space-y-1 ps-5 text-[14px] leading-7 text-muted">
              <li>بـ Cloudflare: المشروع ← <b>Settings</b> ← <b>Variables and Secrets</b> ← <b>Add</b>.</li>
              <li>النوع <b>Secret</b>، الاسم <bdi dir="ltr" className="font-bold text-fg">ADMIN_PASSWORD_HASH</bdi>، والقيمة الرمز اللي نسخته.</li>
              <li>احفظ، وبعدها سوّي <b>Retry deployment</b> لآخر نشر.</li>
            </ol>
            <Btn variant="ghost" onClick={() => setHash('')} className="w-full">ولّد رمز جديد</Btn>
          </div>
        )}
        <a href="#/" className="inline-flex h-11 items-center gap-1.5 text-[14px] font-bold text-muted"><ArrowRight size={16} /> رجوع للدخول</a>
      </div>
    </div>
  );
}
