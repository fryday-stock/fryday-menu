import { ArrowRight } from 'lucide-react';
import type { ReactNode } from 'react';

export function ScreenHeader({ title, onBack, end, className = '' }: { title: string; onBack: () => void; end?: ReactNode; className?: string }) {
  return (
    <header className={`sticky top-0 z-20 flex h-16 items-center gap-2 bg-bg/90 px-3 backdrop-blur-md ${className}`}>
      <button type="button" onClick={onBack} aria-label="رجوع" className="grid size-11 place-items-center rounded-full border border-line bg-surface text-fg transition active:scale-90">
        <ArrowRight size={20} />
      </button>
      <h1 className="flex-1 text-center text-[18px] font-extrabold">{title}</h1>
      <div className="grid size-11 place-items-center">{end}</div>
    </header>
  );
}
