import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useColorScheme, View, TouchableOpacity, Text } from 'react-native';
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
import { Colors, Fonts } from '@/constants/theme';
import Toast from 'react-native-toast-message';
import { useNavigationContainerRef } from 'expo-router';
import { isRunningInExpoGo } from 'expo';

// ─── Sentry Observability Configuration ─────────────────────────────────────
import * as Sentry from '@sentry/react-native';

const navigationIntegration = Sentry.reactNavigationIntegration({
  enableTimeToInitialDisplay: !isRunningInExpoGo(),
  ignoreEmptyBackNavigationTransactions: true,
});

Sentry.init({
  dsn: 'https://0193bf2f9a611446b68b1f3304da7710@o4511584753942528.ingest.de.sentry.io/4511584757678160',
  debug: false,
  enableAutoSessionTracking: true,
  sessionTrackingIntervalMillis: 30000,
  tracesSampleRate: 1.0,
  integrations: [navigationIntegration],
  enableNativeFramesTracking: !isRunningInExpoGo(),
});

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

/**
 * Error Fallback Screen displayed if a fatal JS error occurs.
 */
function ErrorFallback({ error, resetError }: { error: any; resetError: () => void }) {
  const colorScheme = useColorScheme();
  const scheme = colorScheme === 'dark' ? 'dark' : 'light';
  const colors = Colors[scheme];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, padding: 24, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontFamily: Fonts.headlineBold, fontSize: 24, color: colors.text, marginBottom: 12, textAlign: 'center' }}>
        Oops! Something Went Wrong
      </Text>
      <Text style={{ fontFamily: Fonts.body, fontSize: 14, color: colors.textSecondary, marginBottom: 24, textAlign: 'center', lineHeight: 20 }}>
        An unexpected error occurred. A report has been automatically sent to the developers.
      </Text>
      
      <View style={{ backgroundColor: colors.surfaceContainer, padding: 16, borderRadius: 12, width: '100%', marginBottom: 24 }}>
        <Text style={{ fontFamily: Fonts.bodyBold, fontSize: 12, color: colors.error, marginBottom: 4 }}>
          Error Details:
        </Text>
        <Text style={{ fontFamily: Fonts.bodyMedium, fontSize: 11, color: colors.textSecondary }} numberOfLines={5}>
          {error.message || String(error)}
        </Text>
      </View>

      <TouchableOpacity
        style={{ backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 }}
        onPress={resetError}
      >
        <Text style={{ fontFamily: Fonts.bodyBold, fontSize: 14, color: '#ffffff' }}>
          Try Again
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function TabLayout() {
  const colorScheme = useColorScheme();
  const [fontsLoaded, fontError] = useFonts({
    NotoSerif_400Regular,
    NotoSerif_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  const ref = useNavigationContainerRef();

  useEffect(() => {
    if (ref) {
      navigationIntegration.registerNavigationContainer(ref);
    }
  }, [ref]);

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
          <Sentry.ErrorBoundary fallback={({ error, resetError }) => <ErrorFallback error={error} resetError={resetError} />}>
            <LoginProvider>
              <AppContent />
            </LoginProvider>
          </Sentry.ErrorBoundary>
        </ThemeProvider>
      </SafeAreaProvider>
      <Toast />
    </GestureHandlerRootView>
  );
}

export default Sentry.wrap(TabLayout);

