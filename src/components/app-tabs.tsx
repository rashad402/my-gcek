import { Tabs } from 'expo-router';
import { View, StyleSheet, useColorScheme, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLogin } from './login-context';
import { Colors, Fonts, Roundness } from '@/constants/theme';

/**
 * Tab bar icon component using Ionicons for native vector styling.
 * Renders as a premium pill-shaped indicator when active.
 */
function TabIcon({ name, focused, color }: { name: keyof typeof Ionicons.glyphMap; focused: boolean; color: string }) {
  const colorScheme = useColorScheme();
  const scheme = colorScheme === 'dark' ? 'dark' : 'light';
  const colors = Colors[scheme];

  return (
    <View style={[
      styles.iconContainer,
      focused && { backgroundColor: `${colors.primary}1A` } // 10% opacity primary color
    ]}>
      <Ionicons 
        name={focused ? name : (`${name}-outline` as any)} 
        size={20} 
        color={color} 
      />
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
          paddingTop: 8,
          paddingBottom: Platform.OS === 'ios' ? 24 : 12,
          height: Platform.OS === 'ios' ? 84 : 68,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.03,
          shadowRadius: 8,
          elevation: 8,
          display: isLoggedIn ? 'flex' : 'none',
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
      {/* 1. Attendance — index route */}
      <Tabs.Screen
        name="index"
        options={{
          title: isLoggedIn ? 'Attendance' : 'Login',
          tabBarLabel: isLoggedIn ? 'Attendance' : 'Login',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name={isLoggedIn ? 'calendar' : 'log-in'} focused={focused} color={color} />
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
            <TabIcon name="star" focused={focused} color={color} />
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
            <TabIcon name="document-text" focused={focused} color={color} />
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
            <TabIcon name="checkbox" focused={focused} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    width: 56,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: Roundness.xl,
  },
});
