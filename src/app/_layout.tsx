import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useColorScheme, View } from 'react-native';
import { useFonts } from 'expo-font';
import { NotoSerif_400Regular, NotoSerif_700Bold } from '@expo-google-fonts/noto-serif';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';

import { AnimatedSplashOverlay, AnimatedIcon } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { LoginProvider, useLogin } from '@/components/login-context';
import { Colors } from '@/constants/theme';
import Toast from 'react-native-toast-message';

// Keep splash screen visible until fonts load
SplashScreen.preventAutoHideAsync().catch(() => {});

function BrandedSplashScreen() {
  const colorScheme = useColorScheme();
  const scheme = colorScheme === 'dark' ? 'dark' : 'light';
  const colors = Colors[scheme];
  
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
      <AnimatedIcon />
    </View>
  );
}

/**
 * Rendered inside LoginProvider so it can read isRestoringSession.
 * Blocks rendering the tab navigator until SecureStore has been checked —
 * prevents a flash of the login screen when the user had "Keep me logged in" active.
 */
function AppContent() {
  const { isRestoringSession } = useLogin();
  
  if (isRestoringSession) {
    return <BrandedSplashScreen />;
  }
  
  return (
    <BottomSheetModalProvider>
      <AnimatedSplashOverlay />
      <AppTabs />
    </BottomSheetModalProvider>
  );
}

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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <LoginProvider>
            <AppContent />
          </LoginProvider>
        </ThemeProvider>
      </SafeAreaProvider>
      <Toast />
    </GestureHandlerRootView>
  );
}

