const nf = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

/** 12500 → "12,500" (أرقام لاتينية بفواصل) */
export const fmt = (n: number) => nf.format(Math.round(n));

/** 12500 → "12,500 د.ع" */
export const fmtIQD = (n: number) => `${fmt(n)} د.ع`;

/** يحوّل الأرقام العربية/الفارسية إلى لاتينية */
export function toLatinDigits(s: string): string {
  return s
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
}

/** رابط صورة صنف — sm = نسخة صغيرة للقوائم */
export function photo(file: string, size: 'sm' | 'lg' = 'lg'): string {
  return `${import.meta.env.BASE_URL}photos/${size === 'sm' ? 'sm/' : ''}${file}`;
}
