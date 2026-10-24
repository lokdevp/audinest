// Per-weight imports, so only these font files are bundled.
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Newsreader_400Regular } from '@expo-google-fonts/newsreader/400Regular';
import { Newsreader_500Medium } from '@expo-google-fonts/newsreader/500Medium';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useHydrated } from '@/store/useHydrated';
import { colors, type } from '@/theme';

// A deep link to another screen still gets the library underneath, so back leads somewhere.
export const unstable_settings = { initialRouteName: 'index' };

export default function RootLayout() {
  const hydrated = useHydrated();
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Newsreader_400Regular,
    Newsreader_500Medium,
  });
  // On a font error the system font is used instead.
  const ready = hydrated && (fontsLoaded || fontError !== null);
  return (
    <>
      <StatusBar style="light" />
      {ready ? (
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.surface },
            headerShadowVisible: false,
            headerTintColor: colors.onSurface,
            headerTitleStyle: { fontFamily: type.titleLg.fontFamily, fontSize: type.titleLg.fontSize },
            contentStyle: { backgroundColor: colors.surface },
          }}
        >
          <Stack.Screen name="index" options={{ title: 'Library' }} />
          <Stack.Screen name="player" options={{ title: 'Now Playing' }} />
          <Stack.Screen name="chapters" options={{ title: 'Chapters' }} />
          <Stack.Screen name="menu" options={{ title: 'Menu' }} />
          <Stack.Screen name="sleep" options={{ title: 'Sleep timer', presentation: 'modal' }} />
        </Stack>
      ) : (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
});
