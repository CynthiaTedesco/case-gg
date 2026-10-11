import { useCallback, useEffect, useReducer, useRef } from 'react';
import { AppState } from 'react-native';

import {
  addItem as apiAddItem,
  ConflictError,
  getItems,
  NotFoundError,
  reserveItem,
  unreserveItem,
} from '../api';
import type { NewItem } from './validation';
import { initialState, wishlistReducer, type MutationKind } from './wishlistReducer';

/** Other people change the list every 8–15 s (see ghostTick in api.ts), so poll at a similar pace. */
const POLL_INTERVAL_MS = 15_000;

export function useWishlist() {
  const [state, dispatch] = useReducer(wishlistReducer, initialState);

  // A counter, not a clock: it only has to say which of two events happened first.
  const clock = useRef(0);
  // Refs, not state, because double-tap and overlap checks must be synchronous.
  const loadInFlight = useRef(false);
  const mutationsInFlight = useRef(new Set<string>());

  const load = useCallback(async (userInitiated: boolean) => {
    dispatch({ type: 'load/start', userInitiated });
    // One fetch at a time. A refresh tapped during a poll just waits for that poll.
    if (loadInFlight.current) return;
    loadInFlight.current = true;
    const startedAt = ++clock.current;
    try {
      const items = await getItems();
      dispatch({ type: 'load/success', startedAt, items });
    } catch (error) {
      dispatch({ type: 'load/failure', message: messageOf(error) });
    } finally {
      loadInFlight.current = false;
    }
  }, []);

  const mutate = useCallback(async (kind: MutationKind, id: string) => {
    if (mutationsInFlight.current.has(id)) return;
    mutationsInFlight.current.add(id);
    dispatch({ type: 'mutation/start', kind, id });
    try {
      const item = await (kind === 'reserve' ? reserveItem(id) : unreserveItem(id));
      dispatch({ type: 'mutation/success', item, at: ++clock.current });
    } catch (error) {
      if (isError(error, ConflictError, 'ConflictError')) {
        dispatch({ type: 'mutation/conflict', kind, item: error.item, at: ++clock.current });
      } else if (isError(error, NotFoundError, 'NotFoundError')) {
        dispatch({ type: 'mutation/notFound', id, at: ++clock.current });
      } else {
        dispatch({ type: 'mutation/failure', kind, id });
      }
    } finally {
      mutationsInFlight.current.delete(id);
    }
  }, []);

  /** Saves first, then shows the item. Throws on failure so the form can keep what was typed. */
  const addItem = useCallback(async (input: NewItem) => {
    const item = await apiAddItem(input);
    dispatch({ type: 'add/success', item, at: ++clock.current });
  }, []);

  const reserve = useCallback((id: string) => mutate('reserve', id), [mutate]);
  const unreserve = useCallback((id: string) => mutate('unreserve', id), [mutate]);
  const refresh = useCallback(() => load(true), [load]);
  const dismissNotice = useCallback(() => dispatch({ type: 'notice/dismiss' }), []);

  useEffect(() => {
    load(false);
  }, [load]);

  const isReady = state.status === 'ready';
  useEffect(() => {
    if (!isReady) return;
    const timer = setInterval(() => {
      if (AppState.currentState === 'active') load(false);
    }, POLL_INTERVAL_MS);
    // Coming back to the app (or the browser tab) is when stale data is most likely.
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') load(false);
    });
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, [isReady, load]);

  return { state, refresh, reserve, unreserve, addItem, dismissNotice };
}

/**
 * instanceof alone is fragile for Error subclasses: when Babel downlevels classes, subclasses of
 * built-ins can fail instanceof. The fallback compares the name api.ts sets in the constructor.
 * It's a literal because minifiers rename classes, so `type.name` isn't safe in production.
 */
function isError<T extends Error>(
  error: unknown,
  type: abstract new (...args: never[]) => T,
  name: string,
): error is T {
  return error instanceof type || (error instanceof Error && error.name === name);
}

function messageOf(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong';
}
