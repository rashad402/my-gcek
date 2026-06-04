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

  // When logged out, render only the index/login tab so other routes
  // cannot be navigated to. When logged in, render the full tab set.
  if (!isLoggedIn) {
    return (
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textSecondary,
          tabBarStyle: {
            backgroundColor: colors.surfaceLowest,
            borderTopColor: colors.outlineVariant,
            borderTopWidth: 0,
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
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Login',
            tabBarLabel: 'Login',
            tabBarIcon: ({ focused, color }) => (
              <TabIcon emoji="📅" focused={focused} color={color} />
            ),
          }}
        />
      </Tabs>
    );
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.surfaceLowest,
          borderTopColor: colors.outlineVariant,
          borderTopWidth: 0,
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
      }}
    >
      {/* 1. Attendance — index route (shows dashboard because LoginProvider is mounted) */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Attendance',
          tabBarLabel: 'Attendance',
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
