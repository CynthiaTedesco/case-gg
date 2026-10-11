import './global.css';

import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Platform, Pressable, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <SafeAreaProvider>
      <SafeAreaView className="flex-1 items-center justify-center bg-zinc-100">
        <View className="w-[90%] max-w-md items-center gap-3 rounded-2xl bg-white p-6">
          <Text className="text-3xl font-bold">case-gg</Text>
          <Text className="text-base text-zinc-500">Running on: {Platform.OS}</Text>

          <Pressable
            className="mt-2 rounded-xl bg-indigo-600 px-6 py-3 active:opacity-70"
            onPress={() => setCount((c) => c + 1)}
          >
            <Text className="text-base font-semibold text-white">Tapped {count} times</Text>
          </Pressable>
        </View>
        <StatusBar style="auto" />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
