import { Pressable, Text, View } from 'react-native';

import type { PriceSort } from '../wishlist/selectors';

type Props = {
  /** False hides the "Only unreserved" chip, for people who mustn't see reservations. */
  showReservedFilter: boolean;
  onlyUnreserved: boolean;
  onToggleUnreserved: () => void;
  sort: PriceSort;
  onChangeSort: (sort: PriceSort) => void;
};

const SORT_OPTIONS: { value: PriceSort; label: string; a11y: string }[] = [
  { value: 'none', label: 'Default', a11y: 'Default order' },
  { value: 'asc', label: 'Price ↑', a11y: 'Price, low to high' },
  { value: 'desc', label: 'Price ↓', a11y: 'Price, high to low' },
];

export function Toolbar({
  showReservedFilter,
  onlyUnreserved,
  onToggleUnreserved,
  sort,
  onChangeSort,
}: Props) {
  return (
    <View className="flex-row flex-wrap items-center justify-between gap-2 px-4 pb-3">
      {showReservedFilter ? (
        <Chip
          label="Only unreserved"
          selected={onlyUnreserved}
          role="checkbox"
          onPress={onToggleUnreserved}
        />
      ) : (
        <View />
      )}
      <View className="flex-row gap-1" accessibilityRole="radiogroup" accessibilityLabel="Sort">
        {SORT_OPTIONS.map((option) => (
          <Chip
            key={option.value}
            label={option.label}
            accessibilityLabel={option.a11y}
            selected={sort === option.value}
            role="radio"
            onPress={() => onChangeSort(option.value)}
          />
        ))}
      </View>
    </View>
  );
}

type ChipProps = {
  label: string;
  accessibilityLabel?: string;
  selected: boolean;
  role: 'checkbox' | 'radio';
  onPress: () => void;
};

function Chip({ label, accessibilityLabel, selected, role, onPress }: ChipProps) {
  return (
    <Pressable
      accessibilityRole={role}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={role === 'checkbox' ? { checked: selected } : { selected }}
      onPress={onPress}
      hitSlop={4}
      className={`rounded-full border px-3 py-1.5 active:opacity-70 ${
        selected ? 'border-indigo-600 bg-indigo-600' : 'border-zinc-300 bg-white'
      }`}
    >
      <Text className={`text-sm font-medium ${selected ? 'text-white' : 'text-zinc-700'}`}>
        {role === 'checkbox' && selected ? `✓ ${label}` : label}
      </Text>
    </Pressable>
  );
}
