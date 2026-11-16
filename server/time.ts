/** المطعم بتوقيت بغداد (UTC+3 بدون توقيت صيفي) */
export const BAGHDAD_OFFSET_MIN = 180;

/** تاريخ اليوم بتوقيت بغداد: "2026-11-16" — العداد اليومي يبدي من 1001 كل يوم */
export function baghdadDay(now: Date = new Date()): string {
  return new Date(now.getTime() + BAGHDAD_OFFSET_MIN * 60_000).toISOString().slice(0, 10);
}

/** "خالص اليوم" → يرجع متوفر الساعة 6 الصبح بتوقيت بغداد الجاية */
export function nextSixAmBaghdad(now: Date = new Date()): Date {
  const local = new Date(now.getTime() + BAGHDAD_OFFSET_MIN * 60_000);
  const target = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate(), 6, 0, 0));
  if (local.getUTCHours() >= 6) target.setUTCDate(target.getUTCDate() + 1);
  return new Date(target.getTime() - BAGHDAD_OFFSET_MIN * 60_000);
}
