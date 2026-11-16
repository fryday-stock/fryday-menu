import type { Env } from '../../../../server/env';
import { ensureReady } from '../../../../server/db';
import { errorResponse, json, readJson } from '../../../../server/http';
import { markSent } from '../../../../server/orders';

/** POST /api/orders/:id/sent — الزبون ضغط "أرسل على واتساب" (الطلب يصير مؤكد باللوحة) */
export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    await ensureReady(env.DB);
    const { clientId } = await readJson<{ clientId: string }>(request, 500);
    return json({ ok: await markSent(env.DB, Number(params.id), String(clientId)) });
  } catch (e) {
    return errorResponse(e);
  }
};
