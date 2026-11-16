import { create } from 'zustand';
import type { MapProvider, MenuData, Settings } from '../data/types';

export class AdminError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}

/** نداء لواجهة اللوحة (الكوكي ينرسل تلقائياً — نفس الموقع) */
export async function api<T = unknown>(path: string, init: { method?: string; body?: unknown; form?: FormData } = {}): Promise<T> {
  let r: Response;
  try {
    r = await fetch(`/api/admin/${path}`, {
      method: init.method ?? (init.body || init.form ? 'POST' : 'GET'),
      credentials: 'same-origin',
      headers: init.body !== undefined ? { 'content-type': 'application/json' } : undefined,
      body: init.form ?? (init.body !== undefined ? JSON.stringify(init.body) : undefined),
    });
  } catch {
    throw new AdminError(0, 'network', 'ما گدرنا نتصل بالسيرفر — تأكد من النت');
  }
  const data = await r.json().catch(() => null);
  if (!r.ok) {
    if (r.status === 401 && path !== 'login') useAdmin.getState().setAuthed(false);
    throw new AdminError(r.status, data?.code ?? 'error', data?.message ?? `خطأ ${r.status}`);
  }
  return data as T;
}

interface AdminState {
  authed: boolean | null;
  configured: boolean;
  r2: boolean;
  menu: MenuData | null;
  presets: Record<string, MapProvider>;
  setAuthed: (v: boolean) => void;
  check: () => Promise<void>;
  loadMenu: () => Promise<MenuData>;
  saveSettings: (s: Settings) => Promise<Settings>;
  patchSettings: (p: Partial<Settings> | Record<string, unknown>) => Promise<Settings>;
}

export const useAdmin = create<AdminState>((set, get) => ({
  authed: null,
  configured: true,
  r2: true,
  menu: null,
  presets: {},
  setAuthed: (authed) => set({ authed }),
  check: async () => {
    const me = await api<{ configured: boolean; admin: boolean; r2: boolean }>('me');
    set({ authed: me.admin, configured: me.configured, r2: me.r2 });
  },
  loadMenu: async () => {
    const [menu, st] = await Promise.all([api<MenuData>('menu'), api<{ settings: Settings; presets: Record<string, MapProvider> }>('settings')]);
    const m = { ...menu, settings: st.settings };
    set({ menu: m, presets: st.presets });
    return m;
  },
  saveSettings: async (s) => {
    const r = await api<{ settings: Settings }>('settings', { method: 'PUT', body: s });
    const menu = get().menu;
    if (menu) set({ menu: { ...menu, settings: r.settings } });
    return r.settings;
  },
  patchSettings: async (p) => {
    const r = await api<{ settings: Settings }>('settings/patch', { body: p });
    const menu = get().menu;
    if (menu) set({ menu: { ...menu, settings: r.settings } });
    return r.settings;
  },
}));

/** اليوم بتوقيت بغداد "2026-11-16" */
export const baghdadToday = () => new Date(Date.now() + 3 * 3600_000).toISOString().slice(0, 10);

/** "2026-11-16T16:30:00Z" → "7:30 م" بتوقيت بغداد */
export function baghdadTime(iso: string): string {
  const d = new Date(new Date(iso).getTime() + 3 * 3600_000);
  const h = d.getUTCHours();
  return `${h % 12 || 12}:${String(d.getUTCMinutes()).padStart(2, '0')} ${h < 12 ? 'ص' : 'م'}`;
}
