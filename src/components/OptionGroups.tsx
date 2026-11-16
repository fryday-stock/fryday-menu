import { Check } from 'lucide-react';
import { motion } from 'motion/react';
import type { Item, Option, OptionGroup } from '../data/types';
import type { ItemConfig } from '../hooks/useItemConfig';
import { groupStatus } from '../lib/price';
import { fmt, photo } from '../lib/format';

/** صور مساعدة لبعض الخيارات (حتى المربعات تطلع بصورة مثل المرجع C) */
const OPTION_PHOTOS: Record<string, string> = {
  'وجبة (بطاطا + حلقات بصل + ببسي)': 'fries-classic.webp',
  'تمن أبيض': 'chicken-rice.webp',
  'تمن باقلاء': 'chicken-rice.webp',
};

export type SizeLook = 'raised' | 'img' | 'pills';
export type GroupLook = 'tiles' | 'list';

function GroupHeader({ group, cfg, tone = 'default' }: { group: OptionGroup; cfg: ItemConfig; tone?: 'default' | 'dark' }) {
  const st = groupStatus(group, cfg.sel);
  const error = cfg.showErrors && !st.ok;
  const required = group.min > 0;
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h3 className="text-[17px] font-bold">{group.name}</h3>
      <span
        className={`shrink-0 rounded-full px-2.5 py-1 text-[12px] font-bold transition ${
          error ? 'bg-danger text-white' : st.ok && required ? 'bg-ok/12 text-ok' : tone === 'dark' ? 'bg-surface-2 text-muted' : 'bg-surface-2 text-muted'
        }`}
      >
        {st.ok && required ? (
          <span className="inline-flex items-center gap-1">
            <Check size={13} strokeWidth={3} /> {group.min === group.max && group.kind === 'multi' ? `تم (${st.count}/${group.min})` : 'تم'}
          </span>
        ) : (
          st.hint
        )}
      </span>
    </div>
  );
}

function deltaText(o: Option) {
  return o.price ? `+${fmt(o.price)}` : '';
}

/* ───────────── الحجوم ───────────── */
export function SizePicker({ item, group, cfg, look }: { item: Item; group: OptionGroup; cfg: ItemConfig; look: SizeLook }) {
  const chosen = cfg.sel[group.code]?.[0];
  const base = item.price ?? 0;
  const scales = [0.56, 0.74, 0.92];
  return (
    <section id={`grp-${group.code}`} className="scroll-mt-24">
      <GroupHeader group={group} cfg={cfg} />
      <div role="radiogroup" aria-label={group.name} className={look === 'pills' ? 'flex gap-2' : 'grid grid-cols-3 gap-3'}>
        {group.options.map((o, i) => {
          const on = chosen === o.id;
          const price = base + o.price;
          if (look === 'pills')
            return (
              <button key={o.id} role="radio" aria-checked={on} onClick={() => cfg.toggle(group, o.id)}
                className={`flex min-h-12 flex-1 flex-col items-center justify-center rounded-2xl border-2 px-2 py-1.5 transition active:scale-95 ${on ? 'border-primary bg-primary text-on-primary shadow-[0_8px_20px_-8px_var(--t-primary)]' : 'border-line bg-surface text-fg'}`}>
                <span className="text-[15px] font-bold leading-tight">{o.name}</span>
                <bdi className="num text-[13px] font-semibold opacity-80">{fmt(price)}</bdi>
              </button>
            );
          if (look === 'img')
            return (
              <button key={o.id} role="radio" aria-checked={on} onClick={() => cfg.toggle(group, o.id)}
                className={`relative flex flex-col items-center rounded-2xl border bg-surface-2 px-2 pb-2.5 pt-2 transition active:scale-95 ${on ? 'border-primary shadow-[0_0_0_1px_var(--t-primary),0_10px_30px_-10px_var(--t-primary)]' : 'border-line'}`}>
                <div className="grid h-20 w-full place-items-center">
                  {item.image && <img src={photo(item.image, 'sm')} alt="" loading="lazy" style={{ width: `${scales[i % 3] * 100}%` }} className="max-h-20 object-contain" />}
                </div>
                <span className="mt-1 text-[14px] font-semibold">{o.name}</span>
                <bdi className="num text-[13px] text-muted">{fmt(price)}</bdi>
              </button>
            );
          // raised — كروت ترتفع (مرجع B)
          return (
            <motion.button key={o.id} role="radio" aria-checked={on} onClick={() => cfg.toggle(group, o.id)}
              animate={{ y: on ? -8 : 0, scale: on ? 1.04 : 1 }} transition={{ type: 'spring', stiffness: 420, damping: 26 }}
              className={`relative flex flex-col items-center rounded-[20px] px-2 pb-3 pt-2 ${on ? 'bg-gradient-to-b from-primary-2 to-primary text-on-primary shadow-[0_16px_28px_-12px_var(--t-primary)]' : 'bg-surface-2 text-fg'}`}>
              <div className="grid h-20 w-full place-items-center">
                {item.image && <img src={photo(item.image, 'sm')} alt="" loading="lazy" style={{ width: `${scales[i % 3] * 100}%` }} className="max-h-20 object-contain drop-shadow-[0_6px_6px_rgba(0,0,0,0.25)]" />}
              </div>
              <span className="mt-1 text-[14px] font-bold">{o.name}</span>
              <bdi className="num text-[14px] font-bold">{fmt(price)}</bdi>
            </motion.button>
          );
        })}
      </div>
    </section>
  );
}

