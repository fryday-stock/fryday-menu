import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react';
import { LoaderCircle } from 'lucide-react';

export function Card({ children, className = '', title, action }: { children: ReactNode; className?: string; title?: ReactNode; action?: ReactNode }) {
  return (
    <section className={`rounded-[20px] bg-surface p-4 shadow-card ${className}`}>
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          {title && <h2 className="text-[17px] font-extrabold">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'dark' | 'ghost' | 'danger' | 'soft'; busy?: boolean; size?: 'md' | 'sm' };
export function Btn({ variant = 'dark', busy, size = 'md', className = '', children, disabled, ...rest }: BtnProps) {
  const v = {
    primary: 'bg-primary text-on-primary',
    dark: 'bg-cta text-on-cta',
    ghost: 'border border-line bg-surface text-fg',
    danger: 'border border-danger/30 bg-danger/8 text-danger',
    soft: 'bg-surface-2 text-fg',
  }[variant];
  const s = size === 'sm' ? 'h-10 px-3.5 text-[14px] rounded-xl' : 'h-12 px-5 text-[15.5px] rounded-2xl';
  return (
    <button {...rest} disabled={disabled || busy} className={`inline-flex items-center justify-center gap-2 font-bold transition active:scale-[0.97] disabled:opacity-45 ${s} ${v} ${className}`}>
      {busy && <LoaderCircle size={17} className="animate-spin" />}
      {children}
    </button>
  );
}

export function Field({ label, hint, error, children, className = '' }: { label: ReactNode; hint?: ReactNode; error?: string | null; children: ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-[14px] font-bold">{label}</span>
      {children}
      {error ? <span role="alert" className="mt-1 block text-[13px] font-semibold text-danger">{error}</span> : hint ? <span className="mt-1 block text-[12.5px] text-muted">{hint}</span> : null}
    </label>
  );
}

export const inputCls = 'h-12 w-full rounded-xl border border-line bg-surface px-3.5 text-[16px] outline-none focus:border-fg/50';

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputCls} ${props.className ?? ''}`} />;
}

export function NumInput({ value, onChange, ...rest }: Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> & { value: number | null; onChange: (n: number | null) => void }) {
  return (
    <input {...rest} dir="ltr" inputMode="numeric" value={value ?? ''} onChange={(e) => {
      const d = e.target.value.replace(/[٠-٩]/g, (x) => String(x.charCodeAt(0) - 0x0660)).replace(/[^\d-]/g, '');
      onChange(d === '' ? null : Number(d));
    }} className={`${inputCls} text-end ${rest.className ?? ''}`} />
  );
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={2} {...props} className={`w-full resize-none rounded-xl border border-line bg-surface px-3.5 py-2.5 text-[16px] outline-none focus:border-fg/50 ${props.className ?? ''}`} />;
}

export function Toggle({ checked, onChange, label, hint, tone = 'ok' }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode; hint?: ReactNode; tone?: 'ok' | 'warn' | 'danger' }) {
  const on = { ok: 'bg-ok', warn: 'bg-[#d97706]', danger: 'bg-danger' }[tone];
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className="flex min-h-12 w-full items-center gap-3 py-1.5 text-start">
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-bold">{label}</span>
        {hint && <span className="block text-[12.5px] leading-5 text-muted">{hint}</span>}
      </span>
      <span className={`relative h-7 w-12 shrink-0 rounded-full transition ${checked ? on : 'bg-line'}`}>
        <span className={`absolute top-1 size-5 rounded-full bg-white shadow transition-all ${checked ? 'right-6' : 'right-1'}`} />
      </span>
    </button>
  );
}

export function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: [T, ReactNode][] }) {
  return (
    <div role="radiogroup" className="grid gap-1 rounded-2xl bg-surface-2 p-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map(([v, label]) => (
        <button key={v} type="button" role="radio" aria-checked={value === v} onClick={() => onChange(v)}
          className={`min-h-11 rounded-xl px-2 text-[14px] font-bold transition ${value === v ? 'bg-surface text-fg shadow-sm' : 'text-muted'}`}>
          {label}
        </button>
      ))}
    </div>
  );
}

export function Badge({ children, tone = 'muted' }: { children: ReactNode; tone?: 'muted' | 'ok' | 'warn' | 'danger' | 'dark' }) {
  const t = { muted: 'bg-surface-2 text-muted', ok: 'bg-ok/12 text-ok', warn: 'bg-[#fef3c7] text-[#92400e]', danger: 'bg-danger/10 text-danger', dark: 'bg-cta text-on-cta' }[tone];
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[12px] font-bold whitespace-nowrap ${t}`}>{children}</span>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-2xl border-2 border-dashed border-line p-6 text-center text-[14.5px] text-muted">{children}</p>;
}

export function PageTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h1 className="text-[22px] font-extrabold">{children}</h1>
      {action}
    </div>
  );
}
