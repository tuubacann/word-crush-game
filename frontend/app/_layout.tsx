import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ title: 'Welcome' }} />
        <Stack.Screen name="home" options={{ headerShown: false }} />
        <Stack.Screen name="edit-username" options={{ presentation: 'modal', title: 'Edit Username' }} />
        <Stack.Screen name="new-game" options={{ title: 'Choose Difficulty' }} />
        <Stack.Screen name="move-count" options={{ title: 'Choose Moves' }} />
        <Stack.Screen name="game" options={{ title: 'Game' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
