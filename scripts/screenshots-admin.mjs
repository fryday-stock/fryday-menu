/**
 * لقطات لوحة الإدارة (390×844) — يحتاج السيرفر المحلي:
 *   npm run build && npx wrangler pages dev dist --d1 DB --r2 MEDIA --port 8788
 *   ADMIN_PW=... node scripts/screenshots-admin.mjs [baseUrl] [outDir]
 * (كلمة السر المحلية بملف .dev.vars — مو بالكود)
 */
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
let pw;
try { pw = require('playwright'); } catch { pw = require(require('node:child_process').execSync('npm root -g').toString().trim() + '/playwright'); }
const { chromium } = pw;

const base = (process.argv[2] ?? 'http://localhost:8788/').replace(/\/?$/, '/');
const out = process.argv[3] ?? 'screenshots/phase1';
const scale = Number(process.env.SCALE ?? 2);
mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: scale, locale: 'ar-IQ', hasTouch: true, isMobile: true });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('pageerror', e.message));
const shot = async (name, wait = 900) => {
  await page.waitForTimeout(wait);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: `${out}/${name}.png` });
  console.log('✔', `${name}.png`);
};
const nav = async (hash, wait = 700) => { await page.goto(`${base}admin/#/${hash}`); await page.waitForTimeout(wait); };

await nav('');
await shot('admin-login');
await page.fill('input[type=password]', process.env.ADMIN_PW ?? '');
await page.getByRole('button', { name: 'دخول' }).click();
await page.waitForTimeout(1500);
await shot('admin-orders');
await page.locator('main li button').first().click().catch(() => {});
await shot('admin-order-open', 500);
await nav('menu');
await shot('admin-menu');
await nav('item/F001');
await shot('admin-item');
await nav('settings');
await shot('admin-settings');
await page.evaluate(() => window.scrollTo(0, 1500));
await shot('admin-settings-delivery', 400);
await nav('zones', 600);
await page.waitForLoadState('networkidle').catch(() => {});
await shot('admin-zones', 2500);
await nav('more');
await shot('admin-more');
await nav('excel');
await shot('admin-excel');
if (process.env.XLSX) {
  await page.locator('input[type=file]').setInputFiles(process.env.XLSX);
  await shot('admin-excel-review', 2000);
}
if (process.env.PHASE2) {
  await nav('banner', 900);
  await shot('admin-banner');
  await page.evaluate(() => window.scrollTo(0, 900));
  await shot('admin-banner-2', 500);
  await nav('sales', 900);
  await shot('admin-sales');
  await nav('season', 700);
  await shot('admin-season');
  await nav('menu', 700);
  await shot('admin-menu-stars');
} else {
  await nav('password');
  await shot('admin-password');
}
await browser.close();
