import type { ComponentType } from 'react';
import type { Item } from '../data/types';

export type ThemeId = 'a' | 'b' | 'c' | 'd';

export interface ThemeDef {
  id: ThemeId;
  letter: string;
  name: string;
  /** سطرين عن شخصية النموذج */
  blurb: string;
  className: string;
  /** لون شريط المتصفح */
  themeColor: string;
  swatch: string[];
  Home: ComponentType;
  Item: ComponentType<{ item: Item; onClose: () => void }>;
  look: {
    stepper: 'soft' | 'outline' | 'dark' | 'yellow';
    /** كلاس الزر الرئيسي (عريض) */
    cta: string;
    /** كلاس الكارت بالشاشات المشتركة */
    card: string;
    /** كلاس الحقول */
    field: string;
  };
}
