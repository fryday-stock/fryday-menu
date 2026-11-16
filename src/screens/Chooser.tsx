import { ArrowLeft } from 'lucide-react';
import { THEMES } from '../themes';
import { go } from '../lib/router';
import { Logo } from '../components/Logo';
import { photo } from '../lib/format';

/** الصفحة الرئيسية للمرحلة 0: اختيار النموذج */
const PREVIEW: Record<string, { bg: string; fg: string; img: string; tag?: string }> = {
  a: { bg: 'linear-gradient(160deg,#fff6d8,#ffc72c)', fg: '#17140f', img: 'burger-fryday.webp', tag: 'التوصية' },
  b: { bg: 'linear-gradient(160deg,#ffb07a,#f0531c)', fg: '#fff', img: 'pizza-round.webp' },
  c: { bg: 'radial-gradient(120% 90% at 70% 10%,#5a0a14,#0c0c0e 70%)', fg: '#fff', img: 'crispy-5pcs.webp' },
  d: { bg: 'linear-gradient(160deg,#fff,#ffe07a)', fg: '#1f1d1a', img: 'fries-classic.webp' },
};

export function Chooser() {
  return (
    <div className="mx-auto min-h-dvh max-w-[480px] bg-[#f7f4ee] px-4 pt-8 pb-12 text-[#1a1612]" style={{ fontFamily: 'Cairo, system-ui, sans-serif' }}>
      <div className="flex items-center gap-3">
        <Logo size={64} variant="mark" />
        <div>
          <h1 className="text-[24px] leading-tight font-extrabold">منيو فرايدي</h1>
          <p className="text-[14px] text-[#685f54]">المرحلة 0 — اختار النموذج اللي يعجبك</p>
        </div>
      </div>
      <p className="mt-5 rounded-2xl bg-white p-4 text-[14.5px] leading-7 text-[#3d362e] shadow-sm">
        أربع نماذج حقيقية تنضغط، بنفس المنيو والصور. جرّب كل واحد: افتح صنف، ضيف للسلة، وكمّل الطلب لحد الواتساب. تگدر تبدّل بين النماذج من الزر العائم على يسار الشاشة.
      </p>
      <div className="mt-5 grid gap-4">
        {THEMES.map((t) => {
          const p = PREVIEW[t.id];
          return (
            <button key={t.id} onClick={() => go(t.id)} className="group relative flex min-h-[150px] overflow-hidden rounded-[26px] p-5 text-start shadow-[0_16px_36px_-18px_rgba(0,0,0,0.45)] transition active:scale-[0.98]" style={{ background: p.bg, color: p.fg }}>
              <div className="relative z-10 flex w-[60%] flex-col">
                <span className="text-[13px] font-bold opacity-75">النموذج {t.letter}{p.tag ? ` · ${p.tag}` : ''}</span>
                <span className="text-[26px] leading-tight font-extrabold">{t.name}</span>
                <span className="mt-1 text-[13px] leading-6 opacity-85">{t.blurb}</span>
                <span className="mt-3 inline-flex items-center gap-1.5 text-[14px] font-extrabold">جرّبه <ArrowLeft size={16} /></span>
              </div>
              <img src={photo(p.img, 'sm')} alt="" className="absolute -left-4 bottom-2 w-[46%] drop-shadow-[0_18px_16px_rgba(0,0,0,0.4)] transition group-active:scale-95" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
