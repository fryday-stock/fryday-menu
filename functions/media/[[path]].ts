import type { Env } from '../../server/env';
import { ensureReady } from '../../server/db';

const baseHeaders = (type: string, etag?: string) => {
  const h = new Headers({ 'content-type': type, 'cache-control': 'public, max-age=31536000, immutable', 'x-content-type-options': 'nosniff', 'accept-ranges': 'bytes' });
  if (etag) h.set('etag', etag);
  return h;
};

/** "bytes=0-1" → [0, 1] (الآيفون يطلب الفيديو أجزاء — لازم 206) */
function parseRange(header: string | null, size: number): [number, number] | null {
  const m = header?.match(/^bytes=(\d*)-(\d*)$/);
  if (!m) return null;
  let start = m[1] === '' ? size - Number(m[2]) : Number(m[1]);
  let end = m[1] === '' || m[2] === '' ? size - 1 : Number(m[2]);
  if (!Number.isFinite(start) || start < 0) start = 0;
  end = Math.min(end, size - 1);
  return start <= end ? [start, end] : null;
}

/** GET /media/* — الصور والفيديو المرفوعة من اللوحة (من R2 إذا مربوط، وإلا من D1) */
export const onRequestGet: PagesFunction<Env> = async ({ env, params, request }) => {
  const key = Array.isArray(params.path) ? params.path.join('/') : String(params.path ?? '');
  if (!/^[\w/.-]{3,200}$/.test(key) || key.includes('..')) return new Response('Not found', { status: 404 });

  if (env.MEDIA) {
    const head = await env.MEDIA.head(key);
    if (head) {
      const range = parseRange(request.headers.get('range'), head.size);
      const obj = await env.MEDIA.get(key, range ? { range: { offset: range[0], length: range[1] - range[0] + 1 } } : {});
      if (obj && 'body' in obj) {
        const h = baseHeaders(head.httpMetadata?.contentType ?? 'application/octet-stream', head.httpEtag);
        if (range) { h.set('content-range', `bytes ${range[0]}-${range[1]}/${head.size}`); h.set('content-length', String(range[1] - range[0] + 1)); }
        return new Response(obj.body, { status: range ? 206 : 200, headers: h });
      }
    }
  }

  if (!env.DB) return new Response('Not found', { status: 404 });
  await ensureReady(env.DB);
  const row = await env.DB.prepare(`SELECT content_type, data FROM media WHERE key = ?`).bind(key).first<{ content_type: string; data: string }>();
  if (!row) return new Response('Not found', { status: 404 });
  // الملفات الكبيرة (فيديو) مقسومة أجزاء
  if (row.data === '') {
    const parts = await env.DB.prepare(`SELECT data FROM media_chunks WHERE key = ? ORDER BY idx`).bind(key).all<{ data: string }>();
    row.data = parts.results.map((p) => p.data).join('');
  }
  const etag = `"${key.split('/').pop()}"`;
  if (request.headers.get('if-none-match') === etag) return new Response(null, { status: 304, headers: baseHeaders(row.content_type, etag) });
  const bin = Uint8Array.from(atob(row.data), (c) => c.charCodeAt(0));
  const range = parseRange(request.headers.get('range'), bin.length);
  const h = baseHeaders(row.content_type, etag);
  if (range) {
    h.set('content-range', `bytes ${range[0]}-${range[1]}/${bin.length}`);
    return new Response(bin.subarray(range[0], range[1] + 1), { status: 206, headers: h });
  }
  return new Response(bin, { headers: h });
};
