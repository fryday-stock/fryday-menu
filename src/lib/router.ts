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
  return () => window.removeEventListener('hashchange', on);
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

export function go(path: string, opts: { replace?: boolean } = {}) {
  const url = `#/${path.replace(/^\//, '')}`;
  if (opts.replace) window.location.replace(url);
  else window.location.hash = url;
}

/** رجوع: إذا ماكو تاريخ داخل التطبيق يروح للمسار البديل */
export function back(fallback: string) {
  if (window.history.state?.__depth > 0 || window.history.length > 1) {
    const before = window.location.hash;
    window.history.back();
    // إذا ما تغير شي (فتح الرابط مباشرة) نروح للبديل
    setTimeout(() => { if (window.location.hash === before) go(fallback, { replace: true }); }, 120);
  } else go(fallback, { replace: true });
}
