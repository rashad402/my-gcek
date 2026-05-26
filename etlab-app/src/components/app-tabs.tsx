import { Tabs } from 'expo-router';
import { useColorScheme } from 'react-native';
import { useLogin } from './login-context';
import { Colors } from '@/constants/theme';

export default function AppTabs() {
  const colorScheme = useColorScheme();
  const scheme = colorScheme === 'dark' ? 'dark' : 'light';
  const colors = Colors[scheme];
  const { isLoggedIn } = useLogin();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.outlineVariant,
          display: isLoggedIn ? 'flex' : 'none', // Completely hide tab bar when logged out
        },
        headerShown: false,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: isLoggedIn ? "Attendance" : "Login",
          tabBarLabel: isLoggedIn ? "Attendance" : "Login",
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: "Design System",
          tabBarLabel: "Design System",
          href: isLoggedIn ? undefined : null, // Hide explore tab dynamically when logged out
        }}
      />
    </Tabs>
  );
}
