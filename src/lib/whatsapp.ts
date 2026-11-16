import { fmt } from './format';

export interface OrderLine {
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
  deliveryFee: number;
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

/** يبني رسالة الواتساب بالشكل المتفق عليه ويا الكاشير */
export function buildWhatsAppMessage(o: Order): string {
  const out: string[] = [];
  out.push(`🧾 طلب جديد #${o.number}`);
  out.push(SEP);
  for (const l of o.lines) {
    const inline = l.inline.length ? ` (${l.inline.join('، ')})` : '';
    out.push(`${l.qty}× ${l.name}${inline} — ${fmt(l.unit * l.qty)}`);
    for (const b of l.bullets) out.push(`   • ${b.name}${b.price ? ` (+${fmt(b.price)})` : ''}`);
    if (l.note?.trim()) out.push(`   • ملاحظة: ${l.note.trim()}`);
  }
  out.push(SEP);
  out.push(`المجموع: ${fmt(o.subtotal)}`);
  if (o.type === 'delivery') out.push(`التوصيل: ${o.deliveryFee ? fmt(o.deliveryFee) : 'مجاني'}`);
  out.push(`الإجمالي: ${fmt(o.total)} د.ع`);
  out.push(SEP);
  out.push(`👤 ${o.customer.name.trim()}`);
  out.push(`📞 ${o.customer.phone}`);
  if (o.type === 'delivery') {
    out.push(`🛵 توصيل — ${o.zone ?? ''}`);
    if (o.address?.trim()) out.push(`📍 ${o.address.trim()}`);
    if (o.mapsUrl) out.push(`🗺️ ${o.mapsUrl}`);
  } else {
    out.push('🏃 استلام من المطعم');
  }
  if (o.note?.trim()) out.push(`📝 ملاحظة الطلب: ${o.note.trim()}`);
  out.push(`💵 الدفع: ${o.payment}`);
  return out.join('\n');
}

export function whatsAppLink(phone: string, message: string): string {
  return `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
}

export function mapsLink(lat: number, lng: number): string {
  return `https://maps.google.com/?q=${lat.toFixed(6)},${lng.toFixed(6)}`;
}
