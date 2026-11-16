/** المرحلة 0: عداد محلي على جهاز الزبون يبدأ من 1001.
 *  (بالمرحلة 1 ينحسب بالسيرفر — عداد يومي بتوقيت بغداد) */
const KEY = 'fryday:order-counter';

export function nextLocalOrderNumber(): number {
  let n = 1000;
  try { n = Number(localStorage.getItem(KEY)) || 1000; } catch { /* private mode */ }
  n = n >= 9999 ? 1001 : n + 1;
  try { localStorage.setItem(KEY, String(n)); } catch { /* ignore */ }
  return n;
}
