/**
 * دخول لوحة الإدارة:
 * - كلمة السر ما موجودة بالكود: أحمد يحط الـ hash مالها كـ secret بإعدادات Cloudflare (ADMIN_PASSWORD_HASH).
 * - جلسة بـ cookie آمنة (HttpOnly + Secure + SameSite=Strict)، والتوكن ينحفظ بالقاعدة كـ hash.
 * - محاولات محدودة: 5 محاولات غلط كل 15 دقيقة لكل جهاز.
 */
import type { Env } from './env';
import { HttpError, clientIp, sha256Hex } from './http';

export const COOKIE = '__Host-fryday_admin';
const SESSION_DAYS = 7;
const MAX_FAILS = 5;
const WINDOW_MIN = 15;
const PBKDF2_MAX_ITER = 100_000; // حد Cloudflare Workers

const b64 = (u: Uint8Array) => btoa(String.fromCharCode(...u));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

/** "pbkdf2-sha256$100000$<salt>$<hash>" — نفس الصيغة اللي تطلعها صفحة "توليد كلمة السر" باللوحة */
export async function pbkdf2(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256);
  return new Uint8Array(bits);
}

export async function hashPassword(password: string, iterations = 30_000): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return `pbkdf2-sha256$${iterations}$${b64(salt)}$${b64(await pbkdf2(password, salt, iterations))}`;
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a[i] ^ b[i];
  return d === 0;
}

export function isConfigured(env: Env): boolean {
  return !!(env.ADMIN_PASSWORD_HASH?.trim() || env.ADMIN_PASSWORD);
}

export async function verifyPassword(password: string, env: Env): Promise<boolean> {
  const stored = env.ADMIN_PASSWORD_HASH?.trim();
  if (stored) {
    const [algo, iter, salt, hash] = stored.split('$');
    const n = Number(iter);
    if (algo !== 'pbkdf2-sha256' || !(n > 0 && n <= PBKDF2_MAX_ITER) || !salt || !hash) throw new HttpError(500, 'bad_hash', 'صيغة ADMIN_PASSWORD_HASH غير صحيحة — ولّدها من جديد من صفحة توليد كلمة السر');
    return timingSafeEqual(await pbkdf2(password, unb64(salt), n), unb64(hash));
  }
  if (env.ADMIN_PASSWORD) {
    const enc = (s: string) => crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)).then((b) => new Uint8Array(b));
    return timingSafeEqual(await enc(password), await enc(env.ADMIN_PASSWORD));
  }
  return false;
}

function randomToken(): string {
  return b64(crypto.getRandomValues(new Uint8Array(32))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function readCookie(req: Request, name: string): string | null {
  const m = (req.headers.get('cookie') ?? '').split(/;\s*/).find((c) => c.startsWith(`${name}=`));
  return m ? decodeURIComponent(m.slice(name.length + 1)) : null;
}

export function sessionCookie(token: string, maxAge: number): string {
  return `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;
}

export async function login(req: Request, env: Env, password: string): Promise<string> {
  if (!isConfigured(env)) throw new HttpError(503, 'not_configured', 'كلمة سر اللوحة بعدها ما انضافت بإعدادات Cloudflare');
  const db = env.DB;
  const ipHash = (await sha256Hex(`login|${clientIp(req)}`)).slice(0, 24);
  const since = new Date(Date.now() - WINDOW_MIN * 60_000).toISOString();
  const fails = await db.prepare(`SELECT COUNT(*) AS n, MIN(at) AS first FROM login_attempts WHERE ip_hash = ? AND at > ?`).bind(ipHash, since).first<{ n: number; first: string | null }>();
  if ((fails?.n ?? 0) >= MAX_FAILS) {
    const wait = fails?.first ? Math.max(1, Math.ceil((new Date(fails.first).getTime() + WINDOW_MIN * 60_000 - Date.now()) / 60_000)) : WINDOW_MIN;
    throw new HttpError(429, 'locked', `محاولات غلط هواية — جرب بعد ${wait} دقيقة`);
  }
  if (typeof password !== 'string' || password.length > 200 || !(await verifyPassword(password, env))) {
    await db.prepare(`INSERT INTO login_attempts (ip_hash, at) VALUES (?, ?)`).bind(ipHash, new Date().toISOString()).run();
    const left = MAX_FAILS - (fails?.n ?? 0) - 1;
    throw new HttpError(401, 'wrong', left > 0 ? `كلمة السر غلط — باقي ${left} محاولات` : `كلمة السر غلط — انقفل الدخول ${WINDOW_MIN} دقيقة`);
  }
  const token = randomToken();
  const now = new Date();
  await db.batch([
    db.prepare(`DELETE FROM login_attempts WHERE ip_hash = ? OR at < ?`).bind(ipHash, since),
    db.prepare(`DELETE FROM sessions WHERE expires_at < ?`).bind(now.toISOString()),
    db.prepare(`INSERT INTO sessions (token_hash, created_at, expires_at) VALUES (?,?,?)`).bind(await sha256Hex(token), now.toISOString(), new Date(now.getTime() + SESSION_DAYS * 86400_000).toISOString()),
  ]);
  return sessionCookie(token, SESSION_DAYS * 86400);
}

export async function logout(req: Request, env: Env): Promise<string> {
  const t = readCookie(req, COOKIE);
  if (t) await env.DB.prepare(`DELETE FROM sessions WHERE token_hash = ?`).bind(await sha256Hex(t)).run();
  return sessionCookie('', 0);
}

export async function isAdmin(req: Request, env: Env): Promise<boolean> {
  const t = readCookie(req, COOKIE);
  if (!t || t.length > 100) return false;
  const row = await env.DB.prepare(`SELECT expires_at FROM sessions WHERE token_hash = ?`).bind(await sha256Hex(t)).first<{ expires_at: string }>();
  return !!row && row.expires_at > new Date().toISOString();
}

/** حماية من الطلبات المزورة (CSRF): الطلبات اللي تغير شي لازم تجي من نفس الموقع */
export function checkOrigin(req: Request) {
  if (req.method === 'GET' || req.method === 'HEAD') return;
  const origin = req.headers.get('origin');
  if (origin && origin !== new URL(req.url).origin) throw new HttpError(403, 'origin', 'طلب مرفوض');
}
