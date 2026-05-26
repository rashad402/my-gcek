import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { NotoSerif_400Regular, NotoSerif_700Bold } from '@expo-google-fonts/noto-serif';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { LoginProvider } from '@/components/login-context';

// Keep splash screen visible until fonts load
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const [fontsLoaded, fontError] = useFonts({
    NotoSerif_400Regular,
    NotoSerif_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <LoginProvider>
        <AnimatedSplashOverlay />
        <AppTabs />
      </LoginProvider>
    </ThemeProvider>
  );
}
