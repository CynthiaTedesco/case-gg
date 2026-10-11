import { CURRENT_USER, type WishItem } from '../../api';
import {
  initialState,
  wishlistReducer,
  type WishlistAction,
  type WishlistState,
} from '../wishlistReducer';

const lamp: WishItem = {
  id: '1',
  title: 'Lamp',
  priceMinor: 129900,
  currency: 'DKK',
  reservedBy: null,
};
const pan: WishItem = {
  id: '2',
  title: 'Pan',
  priceMinor: 59900,
  currency: 'DKK',
  reservedBy: null,
};

const run = (state: WishlistState, ...actions: WishlistAction[]) =>
  actions.reduce(wishlistReducer, state);

const loaded = run(initialState, { type: 'load/success', startedAt: 0, items: [lamp, pan] });
const lampIn = (state: WishlistState) => state.items.find((i) => i.id === lamp.id);

describe('loading', () => {
  it('shows an error screen when the first load fails', () => {
    const state = run(initialState, { type: 'load/failure', message: 'Network error' });
    expect(state.status).toBe('error');
    expect(state.error).toBe('Network error');
  });

  it('keeps the list and says nothing when a background poll fails', () => {
    const state = run(loaded, { type: 'load/failure', message: 'Network error' });
    expect(state.items).toHaveLength(2);
    expect(state.notice).toBeNull();
  });

  it('keeps the list and offers a retry when a refresh the user asked for fails', () => {
    const state = run(
      loaded,
      { type: 'load/start', userInitiated: true },
      { type: 'load/failure', message: 'Network error' },
    );
    expect(state.items).toHaveLength(2);
    expect(state.refreshing).toBe(false);
    expect(state.notice).toMatchObject({ tone: 'error', retry: { type: 'refresh' } });
  });
});

describe('reserving', () => {
  it('shows the reservation immediately, before the server answers', () => {
    const state = run(loaded, { type: 'mutation/start', kind: 'reserve', id: lamp.id });
    expect(lampIn(state)?.reservedBy).toBe(CURRENT_USER);
    expect(state.pending[lamp.id]).toEqual(lamp);
  });

  it('ignores a second tap while the first is in flight', () => {
    const once = run(loaded, { type: 'mutation/start', kind: 'reserve', id: lamp.id });
    expect(run(once, { type: 'mutation/start', kind: 'reserve', id: lamp.id })).toBe(once);
  });

  it('rolls back and offers a retry when the request fails', () => {
    const state = run(
      loaded,
      { type: 'mutation/start', kind: 'reserve', id: lamp.id },
      { type: 'mutation/failure', kind: 'reserve', id: lamp.id },
    );
    expect(lampIn(state)).toEqual(lamp);
    expect(state.pending).toEqual({});
    expect(state.notice?.retry).toEqual({ type: 'reserve', id: lamp.id });
  });

  it('shows the item as taken, without saying by whom, when the reservation conflicts', () => {
    const takenByMette = { ...lamp, reservedBy: 'mette' };
    const state = run(
      loaded,
      { type: 'mutation/start', kind: 'reserve', id: lamp.id },
      { type: 'mutation/conflict', kind: 'reserve', item: takenByMette, at: 5 },
    );
    expect(lampIn(state)?.reservedBy).toBe('mette');
    expect(state.notice?.message).toContain('Someone reserved');
    expect(state.notice?.message).not.toMatch(/mette/i);
    expect(state.notice?.retry).toBeUndefined();
  });

  it('removes an item the server no longer has', () => {
    const state = run(
      loaded,
      { type: 'mutation/start', kind: 'reserve', id: lamp.id },
      { type: 'mutation/notFound', id: lamp.id, at: 5 },
    );
    expect(lampIn(state)).toBeUndefined();
  });
});

describe('merging a fetch with local changes', () => {
  it("doesn't let a poll undo a reservation that's still in flight", () => {
    const state = run(
      loaded,
      { type: 'mutation/start', kind: 'reserve', id: lamp.id },
      { type: 'load/success', startedAt: 10, items: [lamp, pan] },
    );
    expect(lampIn(state)?.reservedBy).toBe(CURRENT_USER);
  });

  it("doesn't let a fetch that started earlier overwrite a confirmed reservation", () => {
    const mine = { ...lamp, reservedBy: CURRENT_USER };
    const state = run(
      loaded,
      { type: 'mutation/start', kind: 'reserve', id: lamp.id },
      { type: 'mutation/success', item: mine, at: 6 },
      { type: 'load/success', startedAt: 5, items: [lamp, pan] }, // snapshot from before
    );
    expect(lampIn(state)?.reservedBy).toBe(CURRENT_USER);
  });

  it('takes the server version once a fetch started after the change', () => {
    const state = run(
      loaded,
      { type: 'mutation/success', item: { ...lamp, reservedBy: CURRENT_USER }, at: 6 },
      { type: 'load/success', startedAt: 7, items: [{ ...lamp, reservedBy: null }, pan] },
    );
    expect(lampIn(state)?.reservedBy).toBeNull();
  });

  it('picks up changes made by other people', () => {
    const state = run(loaded, {
      type: 'load/success',
      startedAt: 1,
      items: [{ ...lamp, reservedBy: 'jonas' }, pan],
    });
    expect(lampIn(state)?.reservedBy).toBe('jonas');
  });

  it("keeps an item added after the fetch started, even though the fetch doesn't have it", () => {
    const blanket: WishItem = { ...pan, id: '3', title: 'Blanket' };
    const state = run(
      loaded,
      { type: 'add/success', item: blanket, at: 8 },
      { type: 'load/success', startedAt: 7, items: [lamp, pan] },
    );
    expect(state.items.map((i) => i.id)).toEqual(['1', '2', '3']);
  });
});
