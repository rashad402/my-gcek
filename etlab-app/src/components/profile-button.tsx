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
 * Tapping opens a bottom sheet — full profile UI to be provided later.
 * Does NOT trigger logout directly; logout will be an action inside the profile sheet.
 */
export function ProfileButton() {
  const [visible, setVisible] = useState(false);
  const colorScheme = useColorScheme();
  const scheme = colorScheme === 'dark' ? 'dark' : 'light';
  const colors = Colors[scheme];
  const { username } = useLogin();

  const initial = username ? username.charAt(0).toUpperCase() : 'U';

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

      {/* Placeholder bottom sheet — UI will be replaced when design is ready */}
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

          <Text style={[styles.sheetTitle, { color: colors.text }]}>Profile</Text>
          <Text style={[styles.sheetBody, { color: colors.textSecondary }]}>
            Profile UI coming soon. Full design will be applied in a future update.
          </Text>

          <TouchableOpacity
            style={[styles.closeButton, { backgroundColor: colors.surfaceContainer }]}
            onPress={() => setVisible(false)}
          >
            <Text style={[styles.closeText, { color: colors.text }]}>Close</Text>
          </TouchableOpacity>
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
  sheetTitle: {
    fontFamily: Fonts.headlineBold,
    fontSize: 22,
  },
  sheetBody: {
    fontFamily: Fonts.body,
    fontSize: 14,
    lineHeight: 22,
  },
  closeButton: {
    paddingVertical: Spacing.three,
    borderRadius: Roundness.default,
    alignItems: 'center',
    marginTop: Spacing.one,
  },
  closeText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 15,
  },
});
