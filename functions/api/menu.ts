import type { Env } from '../../server/env';
import { ensureReady, loadMenu } from '../../server/db';
import { errorResponse, json } from '../../server/http';

/** GET /api/menu — المنيو والإعدادات من القاعدة */
export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  try {
    await ensureReady(env.DB);
    return json(await loadMenu(env.DB), { cache: 'public, max-age=15, stale-while-revalidate=60' });
  } catch (e) {
    return errorResponse(e);
  }
};
