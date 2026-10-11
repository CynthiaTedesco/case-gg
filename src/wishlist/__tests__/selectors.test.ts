import type { WishItem } from '../../api';
import { visibleItems } from '../selectors';

const item = (id: string, priceMinor: number, reservedBy: string | null = null): WishItem => ({
  id,
  title: `Item ${id}`,
  priceMinor,
  currency: 'DKK',
  reservedBy,
});

const items = [item('a', 300), item('b', 100, 'mette'), item('c', 200), item('d', 100)];
const ids = (list: WishItem[]) => list.map((i) => i.id);

describe('visibleItems', () => {
  it('keeps the original order by default', () => {
    expect(ids(visibleItems(items, { onlyUnreserved: false, sort: 'none' }))).toEqual([
      'a',
      'b',
      'c',
      'd',
    ]);
  });

  it('sorts by price both ways, keeping the list order for equal prices', () => {
    expect(ids(visibleItems(items, { onlyUnreserved: false, sort: 'asc' }))).toEqual([
      'b',
      'd',
      'c',
      'a',
    ]);
    expect(ids(visibleItems(items, { onlyUnreserved: false, sort: 'desc' }))).toEqual([
      'a',
      'c',
      'b',
      'd',
    ]);
  });

  it('hides reserved items, except the ones it was told to keep', () => {
    expect(ids(visibleItems(items, { onlyUnreserved: true, sort: 'none' }))).toEqual([
      'a',
      'c',
      'd',
    ]);
    const keepVisible = new Set(['b']);
    expect(ids(visibleItems(items, { onlyUnreserved: true, sort: 'none', keepVisible }))).toEqual([
      'a',
      'b',
      'c',
      'd',
    ]);
  });

  it('never mutates the input', () => {
    const copy = [...items];
    visibleItems(items, { onlyUnreserved: false, sort: 'asc' });
    expect(items).toEqual(copy);
  });
});
