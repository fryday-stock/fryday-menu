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

/** مسار الموقع الأساسي (Vite) — بالسيرفر ماكو import.meta.env */
const BASE: string = (import.meta as unknown as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/';

/** مسار الملفات العامة (photos/ brand/) — لوحة الإدارة تحت /admin/ فتغيره لـ "../" */
export const assetBase = (): string => (globalThis as { __FRYDAY_BASE__?: string }).__FRYDAY_BASE__ ?? BASE;

/**
 * رابط صورة صنف — sm = نسخة صغيرة للقوائم.
 * يقبل اسم ملف (public/photos) أو مسار /media/... (صورة مرفوعة من اللوحة على R2) أو رابط كامل.
 */
export function photo(file: string, size: 'sm' | 'lg' = 'lg'): string {
  if (file.startsWith('/media/')) return size === 'sm' ? file.replace(/^\/media\/items\//, '/media/items/sm/') : file;
  if (/^(https?:|data:|blob:)/.test(file)) return file;
  return `${assetBase()}photos/${size === 'sm' ? 'sm/' : ''}${file}`;
}
