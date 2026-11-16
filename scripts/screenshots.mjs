/**
 * لقطات شاشة لكل نموذج (390×844): الرئيسية، صنف (بركر فرايدي)، السلة (3 أصناف)، شاشة الطلب.
 * الاستخدام:  npm run build && npx vite preview --port 4173 &  ثم  node scripts/screenshots.mjs [baseUrl] [outDir] [themes]
 */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let pw;
try { pw = require('playwright'); } catch { pw = require(require('node:child_process').execSync('npm root -g').toString().trim() + '/playwright'); }
const { chromium } = pw;
import { mkdirSync } from 'node:fs';

const base = process.argv[2] ?? 'http://localhost:4173/';
const out = process.argv[3] ?? 'screenshots/phase0';
const themes = (process.argv[4] ?? 'a,b,c,d').split(',');
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
const customer = { state: { c: { type: 'delivery', name: 'أحمد علي', phone: '07801234567', zoneId: 'z1', address: 'حي الأمير، شارع 20', landmark: 'قرب جامع الحسن' } }, version: 1 };

const browser = await chromium.launch();
for (const t of themes) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: scale, locale: 'ar-IQ', hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  // نخفي زر تبديل النماذج من اللقطات (أداة تجربة مو جزء من التصميم)
  await ctx.addInitScript(() => {
    document.addEventListener('DOMContentLoaded', () => {
      const st = document.createElement('style');
      st.textContent = '[data-proto]{display:none!important}';
      document.head.appendChild(st);
    });
  });
  // وقت ثابت: 7:30 بالليل بتوقيت بغداد (المطعم مفتوح)
  // نزيّف Date فقط (مو performance.now) حتى الحركات تشتغل طبيعي
  await ctx.addInitScript((target) => {
    const D = Date;
    const off = target - D.now();
    class FakeDate extends D {
      constructor(...a) { if (a.length) super(...a); else super(D.now() + off); }
      static now() { return D.now() + off; }
    }
    globalThis.Date = FakeDate;
  }, new Date('2026-11-16T19:30:00+03:00').getTime());
  const shot = async (name) => {
    await page.waitForTimeout(900);
    await page.evaluate(() => document.fonts.ready);
    if (process.env.DEBUG) console.log(name, await page.evaluate(() => location.hash), await page.locator('[role=dialog]').count());
    await page.screenshot({ path: `${out}/${t}-${name}.png` });
    console.log('✔', `${t}-${name}.png`);
  };

  // الرئيسية (سلة فاضية)
  await page.goto(`${base}#/${t}`);
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.goto(`${base}#/${t}`);
  await page.reload();
  await shot('home');

  // صنف
  await page.goto(`${base}#/${t}/item/F001`);
  await shot('item');

  // السلة: 3 أصناف
  await page.evaluate(([c, cu]) => { localStorage.setItem('fryday:cart', c); localStorage.setItem('fryday:customer', cu); }, [JSON.stringify(cart), JSON.stringify(customer)]);
  await page.goto(`${base}#/${t}`);
  await page.reload();
  await page.goto(`${base}#/${t}/cart`);
  await shot('cart');

  await page.goto(`${base}#/${t}/checkout`);
  await shot('checkout');

  if (process.env.EXTRA) {
    await page.goto(`${base}#/${t}`);
    await page.waitForTimeout(1200);
    await page.evaluate(() => window.scrollTo(0, 1000));
    await shot('home-scrolled');
    await page.goto(`${base}#/${t}/item/F024`);
    await shot('item-pizza');
    await page.goto(`${base}#/${t}/item/F077`);
    await page.waitForTimeout(500);
    await page.locator('[role=dialog] button[role=checkbox]').first().click();
    await shot('item-appet');
    await page.goto(`${base}#/${t}/item/S025`);
    await shot('item-cake');
    await page.goto(`${base}#/${t}`);
    await page.waitForTimeout(700);
    await page.locator('input[type=search]').fill('برغر');
    await page.evaluate(() => window.scrollTo(0, 0));
    await shot('search');
    await page.locator('input[type=search]').fill('');
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: 'المقبلات', exact: true }).first().click().catch((e) => console.log('chip', e.message));
    await page.waitForTimeout(400);
    await shot('text-rows');
    await page.goto(`${base}#/${t}/checkout`);
    await page.waitForTimeout(600);
    await page.getByText("راجع وأكّد الطلب").click();
    await page.waitForTimeout(800);
    await shot('done');
  }
  await ctx.close();
}
await browser.close();
