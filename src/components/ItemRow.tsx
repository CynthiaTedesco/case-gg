import { memo } from 'react';
import { ActivityIndicator, Image, Linking, Pressable, Text, View } from 'react-native';

import { CURRENT_USER, type WishItem } from '../api';
import { formatPrice } from '../wishlist/format';

type Props = {
  item: WishItem;
  /** The reservation change hasn't been confirmed by the server yet. */
  pending: boolean;
  /** False shows the item as if nobody had reserved it, with no reserve buttons. */
  showReservations: boolean;
  onReserve: (id: string) => void;
  onUnreserve: (id: string) => void;
};

export const ItemRow = memo(function ItemRow({
  item,
  pending,
  showReservations,
  onReserve,
  onUnreserve,
}: Props) {
  const reservedByMe = item.reservedBy === CURRENT_USER;
  const reservedByOther = item.reservedBy !== null && !reservedByMe;
  const reservedLabel = showReservations && item.reservedBy;

  return (
    <View
      className={`mx-4 mb-3 flex-row items-center gap-3 rounded-2xl bg-white p-4 ${
        showReservations && reservedByOther ? 'opacity-60' : ''
      }`}
    >
      {item.imageUrl ? (
        <Image
          source={{ uri: item.imageUrl }}
          className="h-14 w-14 rounded-xl bg-zinc-100"
          accessibilityIgnoresInvertColors
        />
      ) : null}

      <View className="flex-1 gap-1">
        <Text className="text-base font-semibold text-zinc-900">{item.title}</Text>
        <Text className="text-base text-zinc-700">
          {formatPrice(item.priceMinor, item.currency)}
        </Text>
        <View className="flex-row flex-wrap items-center gap-x-3 gap-y-1">
          {reservedLabel ? (
            <Text className={`text-sm ${reservedByMe ? 'text-emerald-700' : 'text-zinc-500'}`}>
              {/* Never who: the owner sees this same screen (see README). */}
              {reservedByMe ? '✓ Reserved by you' : 'Reserved'}
            </Text>
          ) : null}
          {item.url ? (
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={`Open link for ${item.title}`}
              hitSlop={8}
              onPress={() => Linking.openURL(item.url!).catch(() => {})}
            >
              <Text className="text-sm text-indigo-600 underline">View item ↗</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      {!showReservations || reservedByOther ? null : reservedByMe ? (
        <ActionButton
          label="Undo"
          variant="secondary"
          pending={pending}
          accessibilityLabel={`Undo reservation of ${item.title}`}
          onPress={() => onUnreserve(item.id)}
        />
      ) : (
        <ActionButton
          label="Reserve"
          variant="primary"
          pending={pending}
          accessibilityLabel={`Reserve ${item.title}`}
          onPress={() => onReserve(item.id)}
        />
      )}
    </View>
  );
});

type ActionButtonProps = {
  label: string;
  variant: 'primary' | 'secondary';
  pending: boolean;
  accessibilityLabel: string;
  onPress: () => void;
};

function ActionButton({ label, variant, pending, accessibilityLabel, onPress }: ActionButtonProps) {
  const primary = variant === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: pending, busy: pending }}
      disabled={pending}
      onPress={onPress}
      className={`min-w-24 flex-row items-center justify-center gap-2 rounded-xl px-4 py-2.5 active:opacity-70 ${
        primary ? 'bg-indigo-600' : 'border border-zinc-300 bg-white'
      } ${pending ? 'opacity-60' : ''}`}
    >
      {/* The row already shows the new state. The spinner only says "still saving". */}
      {pending ? <ActivityIndicator size="small" color={primary ? '#fff' : '#52525b'} /> : null}
      <Text className={`font-semibold ${primary ? 'text-white' : 'text-zinc-700'}`}>{label}</Text>
    </Pressable>
  );
}
