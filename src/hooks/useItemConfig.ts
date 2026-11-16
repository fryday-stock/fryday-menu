import { useMemo, useState } from 'react';
import type { Item, OptionGroup } from '../data/types';
import { useMenu } from '../data/MenuContext';
import { defaultSelection, itemGroups, toggleOption, unitPrice, validateSelection } from '../lib/price';
import { useCart } from '../store/cart';

export function useItemConfig(item: Item) {
  const { data } = useMenu();
  const add = useCart((s) => s.add);
  const [sel, setSel] = useState(() => defaultSelection(item, data.groups));
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState('');
  const [showErrors, setShowErrors] = useState(false);
  const groups = useMemo(() => itemGroups(item, data.groups), [item, data.groups]);
  const unit = unitPrice(item, data.groups, sel);
  const v = validateSelection(item, data.groups, sel);
  const sizeGroup = groups.find((g) => g.isSize) ?? null;
  const otherGroups = groups.filter((g) => !g.isSize);

  const toggle = (g: OptionGroup, optionId: string) => setSel((s) => toggleOption(g, s, optionId));

  /** يضيف للسلة — يرجع false إذا ناقص اختيار إجباري */
  const submit = (): boolean => {
    if (!v.ok) {
      setShowErrors(true);
      const el = document.getElementById(`grp-${v.firstMissing}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (navigator.vibrate) navigator.vibrate(30);
      return false;
    }
    add(item.id, sel, qty, note);
    if (navigator.vibrate) navigator.vibrate(12);
    return true;
  };

  return { sel, toggle, qty, setQty, note, setNote, unit, total: unit * qty, valid: v.ok, statuses: v.statuses, showErrors, submit, groups, sizeGroup, otherGroups };
}

export type ItemConfig = ReturnType<typeof useItemConfig>;
