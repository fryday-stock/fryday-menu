import type { Env } from '../../../server/env';
import { handleAdmin } from '../../../server/admin';
import { errorResponse } from '../../../server/http';

/** /api/admin/* — لوحة الإدارة */
export const onRequest: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    const path = Array.isArray(params.path) ? params.path.join('/') : String(params.path ?? '');
    return await handleAdmin(request, env, path);
  } catch (e) {
    return errorResponse(e);
  }
};
