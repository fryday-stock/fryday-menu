import { toLatinDigits } from './format';

/** يرجع الرقم بعد التنظيف: أرقام لاتينية فقط، ويحوّل +964 / 964 إلى 0 */
export function cleanPhone(raw: string): string {
  let d = toLatinDigits(raw).replace(/\D/g, '');
  if (d.startsWith('00964')) d = '0' + d.slice(5);
  else if (d.startsWith('964')) d = '0' + d.slice(3);
  else if (d.length === 10 && d.startsWith('7')) d = '0' + d;
  return d;
}

/** موبايل عراقي: 11 رقم يبدي بـ 07 */
export const isValidPhone = (p: string) => /^07\d{9}$/.test(cleanPhone(p));
