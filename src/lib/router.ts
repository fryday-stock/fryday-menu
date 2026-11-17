import { useSyncExternalStore } from 'react';

/** راوتر hash بسيط: #/a/item/F001 → ['a','item','F001'] */
function read(): string[] {
  const h = window.location.hash.replace(/^#\/?/, '').split('?')[0];
  return h.split('/').filter(Boolean).map(decodeURIComponent);
}

let cached = read();
let cachedHash = window.location.hash;
function subscribe(cb: () => void) {
  const on = () => cb();
  window.addEventListener('hashchange', on);
  window.addEventListener('popstate', on);
  return () => { window.removeEventListener('hashchange', on); window.removeEventListener('popstate', on); };
}
function snapshot() {
  if (window.location.hash !== cachedHash) {
    cachedHash = window.location.hash;
    cached = read();
  }
  return cached;
}

export function useRoute(): string[] {
  return useSyncExternalStore(subscribe, snapshot);
}

/** عمق التنقل داخل الموقع (محفوظ بـ history.state) — حتى "رجوع" ما يطلّع الزبون برا الموقع */
const depth = (): number => (window.history.state as { fdDepth?: number } | null)?.fdDepth ?? 0;

export function go(path: string, opts: { replace?: boolean } = {}) {
  const url = `#/${path.replace(/^\//, '')}`;
  if (url === window.location.hash) return;
  if (opts.replace) window.history.replaceState({ fdDepth: depth() }, '', url);
  else window.history.pushState({ fdDepth: depth() + 1 }, '', url);
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

/**
 * رجوع: إذا الزبون وصل لهالصفحة من داخل الموقع نرجع خطوة،
 * وإذا فتحها من رابط مباشر (مشاركة) نوديه للمسار البديل بدل ما يطلع من الموقع.
 */
export function back(fallback: string) {
  if (depth() > 0) window.history.back();
  else go(fallback, { replace: true });
}
