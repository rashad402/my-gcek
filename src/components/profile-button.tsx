import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
  PanResponder,
  Dimensions,
  TouchableWithoutFeedback,
} from 'react-native';
import { useLogin } from './login-context';
import { Colors, Fonts, Spacing, Roundness } from '@/constants/theme';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

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
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setVisible(false);
    await logout();
  };

  // Setup vertical swipe-to-dismiss gesture values
  const offsetY = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      offsetY.value = 0;
    }
  }, [visible, offsetY]);

  const animatedSheetStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: offsetY.value }],
    };
  });

  const animatedBackdropStyle = useAnimatedStyle(() => {
    const opacity = 1 - Math.min(1, offsetY.value / (SCREEN_HEIGHT * 0.3));
    return {
      opacity: opacity,
    };
  });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return gestureState.dy > 5 && Math.abs(gestureState.dx) < 10;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          offsetY.value = gestureState.dy;
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100 || gestureState.vy > 0.5) {
          offsetY.value = withSpring(SCREEN_HEIGHT, { damping: 20 }, (finished) => {
            if (finished) {
              runOnJS(setVisible)(false);
            }
          });
        } else {
          offsetY.value = withSpring(0, { damping: 15 });
        }
      },
    })
  ).current;

  return (
    <>
      {/* Avatar circle — same appearance on every screen */}
      <TouchableOpacity
        style={[styles.circle, { backgroundColor: colors.surfaceHigh }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
          setVisible(true);
        }}
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
        <TouchableWithoutFeedback onPress={() => setVisible(false)}>
          <Animated.View style={[styles.backdrop, animatedBackdropStyle]} />
        </TouchableWithoutFeedback>
        
        <Animated.View style={[styles.sheet, { backgroundColor: colors.background, borderColor: colors.outlineVariant }, animatedSheetStyle]}>
          {/* Swipe-to-dismiss Drag Area */}
          <View {...panResponder.panHandlers}>
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
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                setVisible(false);
              }}
              activeOpacity={0.85}
            >
              <Text style={[styles.closeText, { color: colors.text }]}>Close</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
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
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
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
