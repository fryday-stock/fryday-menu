import { createContext, useContext } from 'react';
import type { ThemeDef } from './types';

export const ThemeCtx = createContext<ThemeDef | null>(null);
export function useTheme(): ThemeDef {
  const t = useContext(ThemeCtx);
  if (!t) throw new Error('useTheme outside ThemeCtx');
  return t;
}
