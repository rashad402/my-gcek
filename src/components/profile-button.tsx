import React, { useRef, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
  Alert,
  Linking,
} from 'react-native';
import { useLogin } from './login-context';
import { Colors, Fonts, Spacing, Roundness } from '@/constants/theme';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetView,
} from '@gorhom/bottom-sheet';

const GRADIENT_PAIRS: readonly [string, string][] = [
  ['#4f46e5', '#06b6d4'], // Indigo to Cyan
  ['#ec4899', '#f43f5e'], // Pink to Rose
  ['#10b981', '#3b82f6'], // Emerald to Blue
  ['#f59e0b', '#e11d48'], // Amber to Rose
  ['#8b5cf6', '#ec4899'], // Violet to Pink
  ['#3b82f6', '#8b5cf6'], // Blue to Violet
];

function MenuRow({
  icon,
  label,
  value,
  onPress,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  onPress?: () => void;
  colors: any;
}) {
  return (
    <TouchableOpacity
      style={[styles.menuRow, { borderBottomColor: colors.outlineVariant + '1a' }]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.7}
    >
      <View style={styles.menuRowLeft}>
        <Ionicons name={icon} size={20} color={colors.textSecondary} style={{ marginRight: Spacing.two }} />
        <Text style={[styles.menuRowLabel, { color: colors.text }]}>{label}</Text>
      </View>
      {value ? (
        <Text style={[styles.menuRowValue, { color: colors.textSecondary }]}>{value}</Text>
      ) : (
        onPress && <Ionicons name="chevron-forward" size={16} color={colors.outline} />
      )}
    </TouchableOpacity>
  );
}

