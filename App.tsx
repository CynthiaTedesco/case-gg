import './global.css';

import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { WishlistScreen } from './src/wishlist/WishlistScreen';

export default function App() {
  return (
    <SafeAreaProvider>
      <WishlistScreen />
      <StatusBar style="dark" />
    </SafeAreaProvider>
  );
}
