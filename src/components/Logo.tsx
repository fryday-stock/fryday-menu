/** شعار مؤقت (وردمارك FRY DAY بألوان العلبة) — يتبدل بملف الشعار الرسمي من أحمد */
export function Logo({ size = 56, ring = true, className = '' }: { size?: number; ring?: boolean; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} role="img" aria-label="شعار فرايدي FRY DAY">
      {ring && <circle cx="50" cy="50" r="50" fill="#fff" />}
      <circle cx="50" cy="50" r={ring ? 45 : 50} fill="#FFCE1F" />
      <path d="M40 22c3-6 9-8 8-15 6 4 9 10 6 16 3-1 5-4 5-7 4 5 4 12-1 16-5 4-14 3-18-2-1-3-1-6 0-8z" fill="#E8412C" />
      <g fontFamily="'Baloo Bhaijaan 2','Arial Black',sans-serif" fontWeight="800" textAnchor="middle" fill="#1C4FD6" stroke="#fff" strokeWidth="2.4" paintOrder="stroke" letterSpacing="-0.5">
        <text x="50" y="56" fontSize="27">FRY</text>
        <text x="50" y="80" fontSize="27">DAY</text>
      </g>
    </svg>
  );
}