export function ProfileButton() {
  const colorScheme = useColorScheme();
  const scheme = colorScheme === 'dark' ? 'dark' : 'light';
  const colors = Colors[scheme];
  const { username, studentId, logout } = useLogin();

  const bottomSheetModalRef = useRef<BottomSheetModal>(null);

  const initial = username ? username.charAt(0).toUpperCase() : 'U';

  const avatarColors = useMemo((): [string, string] => {
    if (!username) return ['#4f46e5', '#06b6d4'];
    const hash = username.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return GRADIENT_PAIRS[hash % GRADIENT_PAIRS.length] as [string, string];
  }, [username]);

  const handleOpenSheet = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    bottomSheetModalRef.current?.present();
  }, []);

  const handleCloseSheet = useCallback(() => {
    bottomSheetModalRef.current?.dismiss();
  }, []);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
      />
    ),
    []
  );

  const handleConfirmLogout = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    Alert.alert(
      'Log Out?',
      'Are you sure you want to log out of ETLAB GCEK? You will need to re-authenticate to sync your attendance data.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
            handleCloseSheet();
            // Allow bottom sheet dismissal animation to finish before clearing session
            setTimeout(async () => {
              await logout();
            }, 300);
          },
        },
      ]
    );
  };

  return (
    <>
      {/* Small Header Avatar Button */}
      <TouchableOpacity
        style={styles.circle}
        onPress={handleOpenSheet}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={avatarColors}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        <Text style={styles.initial}>{initial}</Text>
      </TouchableOpacity>

      {/* Bottom Sheet Modal */}
      <BottomSheetModal
        ref={bottomSheetModalRef}
        snapPoints={['54%']}
        backdropComponent={renderBackdrop}
        enablePanDownToClose
        backgroundStyle={{ backgroundColor: colors.background }}
        handleIndicatorStyle={{ backgroundColor: colors.outlineVariant, width: 40 }}
      >
        <BottomSheetView style={[styles.sheetContent, { backgroundColor: colors.background }]}>
          {/* Profile Header */}
          <View style={styles.profileHeader}>
            <View style={styles.avatarGlowContainer}>
              <LinearGradient
                colors={avatarColors}
                style={styles.largeAvatar}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.largeAvatarText}>{initial}</Text>
              </LinearGradient>
            </View>
            <View style={styles.userInfo}>
              <View style={styles.nameRow}>
                <Text style={[styles.usernameText, { color: colors.text }]}>
                  {username || 'Student'}
                </Text>
                {studentId ? (
                  <View style={[styles.idBadge, { backgroundColor: colors.primary + '15' }]}>
                    <Text style={[styles.idBadgeText, { color: colors.primary }]}>
                      ID: {studentId}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text style={[styles.roleText, { color: colors.textSecondary }]}>
                Government College of Engineering, Kannur
              </Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.outlineVariant + '33' }]} />

          {/* Menu Sections */}
          <View style={styles.menuSection}>
            <MenuRow
              icon="calendar-outline"
              label="Academic Session"
              value="2025-2026"
              colors={colors}
            />
            <MenuRow
              icon="notifications-outline"
              label="App Notifications"
              value="Enabled"
              colors={colors}
            />
            <MenuRow
              icon="help-circle-outline"
              label="Help & Support"
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                Alert.alert(
                  'Support & Assistance',
                  'For technical support or issues with your ETLAB GCEK credentials, please contact the college administration or reset your password on the official portal:\n\nhttps://gcek.etlab.in',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Reset Password', onPress: () => Linking.openURL('https://gcek.etlab.in/user/resetpassword') }
                  ]
                );
              }}
              colors={colors}
            />
            <MenuRow
              icon="information-circle-outline"
              label="About GCEK Portal"
              value="v1.0.0"
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                Alert.alert(
                  'About GCEK Portal',
                  'A premium, super-fast mobile companion app for Government College of Engineering, Kannur ETLAB.\n\nOptimized with local caching, offline support, analytics, and responsive interfaces.',
                  [{ text: 'Close', style: 'default' }]
                );
              }}
              colors={colors}
            />
          </View>

          {/* Destructive Logout Button */}
          <TouchableOpacity
            style={[styles.logoutButton, { backgroundColor: colors.errorContainer }]}
            onPress={handleConfirmLogout}
            activeOpacity={0.85}
          >
            <Ionicons name="log-out-outline" size={18} color={colors.error} style={{ marginRight: Spacing.one }} />
            <Text style={[styles.logoutText, { color: colors.error }]}>Log Out</Text>
          </TouchableOpacity>
        </BottomSheetView>
      </BottomSheetModal>
    </>
  );
}

const styles = StyleSheet.create({
  circle: {
    width: 32,
    height: 32,
    borderRadius: Roundness.full,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  initial: {
    fontFamily: Fonts.bodyBold,
    fontSize: 13,
    color: '#ffffff',
  },
  sheetContent: {
    flex: 1,
    paddingTop: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.five,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    marginVertical: Spacing.two,
  },
  avatarGlowContainer: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
    borderRadius: Roundness.full,
  },
  largeAvatar: {
    width: 68,
    height: 68,
    borderRadius: Roundness.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  largeAvatarText: {
    fontFamily: Fonts.headlineBold,
    fontSize: 28,
    color: '#ffffff',
  },
  userInfo: {
    flex: 1,
    gap: Spacing.half,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  usernameText: {
    fontFamily: Fonts.headlineBold,
    fontSize: 18,
  },
  idBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: Roundness.sm,
  },
  idBadgeText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 11,
  },
  roleText: {
    fontFamily: Fonts.body,
    fontSize: 12,
    lineHeight: 16,
  },
  divider: {
    height: 1,
    width: '100%',
    marginVertical: Spacing.three,
  },
  menuSection: {
    gap: Spacing.half,
    marginBottom: Spacing.four,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
  },
  menuRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuRowLabel: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 14,
  },
  menuRowValue: {
    fontFamily: Fonts.body,
    fontSize: 13,
  },
  logoutButton: {
    flexDirection: 'row',
    height: 52,
    borderRadius: Roundness.default,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 'auto',
  },
  logoutText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 15,
  },
});
