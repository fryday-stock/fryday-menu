import type { Settings } from '../data/types';

const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + (m || 0);
};

/** الدقيقة الحالية من اليوم بتوقيت المطعم (بغداد UTC+3 بدون توقيت صيفي) */
export function localMinutes(now: Date, utcOffset: number): number {
  const m = now.getUTCHours() * 60 + now.getUTCMinutes() + utcOffset * 60;
  return ((m % 1440) + 1440) % 1440;
}

/** مفتوح؟ يدعم الإغلاق بعد نص الليل (مثلاً 12:00 → 02:00) و"24:00" = نص الليل */
export function isOpenAt(now: Date, hours: Settings['hours']): boolean {
  const cur = localMinutes(now, hours.utcOffset);
  const open = toMin(hours.open);
  let close = toMin(hours.close);
  if (close === 0) close = 1440;
  if (open === close) return true;
  if (open < close) return cur >= open && cur < close;
  return cur >= open || cur < close; // يعبر نص الليل
}

/** "12:00" → "12 الظهر" — نص عربي مختصر */
export function hourLabel(hhmm: string): string {
  const h = toMin(hhmm) / 60;
  const hh = Math.floor(h) % 24;
  if (hh === 0) return '12 بالليل';
  if (hh === 12) return '12 الظهر';
  if (hh < 12) return `${hh} الصبح`;
  if (hh < 17) return `${hh - 12} العصر`;
  return `${hh - 12} بالليل`;
}

export function hoursText(hours: Settings['hours']): string {
  return `${hourLabel(hours.open)} — ${hourLabel(hours.close)}`;
}

/** وقت الوصول المتوقع (مثل "9:40") */
export function etaClock(now: Date, minutes: number, utcOffset: number): string {
  const m = (localMinutes(now, utcOffset) + minutes) % 1440;
  let h = Math.floor(m / 60) % 12;
  if (h === 0) h = 12;
  return `${h}:${String(m % 60).padStart(2, '0')}`;
}
