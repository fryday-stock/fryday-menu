import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Item } from './types';
import { menuSource, type LoadedMenu } from './source';

interface MenuCtx {
  data: LoadedMenu;
  byId: Map<string, Item>;
}

const Ctx = createContext<MenuCtx | null>(null);

export function MenuProvider({ children, fallback }: { children: ReactNode; fallback: ReactNode }) {
  const [data, setData] = useState<LoadedMenu | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    menuSource.load().then(setData).catch((e) => setError(String(e)));
  }, []);
  const value = useMemo(() => (data ? { data, byId: new Map(data.items.map((i) => [i.id, i])) } : null), [data]);
  if (error) return <div className="p-6 text-center">صار خطأ بتحميل المنيو. حدّث الصفحة.</div>;
  if (!value) return <>{fallback}</>;
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useMenu(): MenuCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useMenu outside MenuProvider');
  return v;
}
