import { Alert, Platform } from 'react-native';

/**
 * Asks a yes/no question and resolves true on yes. Alert.alert does nothing on web, so web
 * uses the browser's own dialog instead.
 */
export function confirm(title: string, message: string, confirmLabel: string): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  }
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        { text: confirmLabel, onPress: () => resolve(true) },
      ],
      // Android: tapping outside the dialog dismisses it, which counts as Cancel.
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}
