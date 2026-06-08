import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  TabTriggerSlotProps,
  TabListProps,
} from 'expo-router/ui';
import { Pressable, useColorScheme, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useLogin } from './login-context';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { Colors, MaxContentWidth, Spacing } from '@/constants/theme';

export default function AppTabs() {
  const { isLoggedIn } = useLogin();

  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList asChild>
        <CustomTabList>
          <TabTrigger name="home" href="/" asChild>
            <TabButton icon={isLoggedIn ? "calendar" : "log-in"}>
              {isLoggedIn ? "Attendance" : "Login"}
            </TabButton>
          </TabTrigger>
          {isLoggedIn && (
            <>
              <TabTrigger name="result" href="/result" asChild>
                <TabButton icon="star">Result</TabButton>
              </TabTrigger>
              <TabTrigger name="assignment" href="/assignment" asChild>
                <TabButton icon="document-text">Assignment</TabButton>
              </TabTrigger>
              <TabTrigger name="survey" href="/survey" asChild>
                <TabButton icon="checkbox">Survey</TabButton>
              </TabTrigger>
            </>
          )}
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

export function TabButton({ children, isFocused, icon, ...props }: TabTriggerSlotProps & { icon?: keyof typeof Ionicons.glyphMap }) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  return (
    <Pressable {...props} style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView
        type={isFocused ? 'backgroundSelected' : 'backgroundElement'}
        style={[
          styles.tabButtonView,
          { flexDirection: 'row', alignItems: 'center', gap: Spacing.one }
        ]}>
        {icon && (
          <Ionicons 
            name={isFocused ? icon : (`${icon}-outline` as any)} 
            size={16} 
            color={isFocused ? colors.primary : colors.textSecondary} 
          />
        )}
        <ThemedText type="small" themeColor={isFocused ? 'text' : 'textSecondary'}>
          {children}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const { isLoggedIn, logout } = useLogin();

  return (
    <View {...props} style={styles.tabListContainer}>
      <ThemedView type="backgroundElement" style={styles.innerContainer}>
        <ThemedText type="smallBold" style={styles.brandText}>
          ETLAB GCEK Mobile
        </ThemedText>

        {props.children}

        {isLoggedIn && (
          <Pressable onPress={() => logout()} style={({ pressed }) => pressed && styles.pressed}>
            <ThemedView 
              type="backgroundElement" 
              style={[
                styles.tabButtonView, 
                styles.logoutButtonView,
                { flexDirection: 'row', alignItems: 'center', gap: Spacing.one }
              ]}>
              <Ionicons name="log-out-outline" size={15} color={colors.error} />
              <ThemedText type="smallBold" style={{ color: colors.error }}>
                Log Out
              </ThemedText>
            </ThemedView>
          </Pressable>
        )}
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  tabListContainer: {
    position: 'absolute',
    width: '100%',
    padding: Spacing.three,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  innerContainer: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.five,
    borderRadius: Spacing.five,
    flexDirection: 'row',
    alignItems: 'center',
    flexGrow: 1,
    gap: Spacing.two,
    maxWidth: MaxContentWidth,
  },
  brandText: {
    marginRight: 'auto',
  },
  pressed: {
    opacity: 0.7,
  },
  tabButtonView: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
  },
  logoutButtonView: {
    backgroundColor: 'rgba(186, 26, 26, 0.08)',
  },
});
