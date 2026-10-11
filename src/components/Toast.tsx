import { useEffect } from 'react';
import { AccessibilityInfo, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Notice, RetryAction } from '../wishlist/wishlistReducer';

type Props = {
  notice: Notice | null;
  onDismiss: () => void;
  onRetry: (retry: RetryAction) => void;
};

export function Toast({ notice, onDismiss, onRetry }: Props) {
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!notice) return;
    AccessibilityInfo.announceForAccessibility(notice.message);
    // Leave a little longer when there's a button to reach for.
    const timer = setTimeout(onDismiss, notice.retry ? 8000 : 5000);
    return () => clearTimeout(timer);
  }, [notice, onDismiss]);

  if (!notice) return null;
  const { retry } = notice;

  return (
    <View
      pointerEvents="box-none"
      className="absolute inset-x-0 items-center px-4"
      style={{ bottom: insets.bottom + 16 }}
    >
      <View
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        className={`w-full max-w-xl flex-row items-center gap-3 rounded-2xl px-4 py-3 shadow-lg ${
          notice.tone === 'error' ? 'bg-red-700' : 'bg-zinc-900'
        }`}
      >
        <Text className="flex-1 text-white">{notice.message}</Text>
        {retry ? (
          <Pressable
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => {
              onDismiss();
              onRetry(retry);
            }}
          >
            <Text className="font-semibold text-white underline">Try again</Text>
          </Pressable>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
          hitSlop={8}
          onPress={onDismiss}
        >
          <Text className="text-lg text-white/70">✕</Text>
        </Pressable>
      </View>
    </View>
  );
}
