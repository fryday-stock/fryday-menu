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
  /** ترتيب داخل القسم */
  sort?: number;
  /** "خالص اليوم" لحد هذا الوقت (ISO) — يرجع متوفر تلقائياً الساعة 6 الصبح */
  soldOutUntil?: string | null;
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

export interface MapProvider {
  /** اسم المزود (osm / carto / custom) */
  provider: string;
  /** قالب رابط البلاطات {z}/{x}/{y} (و {s} و {r} اختياري) */
  tileUrl: string;
  attribution: string;
  maxZoom: number;
  subdomains?: string;
}

/** أوقات البانر الذكي وحالات الجو والمواسم */
export type BannerSlot = 'lunch' | 'afternoon' | 'evening' | 'hot' | 'cold' | 'season' | 'any';

/** زر الشريحة: يفتح صنف أو قسم */
export interface BannerCta {
  type: 'item' | 'section' | 'none';
  /** كود الصنف (F001) أو اسم القسم */
  target: string;
  label: string;
}

/** شريحة مرفوعة من اللوحة (صورة أو فيديو MP4 صامت) */
export interface BannerSlide {
  id: string;
  slot: BannerSlot;
  enabled: boolean;
  media: { type: 'image' | 'video'; src: string; poster?: string };
  title: string;
  subtitle?: string;
  cta: BannerCta;
}

/** وقت من اليوم + الأصناف اللي تطلع تلقائياً إذا ماكو شرائح مرفوعة */
export interface Daypart {
  from: string;
  to: string;
  title: string;
  items: string[];
}

export interface BannerSettings {
  enabled: boolean;
  /** شرائح تلقائية من صور الأصناف إذا ماكو محتوى مرفوع */
  auto: boolean;
  /** ثواني لكل شريحة */
  intervalSec: number;
  dayparts: { lunch: Daypart; afternoon: Daypart; evening: Daypart };
  weather: { enabled: boolean; hotAbove: number; coldBelow: number; hot: { title: string; items: string[] }; cold: { title: string; items: string[] } };
  slides: BannerSlide[];
}

export interface Season {
  enabled: boolean;
  kind: 'ramadan' | 'ziyara' | 'event';
  name: string;
  /** رسالة تطلع فوك المنيو */
  message: string;
  /** أوقات طلب خاصة بالموسم */
  hours: { enabled: boolean; open: string; close: string };
  /** آخر يوم (بتوقيت بغداد) — بعده يرجع طبيعي تلقائياً */
  until: string | null;
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
  /** وقت تجهيز الاستلام من المطعم (دقائق) */
  pickupMinutes: number;
  /** وضع الضغط العالي: يغير وقت الوصول ويطلع تنبيه للزبون */
  busy: { enabled: boolean; deliveryMinutes: number; pickupMinutes: number; message: string };
  /** إيقاف الطلبات مؤقتاً (المنيو يبقى مفتوح) */
  paused: { enabled: boolean; message: string };
  /** مزود الخرائط (قابل للتبديل بدون تعديل كود) */
  map: MapProvider;
  /** البانر الذكي بالرأس (حسب الوقت والجو والموسم) */
  banner: BannerSettings;
  /** زيادة قيمة الطلب */
  upsell: {
    /** "تحوّله لوجبة؟" بعد إضافة بركر أو توست */
    meal: { enabled: boolean; group: string };
    /** "تكمّل طلبك؟" بالسلة */
    cart: { enabled: boolean; drinks: string[]; sweets: string[]; sauceGroup: string };
  };
  /** "الأكثر طلباً ⭐" بأول المنيو */
  featured: { enabled: boolean; title: string; items: string[] };
  /** "اطلب نفس طلبك السابق" */
  reorder: { enabled: boolean };
  /** قطة فرايدي (حركة الإضافة للسلة) — image فاضي = القطة المرسومة */
  mascot: { enabled: boolean; image: string | null };
  /** وضع المواسم (رمضان / زيارة / مناسبة) */
  season: Season;
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
