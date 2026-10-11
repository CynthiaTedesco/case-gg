import { Pressable, Text, View } from 'react-native';

import type { ViewerRole } from '../wishlist/viewerRole';

const OPTIONS: { role: ViewerRole; label: string; detail: string }[] = [
  {
    role: 'owner',
    label: 'Yes, it’s my list',
    detail: 'Add gifts. You won’t see what’s been reserved.',
  },
  {
    role: 'giver',
    label: 'No, I’m giving a gift',
    detail: 'Reserve a gift so nobody doubles up.',
  },
];

/** The first screen: decides which view the person gets. */
export function RolePicker({ onPick }: { onPick: (role: ViewerRole) => void }) {
  return (
    <View className="mx-4 gap-3 rounded-2xl bg-white p-6">
      <Text className="text-lg font-semibold text-zinc-900" accessibilityRole="header">
        Is this your wishlist?
      </Text>
      {OPTIONS.map((option) => (
        <Pressable
          key={option.role}
          accessibilityRole="button"
          accessibilityLabel={`${option.label}. ${option.detail}`}
          onPress={() => onPick(option.role)}
          className="gap-1 rounded-xl border border-zinc-300 px-4 py-3 active:opacity-70"
        >
          <Text className="font-semibold text-indigo-600">{option.label}</Text>
          <Text className="text-sm text-zinc-500">{option.detail}</Text>
        </Pressable>
      ))}
    </View>
  );
}
