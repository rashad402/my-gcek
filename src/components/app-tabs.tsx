import { Tabs } from 'expo-router';
import { StyleSheet, useColorScheme, Platform } from 'react-native';
import { useLogin } from './login-context';
import { Colors, Fonts, Roundness } from '@/constants/theme';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import { Calendar, Star, FileText, CheckSquare, LogIn } from 'lucide-react-native';

/**
 * Animated tab bar icon component using Lucide icons.
 * Renders with a spring-animated pill-shaped indicator and subtle vertical shift.
 */
function TabIcon({ Icon, focused, color }: { Icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>; focused: boolean; color: string }) {
  const colorScheme = useColorScheme();
  const scheme = colorScheme === 'dark' ? 'dark' : 'light';
  const colors = Colors[scheme];

  const progress = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    progress.value = withSpring(focused ? 1 : 0, {
      damping: 18,
      stiffness: 180,
    });
  }, [focused, progress]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: 1 + progress.value * 0.05 },
        { translateY: -progress.value * 2 },
      ],
    };
  });

  const animatedPillStyle = useAnimatedStyle(() => {
    return {
      opacity: progress.value,
    };
  });

  return (
    <Animated.View style={[styles.iconContainer, animatedStyle]}>
      <Animated.View 
        style={[
          StyleSheet.absoluteFillObject,
          { 
            backgroundColor: `${colors.primary}15`, 
            borderRadius: Roundness.xl 
          },
          animatedPillStyle
        ]} 
      />
      <Icon 
        size={19} 
        color={color} 
        strokeWidth={focused ? 2.2 : 1.8}
      />
    </Animated.View>
  );
}

export default function AppTabs() {
  const colorScheme = useColorScheme();
  const scheme = colorScheme === 'dark' ? 'dark' : 'light';
  const colors = Colors[scheme];
  const { isLoggedIn } = useLogin();
  const insets = useSafeAreaInsets();

  const triggerHaptic = () => {
    Haptics.selectionAsync().catch(() => {});
  };

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          position: 'absolute',
          left: 24,
          right: 24,
          bottom: Platform.OS === 'ios' ? (insets.bottom > 0 ? insets.bottom : 16) : 16,
          borderRadius: 28,
          height: 64,
          borderWidth: 1,
          borderColor: colors.ghostBorder,
          backgroundColor: 'transparent',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: scheme === 'dark' ? 0.22 : 0.06,
          shadowRadius: 12,
          elevation: 8,
          display: isLoggedIn ? 'flex' : 'none',
          paddingTop: 8,
          paddingBottom: 8,
        },
        tabBarBackground: () => (
          <BlurView
            intensity={30}
            tint={scheme}
            style={[
              StyleSheet.absoluteFillObject,
              {
                borderRadius: 28,
                overflow: 'hidden',
                backgroundColor: scheme === 'dark' ? 'rgba(18, 18, 19, 0.6)' : 'rgba(255, 255, 255, 0.5)',
              }
            ]}
          />
        ),
        tabBarLabelStyle: {
          fontFamily: Fonts.label,
          fontSize: 11,
          letterSpacing: 0.2,
          fontWeight: '500',
          marginTop: 0,
          marginBottom: 2,
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
            <TabIcon Icon={isLoggedIn ? Calendar : LogIn} focused={focused} color={color} />
          ),
        }}
        listeners={{
          tabPress: triggerHaptic,
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
            <TabIcon Icon={Star} focused={focused} color={color} />
          ),
        }}
        listeners={{
          tabPress: triggerHaptic,
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
            <TabIcon Icon={FileText} focused={focused} color={color} />
          ),
        }}
        listeners={{
          tabPress: triggerHaptic,
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
            <TabIcon Icon={CheckSquare} focused={focused} color={color} />
          ),
        }}
        listeners={{
          tabPress: triggerHaptic,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    width: 44,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: Roundness.xl,
  },
});
