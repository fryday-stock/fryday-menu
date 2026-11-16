import { themeA } from './a';
import { themeB } from './b';
import { themeC } from './c';
import { themeD } from './d';
import type { ThemeDef } from './types';

export const THEMES: ThemeDef[] = [themeA, themeB, themeC, themeD];
export const themeById = (id: string) => THEMES.find((t) => t.id === id);
