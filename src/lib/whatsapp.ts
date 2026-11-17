import { fmt } from './format';

export interface OrderLine {
  /** كود الصنف (لإحصائيات "الأكثر طلباً") */
  itemId?: string;
  name: string;
  qty: number;
  /** سعر القطعة مع الخيارات */
  unit: number;
  /** خيارات إجبارية (واحد) — تنكتب بين قوسين جنب الاسم: (وسط) */
  inline: string[];
  /** إضافات/اختيارات تنكتب كنقاط تحت الصنف */
  bullets: { name: string; price: number }[];
  note?: string;
}

export interface Order {
  number: number;
  lines: OrderLine[];
  subtotal: number;
  /** null = أجرة التوصيل يحددها الكاشير */
  deliveryFee: number | null;
  total: number;
  type: 'delivery' | 'pickup';
  customer: { name: string; phone: string };
  zone?: string;
  address?: string;
  mapsUrl?: string;
  note?: string;
  payment: string;
}

const SEP = '━━━━━━━━━━━━';

/**
 * يشيل الإيموجي والرموز اللي تطلع "�" ببعض الموبايلات (مثل 🌶 بأسماء الخيارات أو الملاحظات).
 * الرسالة لازم تطلع نظيفة على كل جهاز — نخلي بس الحروف والأرقام والعلامات العادية.
 */
export function cleanForWhatsApp(s: string): string {
  return s
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{1F1E6}-\u{1F1FF}\u{E0000}-\u{E007F}\uFE0E\uFE0F\u200D\u20E3]/gu, '')
    .replace(/[\uD800-\uDFFF]/g, '') // أي نصف حرف مكسور
    .replace(/ +([)،,])/g, '$1') // مسافة بقت مكان الإيموجي قبل القوس
    .replace(/[ \t]+$/gm, '')
    .replace(/(\S) {2,}/g, '$1 '); // مسافات زايدة بنص السطر (بس مو المسافة بأول سطر النقاط)
}

/** يبني رسالة الواتساب بالشكل المتفق عليه ويا الكاشير */
export function buildWhatsAppMessage(o: Order): string {
  const out: string[] = [];
  out.push(`طلب جديد #${o.number}`);
  out.push(SEP);
  for (const l of o.lines) {
    const inline = l.inline.length ? ` (${l.inline.join('، ')})` : '';
    out.push(`${l.qty}× ${l.name}${inline} — ${fmt(l.unit * l.qty)}`);
    for (const b of l.bullets) out.push(`   • ${b.name}${b.price ? ` (+${fmt(b.price)})` : ''}`);
    if (l.note?.trim()) out.push(`   • ملاحظة: ${l.note.trim()}`);
  }
  out.push(SEP);
  out.push(`المجموع: ${fmt(o.subtotal)}`);
  if (o.type === 'delivery') out.push(`التوصيل: ${o.deliveryFee == null ? 'يحددها الكاشير' : o.deliveryFee ? fmt(o.deliveryFee) : 'مجاني'}`);
  out.push(`الإجمالي: ${fmt(o.total)} د.ع${o.type === 'delivery' && o.deliveryFee == null ? ' + التوصيل' : ''}`);
  out.push(SEP);
  out.push(`الاسم: ${o.customer.name.trim()}`);
  out.push(`الهاتف: ${o.customer.phone}`);
  if (o.type === 'delivery') {
    out.push(`نوع الطلب: توصيل${o.zone ? ` — ${o.zone}` : ''}`);
    if (o.address?.trim()) out.push(`العنوان: ${o.address.trim()}`);
    if (o.mapsUrl) out.push(`الموقع: ${o.mapsUrl}`);
  } else {
    out.push('نوع الطلب: استلام من المطعم');
  }
  if (o.note?.trim()) out.push(`ملاحظة الطلب: ${o.note.trim()}`);
  out.push(`الدفع: ${o.payment}`);
  return cleanForWhatsApp(out.join('\n'));
}

export function whatsAppLink(phone: string, message: string): string {
  // api.whatsapp.com يحافظ على النص أحسن من wa.me (اللي يحوّل ويخرب بعض الحروف)
  return `https://api.whatsapp.com/send?phone=${phone.replace(/\D/g, '')}&text=${encodeURIComponent(cleanForWhatsApp(message))}`;
}

export function mapsLink(lat: number, lng: number): string {
  return `https://maps.google.com/?q=${lat.toFixed(6)},${lng.toFixed(6)}`;
}
