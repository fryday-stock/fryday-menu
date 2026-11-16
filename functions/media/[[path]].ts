import type { Env } from '../../server/env';
import { ensureReady } from '../../server/db';

const headers = (type: string, etag?: string) => {
  const h = new Headers({ 'content-type': type, 'cache-control': 'public, max-age=31536000, immutable', 'x-content-type-options': 'nosniff' });
  if (etag) h.set('etag', etag);
  return h;
};

/** GET /media/* — الصور المرفوعة من اللوحة (من R2 إذا مربوط، وإلا من D1) */
export const onRequestGet: PagesFunction<Env> = async ({ env, params, request }) => {
  const key = Array.isArray(params.path) ? params.path.join('/') : String(params.path ?? '');
  if (!/^[\w/.-]{3,200}$/.test(key) || key.includes('..')) return new Response('Not found', { status: 404 });
  if (env.MEDIA) {
    const obj = await env.MEDIA.get(key, { onlyIf: request.headers });
    if (obj) {
      const h = headers(obj.httpMetadata?.contentType ?? 'image/webp', obj.httpEtag);
      return new Response('body' in obj ? obj.body : null, { status: 'body' in obj ? 200 : 304, headers: h });
    }
  }
  if (!env.DB) return new Response('Not found', { status: 404 });
  await ensureReady(env.DB);
  const row = await env.DB.prepare(`SELECT content_type, data FROM media WHERE key = ?`).bind(key).first<{ content_type: string; data: string }>();
  if (!row) return new Response('Not found', { status: 404 });
  const etag = `"${key.split('/').pop()}"`;
  if (request.headers.get('if-none-match') === etag) return new Response(null, { status: 304, headers: headers(row.content_type, etag) });
  const bin = Uint8Array.from(atob(row.data), (c) => c.charCodeAt(0));
  return new Response(bin, { headers: headers(row.content_type, etag) });
};
