import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { createHash } from 'node:crypto';

/**
 * يولّد service worker (sw.js) بعد البناء: يحفظ واجهة المنيو والخطوط حتى يفتح بنت ضعيف أو بدون نت.
 * (بدون مكتبات إضافية — قائمة الملفات من البناء نفسه)
 */
function serviceWorker(): Plugin {
  return {
    name: 'fryday-sw',
    apply: 'build',
    generateBundle(_, bundle) {
      const files = Object.keys(bundle).filter((f) => !f.startsWith('admin') && !/admin|ZoneMap|Excel|\.map$/.test(f) && !f.endsWith('.html') && !f.includes('MapPicker') && !f.includes('leaflet'));
      // الخطوط: بس العربي/اللاتيني woff2
      const precache = ['./', './manifest.webmanifest', './brand/logo-sm.webp', './favicon.png', ...files.filter((f) => !f.endsWith('.woff')).map((f) => `./${f}`)];
      const version = createHash('sha256').update(precache.join('|')).digest('hex').slice(0, 10);
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: SW_SOURCE.replace('__VERSION__', version).replace('__PRECACHE__', JSON.stringify(precache)) });
    },
  };
}

const SW_SOURCE = `/* فرايدي — service worker (مولّد تلقائياً) */
const VERSION = '__VERSION__';
const SHELL = 'fryday-shell-' + VERSION;
const PHOTOS = 'fryday-photos-v1';
const API = 'fryday-api-v1';
const PRECACHE = __PRECACHE__;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('fryday-shell-') && k !== SHELL).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

async function trimPhotos() {
  const c = await caches.open(PHOTOS);
  const keys = await c.keys();
  for (let i = 0; i < keys.length - 250; i++) await c.delete(keys[i]);
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  const path = url.pathname;
  if (path.includes('/admin') || path.includes('/api/admin')) return;

  // المنيو من السيرفر: الشبكة أول، وإذا ماكو نت آخر نسخة محفوظة
  if (path.endsWith('/api/menu')) {
    e.respondWith(fetch(req).then((r) => { if (r.ok) { const cp = r.clone(); caches.open(API).then((c) => c.put(req, cp)); } return r; }).catch(() => caches.match(req).then((r) => r || Response.error())));
    return;
  }
  if (path.includes('/api/')) return;

  // الصور: من المحفوظ فوراً ونحدّث بالخلفية
  if (path.includes('/photos/') || path.includes('/media/') || path.includes('/brand/')) {
    e.respondWith(caches.open(PHOTOS).then(async (c) => {
      const hit = await c.match(req);
      const net = fetch(req).then((r) => { if (r.ok) { c.put(req, r.clone()); trimPhotos(); } return r; }).catch(() => hit);
      return hit || net;
    }));
    return;
  }

  // الصفحة: الشبكة أول (حتى التحديثات توصل)، وإذا ماكو نت النسخة المحفوظة
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).catch(() => caches.match('./', { ignoreSearch: true }).then((r) => r || caches.match(req))));
    return;
  }
  // ملفات البناء (أسماؤها فيها hash): المحفوظ أول
  e.respondWith(caches.match(req).then((r) => r || fetch(req)));
});
`;

// base نسبي: يشتغل على GitHub Pages (/fryday-menu/) وعلى Cloudflare (/) بدون تغيير
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss(), serviceWorker()],
  server: { host: true },
  build: {
    rollupOptions: {
      input: { main: 'index.html', admin: 'admin/index.html' },
    },
  },
});
