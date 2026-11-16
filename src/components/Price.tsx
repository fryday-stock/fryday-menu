import { fmt } from '../lib/format';

/** سعر بأرقام ثابتة الاتجاه (ما تنقلب بالـ RTL) */
export function Price({ value, unit = true, className = '', unitClassName = '' }: { value: number; unit?: boolean; className?: string; unitClassName?: string }) {
  return (
    <span className={`inline-flex items-baseline gap-1 whitespace-nowrap ${className}`}>
      <bdi className="num">{fmt(value)}</bdi>
      {unit && <span className={`text-[0.72em] font-medium opacity-80 ${unitClassName}`}>د.ع</span>}
    </span>
  );
}
