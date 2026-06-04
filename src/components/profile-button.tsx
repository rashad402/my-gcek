import React, { useState } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import { useLogin } from './login-context';
import { Colors, Fonts, Spacing, Roundness } from '@/constants/theme';

/**
 * Shared profile avatar button used across all authenticated screens.
 * Tapping opens a bottom sheet with user info and a functional Log Out button.
 */
export function ProfileButton() {
  const [visible, setVisible] = useState(false);
  const colorScheme = useColorScheme();
  const scheme = colorScheme === 'dark' ? 'dark' : 'light';
  const colors = Colors[scheme];
  const { username, logout } = useLogin();

  const initial = username ? username.charAt(0).toUpperCase() : 'U';

  const handleLogout = async () => {
    setVisible(false);
    await logout();
  };

  return (
    <>
      {/* Avatar circle — same appearance on every screen */}
      <TouchableOpacity
        style={[styles.circle, { backgroundColor: colors.surfaceHigh }]}
        onPress={() => setVisible(true)}
        activeOpacity={0.75}
      >
        <Text style={[styles.initial, { color: colors.textSecondary }]}>{initial}</Text>
      </TouchableOpacity>

      {/* Profile bottom sheet */}
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={() => setVisible(false)}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => setVisible(false)}
        />
        <View style={[styles.sheet, { backgroundColor: colors.background, borderColor: colors.outlineVariant }]}>
          {/* Handle */}
          <View style={[styles.handle, { backgroundColor: colors.outlineVariant }]} />

          {/* Profile Header / Details */}
          <View style={styles.profileHeader}>
            <View style={[styles.largeAvatar, { backgroundColor: colors.surfaceHigh }]}>
              <Text style={[styles.largeAvatarText, { color: colors.primary }]}>{initial}</Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={[styles.usernameText, { color: colors.text }]}>
                {username || 'Student'}
              </Text>
              <Text style={[styles.roleText, { color: colors.textSecondary }]}>
                Government College of Engineering, Kannur
              </Text>
              <View style={[styles.badge, { backgroundColor: colors.surfaceContainer }]}>
                <Text style={[styles.badgeText, { color: colors.primary }]}>
                  Academic Session: 2025-2026
                </Text>
              </View>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.outlineVariant }]} />

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={[styles.logoutButton, { backgroundColor: colors.errorContainer }]}
              onPress={handleLogout}
              activeOpacity={0.8}
            >
              <Text style={[styles.logoutText, { color: colors.error }]}>Log Out</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.closeButton, { backgroundColor: colors.surfaceContainer }]}
              onPress={() => setVisible(false)}
              activeOpacity={0.85}
            >
              <Text style={[styles.closeText, { color: colors.text }]}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  /* Avatar circle */
  circle: {
    width: 32,
    height: 32,
    borderRadius: Roundness.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initial: {
    fontFamily: Fonts.bodyBold,
    fontSize: 14,
  },

  /* Modal */
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    borderTopLeftRadius: Roundness.xl,
    borderTopRightRadius: Roundness.xl,
    borderTopWidth: 1,
    paddingTop: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.six,
    gap: Spacing.three,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: Spacing.one,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    marginTop: Spacing.one,
    marginBottom: Spacing.two,
  },
  largeAvatar: {
    width: 64,
    height: 64,
    borderRadius: Roundness.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  largeAvatarText: {
    fontFamily: Fonts.headlineBold,
    fontSize: 28,
  },
  userInfo: {
    flex: 1,
    gap: Spacing.half,
  },
  usernameText: {
    fontFamily: Fonts.headlineBold,
    fontSize: 20,
  },
  roleText: {
    fontFamily: Fonts.body,
    fontSize: 12,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: Roundness.sm,
    marginTop: Spacing.half,
  },
  badgeText: {
    fontFamily: Fonts.labelBold,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  divider: {
    height: 1,
    width: '100%',
    marginVertical: Spacing.one,
  },
  actionsContainer: {
    gap: Spacing.two,
  },
  logoutButton: {
    paddingVertical: Spacing.three,
    borderRadius: Roundness.default,
    alignItems: 'center',
  },
  logoutText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 15,
  },
  closeButton: {
    paddingVertical: Spacing.three,
    borderRadius: Roundness.default,
    alignItems: 'center',
  },
  closeText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 15,
  },
});
