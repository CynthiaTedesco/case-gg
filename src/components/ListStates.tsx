import { Pressable, Text, View } from 'react-native';

/** Grey placeholder rows. They keep the page's shape while the slow API answers. */
export function SkeletonList() {
  return (
    <View accessibilityLabel="Loading the wishlist" accessibilityRole="progressbar">
      {[0, 1, 2, 3, 4].map((i) => (
        <View key={i} className="mx-4 mb-3 flex-row items-center gap-3 rounded-2xl bg-white p-4">
          <View className="flex-1 gap-2">
            <View className="h-4 w-3/5 rounded bg-zinc-200" />
            <View className="h-4 w-1/4 rounded bg-zinc-200" />
          </View>
          <View className="h-10 w-24 rounded-xl bg-zinc-200" />
        </View>
      ))}
    </View>
  );
}

export function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View className="mx-4 items-center gap-3 rounded-2xl bg-white p-6">
      <Text className="text-lg font-semibold text-zinc-900">Couldn&apos;t load the wishlist</Text>
      <Text className="text-center text-zinc-500">
        {message}. Check your connection and try again.
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={onRetry}
        className="mt-1 rounded-xl bg-indigo-600 px-6 py-3 active:opacity-70"
      >
        <Text className="font-semibold text-white">Try again</Text>
      </Pressable>
    </View>
  );
}

export function EmptyList({ filtered, canAdd }: { filtered: boolean; canAdd: boolean }) {
  return (
    <View className="mx-4 items-center gap-1 rounded-2xl bg-white p-6">
      <Text className="text-lg font-semibold text-zinc-900">
        {filtered ? 'Everything is reserved 🎉' : 'No wishes yet'}
      </Text>
      <Text className="text-center text-zinc-500">
        {filtered
          ? 'Turn off “Only unreserved” to see the whole list.'
          : canAdd
            ? 'Add the first item with the button above.'
            : 'Nothing has been added yet. Check back later.'}
      </Text>
    </View>
  );
}
