/**
 * طبقة البيانات المجردة.
 * المرحلة 0: تقرا من menu.json (مولّد من الـ Excel).
 * المرحلة 1: تتبدل لـ fetch('/api/menu') بدون ما يتغير باقي الكود.
 */
import type { MenuData } from './types';

export interface MenuSource {
  load(): Promise<MenuData>;
}

const jsonSource: MenuSource = {
  async load() {
    const mod = await import('./menu.json');
    return mod.default as unknown as MenuData;
  },
};

export const menuSource: MenuSource = jsonSource;
