/** قطة فرايدي المؤقتة (مرسومة بأسلوب الشعار: أصفر وخط أزرق) — تتبدل بصورة القطة الرسمية من اللوحة */
export function CatSvg({ size = 44 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <g stroke="#1C4FD6" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round">
        {/* الذيل */}
        <path d="M50 46c8-2 10-10 6-15" fill="none" />
        {/* الجسم */}
        <ellipse cx="32" cy="46" rx="17" ry="13" fill="#FFCE1F" />
        {/* الراس والأذان */}
        <path d="M15 27 L13 11 L24 19 Q32 16 40 19 L51 11 L49 27 Q52 37 41 41 Q32 44 23 41 Q12 37 15 27Z" fill="#FFCE1F" />
      </g>
      {/* العيون: مبتسمة */}
      <path d="M22 29q3-3 6 0M36 29q3-3 6 0" stroke="#17140f" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      {/* الخدود */}
      <circle cx="21" cy="34" r="2.6" fill="#ff8a70" opacity=".8" />
      <circle cx="43" cy="34" r="2.6" fill="#ff8a70" opacity=".8" />
      {/* الخشم والحلگ */}
      <path d="M30.5 33h3l-1.5 2z" fill="#E8412C" />
      <path d="M29 37q3 2 6 0" stroke="#17140f" strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* شعلة فرايدي فوك الراس */}
      <path d="M32 13c2-3 5-4 4-8 3 2 5 6 3 9 2-1 3-2 3-4 2 3 1 7-3 8-3 2-7 1-8-2z" fill="#E8412C" />
    </svg>
  );
}

/** القطة (المرسومة أو الصورة الرسمية من الإعدادات) */
export function Cat({ image, size = 44 }: { image: string | null; size?: number }) {
  if (image) return <img src={image} alt="" width={size} height={size} className="object-contain" style={{ width: size, height: size }} />;
  return <CatSvg size={size} />;
}
