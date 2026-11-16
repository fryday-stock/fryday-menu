export type TabId = 'food' | 'drinks' | 'sweets';

export interface Option {
  id: string;
  name: string;
  /** فرق السعر بالدينار */
  price: number;
}

export interface OptionGroup {
  code: string;
  name: string;
  /** single = يختار واحد، multi = يختار أكثر من واحد */
  kind: 'single' | 'multi';
  /** أقل عدد لازم يختاره (0 = اختياري) */
  min: number;
  /** أكثر عدد مسموح */
  max: number;
  /** مجموعة حجوم (تنعرض كروت حجم) */
  isSize: boolean;
  options: Option[];
}

export interface Item {
  id: string;
  tab: TabId;
  section: string;
  name: string;
  nameEn: string | null;
  desc: string | null;
  /** null = "حسب الطلب" */
  price: number | null;
  /** false = ما ينطلب أونلاين (زر اتصال) */
  orderable: boolean;
  groups: string[];
  image: string | null;
  available: boolean;
}

export interface Zone {
  id: string;
  name: string;
  fee: number;
  /** حدود المنطقة [lat, lng] — تقريبية، تتعدل من اللوحة (المرحلة 1) */
  polygon: [number, number][];
}

/** محتوى الرأس: صورة أو فيديو (المرحلة 2: البانر الذكي من اللوحة) */
export interface HeroMedia {
  type: 'image' | 'video';
  /** اسم صورة صنف (burger-mushroom.webp) أو رابط كامل */
  src: string;
  poster?: string;
  title?: string;
}

/** طريقة أجرة التوصيل: map = تلقائية من الدبوس، fixed = مبلغ ثابت، cashier = يحددها الكاشير */
export type FeeMode = 'map' | 'fixed' | 'cashier';

export interface Settings {
  restaurantName: string;
  restaurantNameEn: string;
  tagline: string;
  /** رقم واتساب دولي بدون + */
  whatsapp: string;
  phones: string[];
  callPhone: string;
  address: string;
  hours: { open: string; close: string; utcOffset: number };
  closedMessage: string;
  deliveryNote: string;
  minOrder: { enabled: boolean; amount: number };
  freeDelivery: { enabled: boolean; threshold: number };
  payment: string;
  etaMinutes: number;
  /** موقع المطعم */
  location: { lat: number; lng: number };
  delivery: { enabled: boolean; feeMode: FeeMode; fixedFee: number; locationRequired: boolean };
  pickup: { enabled: boolean };
  hero: { image: string; media: HeroMedia[] };
  messages: { outOfZone: string; cashierFee: string };
  social: { instagram: string; tiktok: string; facebook: string };
}

export interface MenuData {
  generatedAt: string;
  tabs: { id: TabId; name: string; sections: { id: string; name: string }[] }[];
  items: Item[];
  groups: Record<string, OptionGroup>;
  zones: Zone[];
  settings: Settings;
}
