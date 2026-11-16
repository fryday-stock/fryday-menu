import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Search, X } from 'lucide-react';
import type { Item, TabId } from '../data/types';
import { useMenu } from '../data/MenuContext';
import { searchItems } from '../lib/search';

export interface SectionData {
  id: string;
  name: string;
  items: Item[];
}

/** حالة المتصفح: التبويب، البحث، القسم الفعال (scroll-spy) */
export function useMenuBrowser() {
  const { data } = useMenu();
  const [tab, setTabState] = useState<TabId>(() => {
    try { return (sessionStorage.getItem('fryday:tab') as TabId) || 'food'; } catch { return 'food'; }
  });
  const [query, setQuery] = useState('');
  const [active, setActive] = useState<string>('');
  const [navH, setNavH] = useState(112);
  const navRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const sectionEls = useRef(new Map<string, HTMLElement>());
  const lockUntil = useRef(0);

  const sections: SectionData[] = useMemo(() => {
    const t = data.tabs.find((x) => x.id === tab)!;
    return t.sections
      .map((s) => ({ id: s.id, name: s.name, items: data.items.filter((i) => i.tab === tab && i.section === s.name && i.available) }))
      .filter((s) => s.items.length);
  }, [data, tab]);

  const results = useMemo(() => (query.trim() ? searchItems(data.items.filter((i) => i.available), query) : null), [data.items, query]);

  // ارتفاع الشريط الثابت
  useLayoutEffect(() => {
    const el = navRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setNavH(el.offsetHeight));
    ro.observe(el);
    setNavH(el.offsetHeight);
    return () => ro.disconnect();
  }, []);

  // scroll-spy
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (Date.now() < lockUntil.current) return;
        let cur = sections[0]?.id ?? '';
        for (const s of sections) {
          const el = sectionEls.current.get(s.id);
          if (el && el.getBoundingClientRect().top - navH - 24 <= 0) cur = s.id;
        }
        // آخر الصفحة: القسم الأخير هو الفعال حتى لو ما وصل للأعلى
        const atEnd = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
        if (atEnd && sections.length && window.scrollY > 0) cur = sections[sections.length - 1].id;
        setActive(cur);
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf); };
  }, [sections, navH]);

  const smooth = typeof window !== 'undefined' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const scrollToSection = useCallback((id: string) => {
    const el = sectionEls.current.get(id);
    if (!el) return;
    setActive(id);
    lockUntil.current = Date.now() + 700;
    const y = el.getBoundingClientRect().top + window.scrollY - navH - 8;
    window.scrollTo({ top: y, behavior: smooth ? 'smooth' : 'auto' });
  }, [navH, smooth]);

  const setTab = useCallback((t: TabId) => {
    setTabState(t);
    try { sessionStorage.setItem('fryday:tab', t); } catch { /* ignore */ }
    const a = anchorRef.current;
    if (a) {
      const top = a.getBoundingClientRect().top + window.scrollY;
      if (window.scrollY > top) window.scrollTo({ top, behavior: 'auto' });
    }
  }, []);

  const registerSection = useCallback((id: string) => (el: HTMLElement | null) => {
    if (el) sectionEls.current.set(id, el);
    else sectionEls.current.delete(id);
  }, []);

  return { data, tab, setTab, query, setQuery, results, sections, active: active || sections[0]?.id, scrollToSection, navRef, anchorRef, navH, registerSection };
}

export type Browser = ReturnType<typeof useMenuBrowser>;

/** صف الأقسام الأفقي — يحرك القسم الفعال لنص الشاشة */
export function SectionChips({ b, render, className = '' }: { b: Browser; render: (s: SectionData, active: boolean) => ReactNode; className?: string }) {
  const rowRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const row = rowRef.current;
    const chip = row?.querySelector<HTMLElement>(`[data-sec="${b.active}"]`);
    if (!row || !chip) return;
    const r = row.getBoundingClientRect();
    const c = chip.getBoundingClientRect();
    const delta = c.left + c.width / 2 - (r.left + r.width / 2);
    row.scrollBy({ left: delta, behavior: 'smooth' });
  }, [b.active]);
  if (b.results) return null;
  return (
    <div ref={rowRef} className={`no-scrollbar flex gap-2 overflow-x-auto scroll-px-4 px-4 ${className}`}>
      {b.sections.map((s) => (
        <div key={s.id} data-sec={s.id} className="shrink-0" onClick={() => b.scrollToSection(s.id)}>
          {render(s, s.id === b.active)}
        </div>
      ))}
    </div>
  );
}

/** الأقسام والأصناف (أو نتائج البحث) */
export function SectionList({
  b,
  renderItem,
  renderTextItem,
  layout,
  sectionTitle,
  className = '',
}: {
  b: Browser;
  renderItem: (item: Item) => ReactNode;
  renderTextItem: (item: Item) => ReactNode;
  layout: 'rows' | 'grid';
  sectionTitle: (s: SectionData) => ReactNode;
  className?: string;
}) {
  const renderGroup = (items: Item[]) => {
    const withImg = items.filter((i) => i.image);
    const noImg = items.filter((i) => !i.image);
    return (
      <>
        {withImg.length > 0 && (
          <div className={layout === 'grid' ? 'grid grid-cols-2 gap-x-3 gap-y-4' : 'flex flex-col gap-3'}>{withImg.map((i) => <div key={i.id} className="contents">{renderItem(i)}</div>)}</div>
        )}
        {noImg.length > 0 && <div className={`flex flex-col ${withImg.length ? 'mt-3' : ''}`}>{noImg.map((i) => <div key={i.id} className="contents">{renderTextItem(i)}</div>)}</div>}
      </>
    );
  };

  if (b.results) {
    return (
      <div className={`px-4 pt-4 ${className}`} aria-live="polite">
        <p className="mb-3 text-[14px] font-semibold text-muted">
          {b.results.length ? `${b.results.length} نتيجة لـ "${b.query.trim()}"` : `ماكو نتائج لـ "${b.query.trim()}" — جرّب كلمة ثانية`}
        </p>
        {renderGroup(b.results)}
      </div>
    );
  }

  return (
    <div className={className}>
      {b.sections.map((s) => (
        <section key={s.id} ref={b.registerSection(s.id)} aria-labelledby={`h-${s.id}`} className="px-4 pt-6">
          <div id={`h-${s.id}`}>{sectionTitle(s)}</div>
          {renderGroup(s.items)}
        </section>
      ))}
    </div>
  );
}

/** حقل البحث (الشكل يتحكم بيه النموذج) */
export function SearchInput({ b, className = '', inputClassName = '', placeholder = 'دوّر على أكلة… بركر، بيتزا، لاتيه' }: { b: Browser; className?: string; inputClassName?: string; placeholder?: string }) {
  return (
    <label className={`relative flex items-center ${className}`}>
      <span className="sr-only">بحث بالمنيو</span>
      <Search size={20} className="pointer-events-none absolute start-4 text-muted" aria-hidden />
      <input
        type="search"
        value={b.query}
        onChange={(e) => b.setQuery(e.target.value)}
        placeholder={placeholder}
        enterKeyHint="search"
        className={`h-12 w-full rounded-full ps-12 pe-11 text-[16px] outline-none focus-visible:outline-none placeholder:text-muted/80 [&::-webkit-search-cancel-button]:hidden ${inputClassName}`}
      />
      {b.query && (
        <button type="button" aria-label="امسح البحث" onClick={() => b.setQuery('')} className="absolute end-1.5 grid size-9 place-items-center rounded-full text-muted">
          <X size={18} />
        </button>
      )}
    </label>
  );
}
