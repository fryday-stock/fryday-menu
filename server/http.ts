export class HttpError extends Error {
  constructor(public status: number, public code: string, message: string, public extra?: Record<string, unknown>) {
    super(message);
  }
}

export function json(data: unknown, init: ResponseInit & { cache?: string } = {}): Response {
  const headers = new Headers(init.headers);
  headers.set('content-type', 'application/json; charset=utf-8');
  headers.set('cache-control', init.cache ?? 'no-store');
  headers.set('x-content-type-options', 'nosniff');
  return new Response(JSON.stringify(data), { ...init, headers });
}

export function errorResponse(e: unknown): Response {
  if (e instanceof HttpError) return json({ ok: false, code: e.code, message: e.message, ...e.extra }, { status: e.status });
  console.error(e);
  return json({ ok: false, code: 'server', message: 'صار خطأ بالسيرفر، حاول مرة ثانية' }, { status: 500 });
}

export async function readJson<T = unknown>(req: Request, maxBytes = 200_000): Promise<T> {
  const ct = req.headers.get('content-type') ?? '';
  if (!ct.includes('application/json')) throw new HttpError(415, 'bad_type', 'نوع الطلب غير مدعوم');
  const text = await req.text();
  if (text.length > maxBytes) throw new HttpError(413, 'too_big', 'البيانات كبيرة هواية');
  try { return JSON.parse(text) as T; } catch { throw new HttpError(400, 'bad_json', 'بيانات غير صالحة'); }
}

export async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function clientIp(req: Request): string {
  return req.headers.get('cf-connecting-ip') ?? req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? '0.0.0.0';
}
