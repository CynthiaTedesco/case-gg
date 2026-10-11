import type { WishItem } from '../api';

export type PriceSort = 'none' | 'asc' | 'desc';

export type ListView = {
  onlyUnreserved: boolean;
  sort: PriceSort;
  /** Items to keep on screen even if reserved, so a row doesn't vanish the moment you reserve it. */
  keepVisible?: ReadonlySet<string>;
};

/** What the list shows. Calculated from the items on every change and never stored. */
export function visibleItems(
  items: readonly WishItem[],
  { onlyUnreserved, sort, keepVisible }: ListView,
): WishItem[] {
  const shown = onlyUnreserved
    ? items.filter((item) => !item.reservedBy || keepVisible?.has(item.id))
    : [...items];
  if (sort === 'none') return shown;
  const direction = sort === 'asc' ? 1 : -1;
  // Array.prototype.sort is stable, so items with the same price keep the list's own order.
  return shown.sort((a, b) => (a.priceMinor - b.priceMinor) * direction);
}

export function countUnreserved(items: readonly WishItem[]) {
  return items.filter((item) => !item.reservedBy).length;
}
