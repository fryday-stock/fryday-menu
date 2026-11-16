/** شعار فرايدي الرسمي (assets-input/logo-fryday.webp → public/brand/) */
const base = import.meta.env.BASE_URL;

interface Props {
  size?: number;
  /** badge = دائرة بيضاء والشعار داخلها (للرؤوس) · mark = الشعار وحده (للمساحات الكبيرة) */
  variant?: 'badge' | 'mark';
  /** حلقة بيضاء خارجية (قديم — يبقى للتوافق) */
  ring?: boolean;
  className?: string;
}

export function Logo({ size = 56, variant = 'badge', className = '' }: Props) {
  if (variant === 'mark') {
    return (
      <img src={`${base}brand/logo.webp`} alt="شعار فرايدي FRY DAY" width={size} height={size} decoding="async"
        className={`object-contain drop-shadow-[0_10px_18px_rgba(0,0,0,0.18)] ${className}`} style={{ width: size, height: size }} />
    );
  }
  return (
    <span className={`inline-grid shrink-0 place-items-center rounded-full bg-white shadow-[0_6px_16px_-8px_rgba(0,0,0,0.35)] ring-1 ring-black/5 ${className}`} style={{ width: size, height: size }}>
      <img src={`${base}brand/logo-sm.webp`} alt="شعار فرايدي FRY DAY" decoding="async" className="object-contain" style={{ width: size * 0.7, height: size * 0.7 }} />
    </span>
  );
}
