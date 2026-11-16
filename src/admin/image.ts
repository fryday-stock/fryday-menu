/**
 * ضغط الصورة بالمتصفح قبل الرفع: WebP ≤ 150KB (تحافظ على الخلفية الشفافة)
 * + نسخة صغيرة 360px للقوائم.
 */
async function toWebp(bmp: ImageBitmap, maxSide: number, maxBytes: number): Promise<Blob> {
  const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  let w = Math.round(bmp.width * scale);
  let h = Math.round(bmp.height * scale);
  for (let attempt = 0; attempt < 6; attempt++) {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d')!.drawImage(bmp, 0, 0, w, h);
    for (const q of [0.86, 0.78, 0.7, 0.6, 0.5]) {
      const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/webp', q));
      if (!blob || blob.type !== 'image/webp') throw new Error('المتصفح ما يدعم WebP — جرب Chrome');
      if (blob.size <= maxBytes) return blob;
    }
    w = Math.round(w * 0.82);
    h = Math.round(h * 0.82);
  }
  throw new Error('ما گدرنا نصغّر الصورة كفاية — جرب صورة ثانية');
}

export async function compressImage(file: File) {
  if (!file.type.startsWith('image/')) throw new Error('هذا الملف مو صورة');
  if (file.size > 25_000_000) throw new Error('الصورة كبيرة هواية (أكثر من 25MB)');
  const bmp = await createImageBitmap(file);
  const full = await toWebp(bmp, 900, 150_000);
  const thumb = await toWebp(bmp, 360, 60_000);
  bmp.close();
  return { full, thumb };
}
