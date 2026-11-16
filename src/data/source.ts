/**
 * طبقة البيانات المجردة.
 * المرحلة 1: تقرا من /api/menu (Cloudflare D1). إذا ماكو سيرفر (مثل GitHub Pages أو أوفلاين)
 * ترجع للنسخة المضمّنة menu.json — والباقي من الكود ما يدري الفرق.
 */
import type { MenuData } from './types';
import { DEFAULT_SETTINGS, mergeSettings } from './defaults';

export type LoadedMenu = MenuData & { live: boolean };

export interface MenuSource {
  load(): Promise<LoadedMenu>;
}

async function fromApi(): Promise<MenuData> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 8000);
  try {
    const r = await fetch(`${import.meta.env.BASE_URL}api/menu`, { signal: ctl.signal, headers: { accept: 'application/json' } });
    if (!r.ok || !(r.headers.get('content-type') ?? '').includes('json')) throw new Error(`menu ${r.status}`);
    return (await r.json()) as MenuData;
  } finally {
    clearTimeout(t);
  }
}

async function fromBundle(): Promise<MenuData> {
  const mod = await import('./menu.json');
  return mod.default as unknown as MenuData;
}

export const menuSource: MenuSource = {
  async load() {
    try {
      const d = await fromApi();
      return { ...d, settings: mergeSettings(DEFAULT_SETTINGS, d.settings), live: true };
    } catch {
      const d = await fromBundle();
      return { ...d, settings: mergeSettings(DEFAULT_SETTINGS, d.settings), live: false };
    }
  },
};

/** طلب جديد على السيرفر */
export interface PlacedOrderResponse {
  ok: true;
  id: number;
  number: number;
  message: string;
  total: number;
  type: 'delivery' | 'pickup';
  etaMinutes: number;
  createdAt: string;
}

export class ApiError extends Error {
  constructor(public code: string, message: string, public itemId?: string) { super(message); }
}

export async function postOrder(body: unknown): Promise<PlacedOrderResponse> {
  let r: Response;
  try {
    r = await fetch(`${import.meta.env.BASE_URL}api/orders`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  } catch {
    throw new ApiError('network', 'النت ضعيف — ما وصل الطلب. حاول مرة ثانية');
  }
  const data = await r.json().catch(() => null);
  if (!r.ok || !data?.ok) throw new ApiError(data?.code ?? 'server', data?.message ?? 'صار خطأ، حاول مرة ثانية', data?.itemId);
  return data as PlacedOrderResponse;
}

export function postSent(id: number, clientId: string) {
  const body = JSON.stringify({ clientId });
  const url = `${import.meta.env.BASE_URL}api/orders/${id}/sent`;
  // sendBeacon يكمل حتى لو انفتح واتساب وانسدت الصفحة
  if (navigator.sendBeacon?.(url, new Blob([body], { type: 'application/json' }))) return;
  fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body, keepalive: true }).catch(() => {});
}