/* ───────────── باقي المجموعات ───────────── */
export function OptionGroupView({ group, cfg, look }: { group: OptionGroup; cfg: ItemConfig; look: GroupLook }) {
  const ids = cfg.sel[group.code] ?? [];
  const multi = group.kind === 'multi';
  const full = multi && ids.length >= group.max;
  const role = multi ? 'checkbox' : 'radio';

  // مجموعة بخيار واحد (مثل "حوّل لوجبة") → كارت عريض بمفتاح
  if (group.options.length === 1 && group.min === 0) {
    const o = group.options[0];
    const on = ids.includes(o.id);
    const img = OPTION_PHOTOS[o.name];
    return (
      <section id={`grp-${group.code}`}>
        <button role="switch" aria-checked={on} onClick={() => cfg.toggle(group, o.id)}
          className={`flex w-full items-center gap-3 rounded-[20px] border-2 p-3 text-start transition active:scale-[0.98] ${on ? 'border-primary bg-primary/10' : 'border-line bg-surface'}`}>
          {img && <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-surface-2"><img src={photo(img, 'sm')} alt="" className="size-12 object-contain" /></span>}
          <span className="min-w-0 flex-1">
            <span className="block text-[16px] font-extrabold">{group.name}</span>
            <span className="block text-[13px] leading-snug text-muted">{o.name.replace(/^وجبة\s*/, '').replace(/[()]/g, '')}</span>
          </span>
          <bdi className="num shrink-0 text-[15px] font-extrabold">+{fmt(o.price)}</bdi>
          <span className={`relative h-7 w-12 shrink-0 rounded-full transition ${on ? 'bg-primary' : 'bg-line'}`}>
            <span className={`absolute top-1 size-5 rounded-full bg-white shadow transition-all ${on ? 'right-6' : 'right-1'}`} />
          </span>
        </button>
      </section>
    );
  }

  if (look === 'list')
    return (
      <section id={`grp-${group.code}`} className="scroll-mt-24">
        <GroupHeader group={group} cfg={cfg} />
        <div role={multi ? 'group' : 'radiogroup'} aria-label={group.name} className="overflow-hidden rounded-2xl border border-line bg-surface">
          {group.options.map((o, i) => {
            const on = ids.includes(o.id);
            const disabled = !on && full;
            return (
              <button key={o.id} role={role} aria-checked={on} disabled={disabled} onClick={() => cfg.toggle(group, o.id)}
                className={`flex min-h-13 w-full items-center gap-3 px-4 py-3 text-start transition active:bg-surface-2 disabled:opacity-40 ${i ? 'border-t border-line' : ''}`}>
                <span className={`grid size-6 shrink-0 place-items-center border-2 transition ${multi ? 'rounded-md' : 'rounded-full'} ${on ? 'border-primary bg-primary text-on-primary' : 'border-line'}`}>
                  {on && <Check size={14} strokeWidth={3.5} />}
                </span>
                <span className="flex-1 text-[15px] font-medium">{o.name}</span>
                <span className={`text-[14px] font-semibold ${o.price ? 'text-fg' : 'text-muted'}`}>
                  <bdi className="num">{deltaText(o)}</bdi>
                </span>
              </button>
            );
          })}
        </div>
      </section>
    );

  // tiles — مربعات واضحة (مرجع C)
  return (
    <section id={`grp-${group.code}`} className="scroll-mt-24">
      <GroupHeader group={group} cfg={cfg} />
      <div role={multi ? 'group' : 'radiogroup'} aria-label={group.name} className="grid grid-cols-3 gap-2.5">
        {group.options.map((o) => {
          const on = ids.includes(o.id);
          const disabled = !on && full;
          const img = OPTION_PHOTOS[o.name];
          return (
            <button key={o.id} role={role} aria-checked={on} disabled={disabled} onClick={() => cfg.toggle(group, o.id)}
              className={`relative flex min-h-[72px] flex-col items-center justify-center gap-1 rounded-2xl border-2 px-1.5 py-2.5 text-center transition active:scale-95 disabled:opacity-35 ${on ? 'border-primary bg-primary/10' : 'border-line bg-surface'}`}>
              {on && (
                <span className="absolute -top-2 -left-2 grid size-6 place-items-center rounded-full bg-primary text-on-primary shadow">
                  <Check size={14} strokeWidth={3.5} />
                </span>
              )}
              {img && <img src={photo(img, 'sm')} alt="" loading="lazy" className="h-10 w-14 object-contain" />}
              <span className="text-[13.5px] font-semibold leading-snug">{o.name}</span>
              {o.price > 0 && <bdi className="num text-[12.5px] font-semibold text-fg/80">{deltaText(o)}</bdi>}
            </button>
          );
        })}
      </div>
    </section>
  );
}

export function NoteField({ cfg, className = '' }: { cfg: ItemConfig; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-2 block text-[17px] font-bold">ملاحظة على الصنف <span className="text-[13px] font-medium text-muted">(اختياري)</span></span>
      <textarea
        value={cfg.note}
        onChange={(e) => cfg.setNote(e.target.value.slice(0, 140))}
        rows={2}
        placeholder="مثلاً: بدون بصل، صوص زيادة…"
        className="w-full resize-none rounded-2xl border border-line bg-surface px-4 py-3 text-[16px] text-fg placeholder:text-muted/70 focus:border-primary focus:outline-none"
      />
    </label>
  );
}
