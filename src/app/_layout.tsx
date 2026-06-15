/**
 * src/app/_layout.tsx
 * Layout raíz de EdwinCobra. Define el proveedor del tema y renderiza
 * la página de inicio directamente.
 */

import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { useColorScheme, StatusBar } from 'react-native';
import { Slot } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  
  return (
    <SafeAreaProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <StatusBar barStyle="light-content" backgroundColor="#0B0D16" />
        <Slot />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
