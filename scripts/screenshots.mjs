/**
 * لقطات شاشة (390×844): الرئيسية، صنف (بركر فرايدي)، السلة (3 أصناف)، شاشة الطلب ويا الخريطة.
 * الاستخدام:  npm run build && npx vite preview --port 4173 &   ثم   node scripts/screenshots.mjs [baseUrl] [outDir]
 * EXTRA=1 لقطات إضافية للمراجعة.  SCALE=1 لقطات أخف.
 */
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
let pw;
try { pw = require('playwright'); } catch { pw = require(require('node:child_process').execSync('npm root -g').toString().trim() + '/playwright'); }
const { chromium } = pw;

const base = process.argv[2] ?? 'http://localhost:4173/';
const out = process.argv[3] ?? 'screenshots/final';
const scale = Number(process.env.SCALE ?? 2);
mkdirSync(out, { recursive: true });

const cart = {
  state: {
    lines: [
      { key: 'k1', itemId: 'F001', qty: 2, sel: { MEAL: ['MEAL-1'] }, note: 'بدون بصل' },
      { key: 'k2', itemId: 'F024', qty: 1, sel: { PIZZA_B: ['PIZZA_B-2'] }, note: '' },
      { key: 'k3', itemId: 'D035', qty: 1, sel: {}, note: '' },
    ],
  },
  version: 1,
};
const customer = { state: { c: { type: 'delivery', name: 'أحمد علي', phone: '07801234567', zoneId: '', address: 'حي الأمير، شارع 20', landmark: 'قرب جامع الحسن', pin: null } }, version: 1 };

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 }, deviceScaleFactor: scale, locale: 'ar-IQ', hasTouch: true, isMobile: true,
  geolocation: { latitude: 32.0262, longitude: 44.3365 }, permissions: ['geolocation'],
});
// وقت ثابت: 7:30 بالليل بتوقيت بغداد (المطعم مفتوح) — نزيّف Date بس حتى الحركات تشتغل
await ctx.addInitScript((target) => {
  const D = Date;
  const off = target - D.now();
  class FakeDate extends D {
    constructor(...a) { if (a.length) super(...a); else super(D.now() + off); }
    static now() { return D.now() + off; }
  }
  globalThis.Date = FakeDate;
}, new Date('2026-11-16T19:30:00+03:00').getTime());
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('pageerror', e.message));

const shot = async (name, wait = 900) => {
  await page.waitForTimeout(wait);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: `${out}/${name}.png` });
  console.log('✔', `${name}.png`);
};
const nav = async (hash, wait) => { await page.goto(`${base}#/${hash}`); if (wait) await page.waitForTimeout(wait); };

// الرئيسية
await nav('');
await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
await page.reload();
await shot('home', 1400);

// صنف
await nav('item/F001');
await shot('item');

// السلة
await page.evaluate(([c, cu]) => { localStorage.setItem('fryday:cart', c); localStorage.setItem('fryday:customer', cu); }, [JSON.stringify(cart), JSON.stringify(customer)]);
await nav('', 300);
await page.reload();
await nav('cart');
await shot('cart');

// شاشة الطلب ويا الخريطة
await nav('checkout', 900);
await page.getByRole('button', { name: 'حدد موقعي على الخريطة' }).click();
await page.waitForLoadState('networkidle').catch(() => {});
await shot('checkout-map', 3500);

if (process.env.EXTRA) {
  await page.getByRole('button', { name: 'أكّد الموقع هنا' }).click();
  await page.locator('[role=dialog] .overflow-y-auto').first().evaluate((el) => el.scrollTo(0, 0));
  await shot('checkout-confirmed');
  await page.locator('[role=dialog] .overflow-y-auto').first().evaluate((el) => el.scrollTo(0, el.scrollHeight));
  await shot('checkout-bottom', 500);
  await page.getByText('راجع وأكّد الطلب').click();
  await shot('done', 1300);
  await nav('', 1200);
  await page.evaluate(() => window.scrollTo(0, 230));
  await shot('home-scroll-1');
  await page.evaluate(() => window.scrollTo(0, 900));
  await shot('home-scroll-2');
  await nav('item/F024');
  await shot('item-pizza');
}
await browser.close();
