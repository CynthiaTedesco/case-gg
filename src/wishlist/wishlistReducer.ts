import { CURRENT_USER, type WishItem } from '../api';

export type MutationKind = 'reserve' | 'unreserve';
export type RetryAction = { type: 'refresh' } | { type: MutationKind; id: string };

export type Notice = {
  /** Changes with every notice, so the toast restarts its timer even for an identical message. */
  id: number;
  tone: 'info' | 'error';
  message: string;
  retry?: RetryAction;
};

export type WishlistState = {
  items: WishItem[];
  /** Status of the first load only. Later refreshes never blank a list that's already showing. */
  status: 'loading' | 'error' | 'ready';
  error: string | null;
  /** True while a refresh the user asked for is running. Background polls stay silent. */
  refreshing: boolean;
  /** id → the item as it was before an optimistic change, so it can be rolled back. */
  pending: Record<string, WishItem>;
  /**
   * id → logical time the server confirmed a local change. A fetch that started before that
   * moment may carry an older copy of the item, so it must not overwrite it.
   */
  confirmedAt: Record<string, number>;
  notice: Notice | null;
};

export type WishlistAction =
  | { type: 'load/start'; userInitiated: boolean }
  | { type: 'load/success'; startedAt: number; items: WishItem[] }
  | { type: 'load/failure'; message: string }
  | { type: 'mutation/start'; kind: MutationKind; id: string }
  | { type: 'mutation/success'; item: WishItem; at: number }
  | { type: 'mutation/conflict'; kind: MutationKind; item: WishItem; at: number }
  | { type: 'mutation/notFound'; id: string; at: number }
  | { type: 'mutation/failure'; kind: MutationKind; id: string }
  | { type: 'add/success'; item: WishItem; at: number }
  | { type: 'notice/dismiss' };

export const initialState: WishlistState = {
  items: [],
  status: 'loading',
  error: null,
  refreshing: false,
  pending: {},
  confirmedAt: {},
  notice: null,
};

export function wishlistReducer(state: WishlistState, action: WishlistAction): WishlistState {
  switch (action.type) {
    case 'load/start':
      return {
        ...state,
        status: state.status === 'error' ? 'loading' : state.status,
        error: null,
        refreshing: state.refreshing || action.userInitiated,
      };

    case 'load/success':
      return {
        ...state,
        status: 'ready',
        error: null,
        refreshing: false,
        items: mergeServerItems(state, action.items, action.startedAt),
      };

    case 'load/failure':
      if (state.status !== 'ready') {
        return { ...state, status: 'error', error: action.message, refreshing: false };
      }
      // A background poll failing isn't worth interrupting anyone: the next poll tries again.
      if (!state.refreshing) return state;
      return withNotice({ ...state, refreshing: false }, 'error', "Couldn't refresh the list.", {
        type: 'refresh',
      });

    case 'mutation/start': {
      const item = state.items.find((i) => i.id === action.id);
      if (!item || state.pending[action.id]) return state;
      const reservedBy = action.kind === 'reserve' ? CURRENT_USER : null;
      return {
        ...state,
        pending: { ...state.pending, [item.id]: item },
        items: replaceItem(state.items, { ...item, reservedBy }),
      };
    }

    case 'mutation/success':
      return settle(state, action.item.id, action.at, (items) => replaceItem(items, action.item));

    case 'mutation/conflict': {
      // The error carries the item's real state, so show that straight away. No refetch needed.
      const next = settle(state, action.item.id, action.at, (items) =>
        replaceItem(items, action.item),
      );
      return withNotice(next, 'info', conflictMessage(action.kind, action.item));
    }

    case 'mutation/notFound': {
      const title = titleOf(state, action.id);
      const next = settle(state, action.id, action.at, (items) =>
        items.filter((i) => i.id !== action.id),
      );
      return withNotice(next, 'info', `“${title}” is no longer on the wishlist.`);
    }

    case 'mutation/failure': {
      // We don't know what the server did, so roll back and let the next fetch be the judge.
      const previous = state.pending[action.id];
      const next = settle(state, action.id, undefined, (items) =>
        previous ? replaceItem(items, previous) : items,
      );
      const title = previous?.title ?? 'the item';
      const message =
        action.kind === 'reserve'
          ? `Couldn't reserve “${title}”. Nothing was saved.`
          : `Couldn't undo your reservation of “${title}”. It's still yours.`;
      return withNotice(next, 'error', message, { type: action.kind, id: action.id });
    }

    case 'add/success': {
      const next = {
        ...state,
        items: [...state.items, action.item],
        confirmedAt: { ...state.confirmedAt, [action.item.id]: action.at },
      };
      return withNotice(next, 'info', `Added “${action.item.title}” to the wishlist.`);
    }

    case 'notice/dismiss':
      return { ...state, notice: null };
  }
}

/**
 * The server list wins, except for items with a local change it may not have seen yet: a
 * reservation still in flight, or one confirmed after this fetch started.
 */
function mergeServerItems(state: WishlistState, serverItems: WishItem[], startedAt: number) {
  const local = new Map(state.items.map((item) => [item.id, item]));
  const isNewerLocally = (id: string) =>
    id in state.pending || (state.confirmedAt[id] ?? -Infinity) > startedAt;

  const merged = serverItems.map((serverItem) => {
    const localItem = local.get(serverItem.id);
    return localItem && isNewerLocally(serverItem.id) ? localItem : serverItem;
  });
  // Items added after this fetch started aren't in its snapshot yet. Don't drop them.
  const serverIds = new Set(serverItems.map((item) => item.id));
  const addedSince = state.items.filter(
    (item) => !serverIds.has(item.id) && isNewerLocally(item.id),
  );
  return [...merged, ...addedSince];
}

/** Finishes a mutation: applies the result, clears the rollback copy, records when it settled. */
function settle(
  state: WishlistState,
  id: string,
  confirmedAt: number | undefined,
  update: (items: WishItem[]) => WishItem[],
): WishlistState {
  const { [id]: _done, ...pending } = state.pending;
  return {
    ...state,
    items: update(state.items),
    pending,
    confirmedAt:
      confirmedAt === undefined ? state.confirmedAt : { ...state.confirmedAt, [id]: confirmedAt },
  };
}

function replaceItem(items: WishItem[], next: WishItem) {
  return items.map((item) => (item.id === next.id ? next : item));
}

function titleOf(state: WishlistState, id: string) {
  return state.items.find((i) => i.id === id)?.title ?? 'That item';
}

function conflictMessage(kind: MutationKind, item: WishItem) {
  if (kind === 'reserve' && item.reservedBy) {
    return `Someone reserved “${item.title}” just before you. It's covered, so maybe pick something else?`;
  }
  return `“${item.title}” changed in the meantime. You're now seeing the latest.`;
}

function withNotice(
  state: WishlistState,
  tone: Notice['tone'],
  message: string,
  retry?: RetryAction,
): WishlistState {
  return { ...state, notice: { id: (state.notice?.id ?? 0) + 1, tone, message, retry } };
}
