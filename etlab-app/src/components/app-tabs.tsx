import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, useColorScheme } from 'react-native';
import { useLogin } from './login-context';
import { Colors, Fonts, Spacing, Roundness } from '@/constants/theme';

/**
 * Tab bar icon component using emoji/text to avoid external icon dependencies.
 * Matches the Material Symbols icons from the Stitch design:
 *   Attendance → calendar_today → 📅
 *   Result     → grade         → ⭐
 *   Assignment → assignment    → 📋
 *   Survey     → poll          → 📊
 */
function TabIcon({ emoji, focused, color }: { emoji: string; focused: boolean; color: string }) {
  return (
    <View style={[styles.iconContainer, focused && styles.iconContainerActive]}>
      <Text style={[styles.iconEmoji, { opacity: focused ? 1 : 0.7 }]}>{emoji}</Text>
    </View>
  );
}

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
          backgroundColor: colors.surfaceLowest,
          borderTopColor: colors.outlineVariant,
          borderTopWidth: 0,
          display: isLoggedIn ? 'flex' : 'none',
          paddingTop: 4,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.03,
          shadowRadius: 8,
          elevation: 8,
        },
        tabBarLabelStyle: {
          fontFamily: Fonts.label,
          fontSize: 10,
          letterSpacing: 1,
          textTransform: 'uppercase',
          marginTop: 2,
        },
        headerShown: false,
      }}>
      {/* 1. Attendance — index route (also shows Login when logged out) */}
      <Tabs.Screen
        name="index"
        options={{
          title: isLoggedIn ? 'Attendance' : 'Login',
          tabBarLabel: isLoggedIn ? 'Attendance' : 'Login',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon emoji="📅" focused={focused} color={color} />
          ),
        }}
      />

      {/* 2. Result */}
      <Tabs.Screen
        name="result"
        options={{
          title: 'Result',
          tabBarLabel: 'Result',
          href: isLoggedIn ? undefined : null,
          tabBarIcon: ({ focused, color }) => (
            <TabIcon emoji="⭐" focused={focused} color={color} />
          ),
        }}
      />

      {/* 3. Assignment */}
      <Tabs.Screen
        name="assignment"
        options={{
          title: 'Assignment',
          tabBarLabel: 'Assignment',
          href: isLoggedIn ? undefined : null,
          tabBarIcon: ({ focused, color }) => (
            <TabIcon emoji="📝" focused={focused} color={color} />
          ),
        }}
      />

      {/* 4. Survey */}
      <Tabs.Screen
        name="survey"
        options={{
          title: 'Survey',
          tabBarLabel: 'Survey',
          href: isLoggedIn ? undefined : null,
          tabBarIcon: ({ focused, color }) => (
            <TabIcon emoji="📋" focused={focused} color={color} />
          ),
        }}
      />

    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: Roundness.full,
  },
  iconContainerActive: {
    // Subtle active highlight matching Stitch's primary-container/20 indicator
  },
  iconEmoji: {
    fontSize: 18,
  },
});
