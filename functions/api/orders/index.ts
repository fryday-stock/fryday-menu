import type { Env } from '../../../server/env';
import { ensureReady, loadMenu } from '../../../server/db';
import { clientIp, errorResponse, json, readJson } from '../../../server/http';
import { createOrder, type OrderInput } from '../../../server/orders';
import { checkOrigin } from '../../../server/auth';

/** POST /api/orders — يحفظ الطلب ويرجع رقم يومي متسلسل + رسالة الواتساب */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    checkOrigin(request);
    await ensureReady(env.DB);
    const input = await readJson<OrderInput>(request, 100_000);
    const menu = await loadMenu(env.DB);
    return json({ ok: true, ...(await createOrder(env.DB, input, menu, clientIp(request))) });
  } catch (e) {
    return errorResponse(e);
  }
};
