/**
 * لقطات المرحلة 2 (390×844): الرأس بالأوقات الثلاث + الحر، نافذة الوجبة، السلة ويا الاقتراحات،
 * الأكثر طلباً، الطلب السابق، القطة. يحتاج السيرفر المحلي (wrangler) — أو أي نسخة منشورة.
 *   node scripts/screenshots-phase2.mjs [baseUrl] [outDir]
 */
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
let pw;
try { pw = require('playwright'); } catch { pw = require(require('node:child_process').execSync('npm root -g').toString().trim() + '/playwright'); }
const { chromium } = pw;

const base = (process.argv[2] ?? 'http://localhost:8788/').replace(/\/?$/, '/');
const out = process.argv[3] ?? 'screenshots/phase2';
const scale = Number(process.env.SCALE ?? 2);
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();

async function session(time, setup) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: scale, locale: 'ar-IQ', hasTouch: true, isMobile: true });
  await ctx.addInitScript((target) => {
    const D = Date;
    const off = target - D.now();
    class FakeDate extends D { constructor(...a) { if (a.length) super(...a); else super(D.now() + off); } static now() { return D.now() + off; } }
    globalThis.Date = FakeDate;
  }, new Date(`2026-11-17T${time}:00+03:00`).getTime());
  if (setup) await ctx.addInitScript(setup);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('pageerror', e.message));
  return { ctx, page };
}
const shot = async (page, name, wait = 1200) => {
  await page.waitForTimeout(wait);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: `${out}/${name}.png` });
  console.log('✔', name);
};

// الرأس بالأوقات الثلاث + الحر
for (const [name, time, hash] of [['hero-lunch', '13:10', ''], ['hero-afternoon', '17:30', ''], ['hero-evening', '21:15', ''], ['hero-hot', '13:10', '?preview=hot'], ['hero-cold', '21:15', '?preview=cold']]) {
  const { ctx, page } = await session(time, () => { try { localStorage.clear(); sessionStorage.clear(); } catch {} });
  await page.goto(`${base}#/${hash}`);
  await shot(page, name, 2600);
  await ctx.close();
}

// الأكثر طلباً + الطلب السابق
{
  const past = { state: { past: { total: 19000, at: Date.now() - 86400000, lines: [
    { itemId: 'F001', qty: 1, sel: { MEAL: ['MEAL-1'] }, note: '', unit: 13000, name: 'بركر فرايدي' },
    { itemId: 'D035', qty: 1, sel: {}, note: '', unit: 5000, name: 'آيس لاتيه' },
  ] } }, version: 1 };
  const { ctx, page } = await session('13:10', (p) => { localStorage.setItem('fryday:past-order', p); }, JSON.stringify(past));
  await page.addInitScript((p) => localStorage.setItem('fryday:past-order', p), JSON.stringify(past));
  await page.goto(`${base}#/`);
  await page.waitForTimeout(1500);
  await page.evaluate(() => window.scrollTo(0, 560));
  await shot(page, 'featured-past-order', 900);
  // اطلبه ثاني → السلة ويا الاقتراحات
  await page.getByRole('button', { name: /اطلبه ثاني/ }).click();
  await shot(page, 'reorder-cart', 1300);
  await ctx.close();
}

// نافذة الوجبة + القطة
{
  const { ctx, page } = await session('13:10', () => { try { localStorage.clear(); } catch {} });
  await page.goto(`${base}#/item/F001`);
  await page.waitForTimeout(1500);
  await page.getByRole('button', { name: /أضف للسلة/ }).click();
  await page.waitForTimeout(480);
  await page.screenshot({ path: `${out}/cat-jump.png` });
  console.log('✔ cat-jump');
  await shot(page, 'meal-upsell', 1300);
  await page.getByRole('button', { name: /نعم، خليها وجبة/ }).click();
  await page.waitForTimeout(500);
  // نضيف بطاطا (بدون صلصة) حتى تطلع اقتراحات الصلصة
  await page.goto(`${base}#/item/F060`);
  await page.waitForTimeout(1200);
  await page.getByRole('button', { name: /أضف للسلة/ }).click();
  await page.waitForTimeout(600);
  await page.goto(`${base}#/cart`);
  await page.waitForTimeout(800);
  await page.locator('#sug-h').scrollIntoViewIfNeeded().catch(() => {});
  await shot(page, 'cart-suggestions', 900);
  await ctx.close();
}
await browser.close();
