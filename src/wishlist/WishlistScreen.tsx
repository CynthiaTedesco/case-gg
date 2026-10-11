import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { WishItem } from '../api';
import { AddItemModal } from '../components/AddItemModal';
import { ItemRow } from '../components/ItemRow';
import { EmptyList, LoadError, SkeletonList } from '../components/ListStates';
import { Toast } from '../components/Toast';
import { Toolbar } from '../components/Toolbar';
import { countUnreserved, visibleItems, type PriceSort } from './selectors';
import { useWishlist } from './useWishlist';
import type { RetryAction } from './wishlistReducer';

const NO_IDS: ReadonlySet<string> = new Set();

export function WishlistScreen() {
  const { state, refresh, reserve, unreserve, addItem, dismissNotice } = useWishlist();
  const [onlyUnreserved, setOnlyUnreserved] = useState(false);
  const [sort, setSort] = useState<PriceSort>('none');
  // Items you reserved since the filter was last changed. They stay put instead of vanishing.
  const [keepVisible, setKeepVisible] = useState(NO_IDS);
  const [adding, setAdding] = useState(false);

  const items = useMemo(
    () => visibleItems(state.items, { onlyUnreserved, sort, keepVisible }),
    [state.items, onlyUnreserved, sort, keepVisible],
  );

  const toggleUnreserved = useCallback(() => {
    setOnlyUnreserved((on) => !on);
    setKeepVisible(NO_IDS);
  }, []);

  const handleReserve = useCallback(
    (id: string) => {
      setKeepVisible((ids) => new Set(ids).add(id));
      reserve(id);
    },
    [reserve],
  );

  const handleRetry = useCallback(
    (retry: RetryAction) => {
      if (retry.type === 'refresh') refresh();
      else if (retry.type === 'reserve') handleReserve(retry.id);
      else unreserve(retry.id);
    },
    [refresh, handleReserve, unreserve],
  );

  const renderItem = useCallback(
    ({ item }: { item: WishItem }) => (
      <ItemRow
        item={item}
        pending={item.id in state.pending}
        onReserve={handleReserve}
        onUnreserve={unreserve}
      />
    ),
    [state.pending, handleReserve, unreserve],
  );

  const ready = state.status === 'ready';

  return (
    <SafeAreaView className="flex-1 bg-zinc-100" edges={['top', 'left', 'right']}>
      <View className="w-full max-w-2xl flex-1 self-center">
        <View className="flex-row items-center justify-between gap-3 px-4 pb-3 pt-12">
          <View className="flex-1">
            <Text className="text-2xl font-bold text-zinc-900" accessibilityRole="header">
              Wishlist
            </Text>
            <Text className="text-zinc-500">
              {ready
                ? `${countUnreserved(state.items)} of ${state.items.length} still available`
                : 'Pick a gift and reserve it so nobody doubles up.'}
            </Text>
          </View>
          {ready ? (
            <View className="flex-row gap-2">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Refresh"
                accessibilityState={{ busy: state.refreshing }}
                onPress={refresh}
                className="h-11 w-11 items-center justify-center rounded-xl border border-zinc-300 bg-white active:opacity-70"
              >
                {state.refreshing ? (
                  <ActivityIndicator size="small" color="#52525b" />
                ) : (
                  <Text className="text-lg text-zinc-700">↻</Text>
                )}
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => setAdding(true)}
                className="h-11 justify-center rounded-xl bg-indigo-600 px-4 active:opacity-70"
              >
                <Text className="font-semibold text-white">+ Add</Text>
              </Pressable>
            </View>
          ) : null}
        </View>

        {state.status === 'loading' ? <SkeletonList /> : null}
        {state.status === 'error' ? (
          <LoadError message={state.error ?? 'Something went wrong'} onRetry={refresh} />
        ) : null}
        {ready ? (
          <>
            <Toolbar
              onlyUnreserved={onlyUnreserved}
              onToggleUnreserved={toggleUnreserved}
              sort={sort}
              onChangeSort={setSort}
            />
            <FlatList
              data={items}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              ListEmptyComponent={<EmptyList filtered={onlyUnreserved && state.items.length > 0} />}
              refreshControl={<RefreshControl refreshing={state.refreshing} onRefresh={refresh} />}
              contentContainerClassName="pb-28"
            />
          </>
        ) : null}
      </View>

      <Toast notice={state.notice} onDismiss={dismissNotice} onRetry={handleRetry} />
      <AddItemModal visible={adding} onClose={() => setAdding(false)} onSubmit={addItem} />
    </SafeAreaView>
  );
}
