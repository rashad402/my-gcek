import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Linking,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLogin } from './login-context';
import { Colors, Fonts, Spacing, Roundness } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  FadeIn,
} from 'react-native-reanimated';

export default function LoginScreen() {
  const colorScheme = useColorScheme();
  const scheme = colorScheme === 'dark' ? 'dark' : 'light';
  const colors = Colors[scheme];

  const { login } = useLogin();

  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [keepLoggedIn, setKeepLoggedIn] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<'user' | 'pass' | null>(null);

  const usernameRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  // Reanimated Form Shake
  const shakeX = useSharedValue(0);
  const triggerShake = () => {
    shakeX.value = withSequence(
      withTiming(-10, { duration: 50 }),
      withTiming(10, { duration: 50 }),
      withTiming(-8, { duration: 50 }),
      withTiming(8, { duration: 50 }),
      withTiming(-5, { duration: 50 }),
      withTiming(5, { duration: 50 }),
      withTiming(0, { duration: 50 })
    );
  };
  const animatedFormStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: shakeX.value }],
    };
  });

  // Reanimated Checkbox scale spring
  const checkScale = useSharedValue(keepLoggedIn ? 1 : 0);
  useEffect(() => {
    checkScale.value = withSpring(keepLoggedIn ? 1 : 0, { damping: 12 });
  }, [keepLoggedIn, checkScale]);

  const checkboxAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: checkScale.value }],
      opacity: checkScale.value,
    };
  });

  const handleFocus = (field: 'user' | 'pass') => {
    Haptics.selectionAsync().catch(() => {});
    setFocusedField(field);
  };

  const handleSignIn = async () => {
    setErrorMsg(null);
    const trimmedUser = usernameInput.trim();
    const trimmedPass = passwordInput.trim();

    if (!trimmedUser || !trimmedPass) {
      setErrorMsg('Please enter both University ID and Password.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      triggerShake();
      return;
    }

    setIsLoading(true);
    try {
      const res = await login(trimmedUser, trimmedPass, keepLoggedIn);
      if (!res.success) {
        setErrorMsg(res.error || 'Invalid credentials. Please try again.');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
        triggerShake();
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      triggerShake();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
          <View style={[
            styles.cardContainer,
            {
              backgroundColor: colors.surfaceLowest,
              borderColor: colors.outlineVariant + '40',
              borderWidth: 1,
              borderRadius: Roundness.xl,
              paddingHorizontal: Spacing.four,
              paddingVertical: Spacing.five,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: scheme === 'dark' ? 0.25 : 0.06,
              shadowRadius: 16,
              elevation: 2,
            }
          ]}>
            {/* Header Section */}
            <View style={styles.header}>
              <LinearGradient
                colors={[colors.primary + '1a', 'transparent']}
                style={styles.heroGlow}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
              />
              <View style={styles.iconFrame}>
                <LinearGradient
                  colors={[colors.primary, colors.primaryContainer]}
                  style={StyleSheet.absoluteFill}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />
                <Ionicons name="school" size={32} color="#ffffff" />
              </View>
              <Text style={[styles.title, { color: colors.text }]}>Welcome to ETLAB GCEK</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>The Digital Curator</Text>
            </View>

            {/* Login Form */}
            <Animated.View style={[styles.form, animatedFormStyle]}>
              {/* Input Group: Username */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>University ID</Text>
                <View style={[
                  styles.inputWrapper,
                  {
                    borderColor: focusedField === 'user' ? colors.primary : colors.outlineVariant,
                    borderWidth: focusedField === 'user' ? 1.5 : 1,
                    backgroundColor: focusedField === 'user' ? colors.surfaceLow : 'transparent',
                  }
                ]}>
                  <Ionicons
                    name="person-outline"
                    size={18}
                    color={focusedField === 'user' ? colors.primary : colors.outline}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    ref={usernameRef}
                    style={[styles.input, { color: colors.text }]}
                    placeholder="Enter your ETLAB ID"
                    placeholderTextColor={colors.outline}
                    value={usernameInput}
                    onChangeText={(val) => {
                      setUsernameInput(val);
                      if (errorMsg) setErrorMsg(null);
                    }}
                    autoCapitalize="none"
                    editable={!isLoading}
                    onFocus={() => handleFocus('user')}
                    onBlur={() => setFocusedField(null)}
                    accessibilityLabel="University ID"
                    textContentType="username"
                    autoComplete="username"
                    returnKeyType="next"
                    onSubmitEditing={() => passwordRef.current?.focus()}
                  />
                </View>
              </View>

              {/* Input Group: Password */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Password</Text>
                <View style={[
                  styles.inputWrapper,
                  {
                    borderColor: focusedField === 'pass' ? colors.primary : colors.outlineVariant,
                    borderWidth: focusedField === 'pass' ? 1.5 : 1,
                    backgroundColor: focusedField === 'pass' ? colors.surfaceLow : 'transparent',
                  }
                ]}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={18}
                    color={focusedField === 'pass' ? colors.primary : colors.outline}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    ref={passwordRef}
                    style={[styles.input, { color: colors.text }]}
                    placeholder="Enter password"
                    placeholderTextColor={colors.outline}
                    value={passwordInput}
                    onChangeText={(val) => {
                      setPasswordInput(val);
                      if (errorMsg) setErrorMsg(null);
                    }}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    editable={!isLoading}
                    onFocus={() => handleFocus('pass')}
                    onBlur={() => setFocusedField(null)}
                    accessibilityLabel="Password"
                    textContentType="password"
                    autoComplete="current-password"
                    returnKeyType="go"
                    onSubmitEditing={handleSignIn}
                  />
                  <TouchableOpacity
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                      setShowPassword(!showPassword);
                    }}
                    style={styles.eyeButton}
                    disabled={isLoading}
                  >
                    <Ionicons name={showPassword ? "eye-outline" : "eye-off-outline"} size={20} color={colors.outline} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Keep Me Logged In */}
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                  setKeepLoggedIn(!keepLoggedIn);
                }}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.checkbox,
                    {
                      borderColor: keepLoggedIn ? colors.primary : colors.outlineVariant,
                      backgroundColor: keepLoggedIn ? colors.primaryContainer + '20' : 'transparent',
                    },
                  ]}
                >
                  <Animated.View style={checkboxAnimatedStyle}>
                    <Ionicons name="checkmark" size={14} color={colors.primary} />
                  </Animated.View>
                </View>
                <Text style={[styles.checkboxLabel, { color: colors.textSecondary }]}>
                  Keep me logged in
                </Text>
              </TouchableOpacity>

              {/* Inline Error Display */}
              {errorMsg && (
                <Animated.View
                  entering={FadeIn.duration(300)}
                  style={[
                    styles.errorBanner,
                    {
                      backgroundColor: colors.errorContainer,
                      borderColor: colors.error + '40',
                    },
                  ]}
                >
                  <Ionicons name="alert-circle" size={18} color={colors.error} />
                  <Text style={[styles.errorText, { color: colors.error }]}>{errorMsg}</Text>
                </Animated.View>
              )}

              {/* Sign In Button */}
              <TouchableOpacity
                style={[
                  styles.button,
                  { backgroundColor: colors.primary },
                  isLoading && { opacity: 0.85 }
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                  handleSignIn();
                }}
                activeOpacity={0.8}
                disabled={isLoading}
                accessibilityRole="button"
                accessibilityLabel="Sign in to ETLAB"
                accessibilityState={{ disabled: isLoading, busy: isLoading }}
                accessibilityHint="Authenticates you with your GCEK credentials"
              >
                {isLoading ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator size="small" color="#ffffff" style={{ marginRight: Spacing.two }} />
                    <Text style={styles.buttonText}>Signing you in...</Text>
                  </View>
                ) : (
                  <Text style={styles.buttonText}>Sign In  →</Text>
                )}
              </TouchableOpacity>
            </Animated.View>

            {/* Footer */}
            <View style={styles.footer}>
              <TouchableOpacity onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                Linking.openURL('https://gcek.etlab.in/user/resetpassword').catch(() => {
                  setErrorMsg('Unable to open forgot password page.');
                });
              }}>
                <Text style={[styles.footerLink, { color: colors.text }]}>
                  Forgot Password?
                </Text>
              </TouchableOpacity>
              <Text style={[styles.collegeText, { color: colors.textSecondary, marginTop: Spacing.two }]}>
                Government College of Engineering, Kannur
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.five,
  },
  cardContainer: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.four,
    position: 'relative',
  },
  heroGlow: {
    position: 'absolute',
    top: -50,
    width: 300,
    height: 300,
    borderRadius: Roundness.full,
    alignSelf: 'center',
    zIndex: -1,
  },
  iconFrame: {
    width: 68,
    height: 68,
    borderRadius: Roundness.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.three,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  title: {
    fontFamily: Fonts.headlineBold,
    fontSize: 24,
    textAlign: 'center',
    lineHeight: 32,
  },
  subtitle: {
    fontFamily: Fonts.body,
    fontSize: 13,
    marginTop: Spacing.half,
    letterSpacing: 0.5,
  },
  form: {
    gap: Spacing.two,
  },
  inputGroup: {
    gap: Spacing.half,
  },
  label: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 13,
    paddingLeft: Spacing.half,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Roundness.default,
    paddingHorizontal: Spacing.three,
    height: 56,
  },
  inputIcon: {
    marginRight: Spacing.two,
  },
  input: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: 15,
    height: '100%',
  },
  eyeButton: {
    padding: Spacing.one,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.one,
    paddingLeft: Spacing.half,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1.5,
    borderRadius: Roundness.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.two,
  },
  checkboxLabel: {
    fontFamily: Fonts.body,
    fontSize: 13,
  },
  button: {
    height: 56,
    borderRadius: Roundness.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.two,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  buttonText: {
    color: '#ffffff',
    fontFamily: Fonts.bodyBold,
    fontSize: 15,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Roundness.default,
    borderWidth: 1,
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  errorText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 13,
    flex: 1,
  },
  footer: {
    marginTop: Spacing.four,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(195, 198, 213, 0.08)',
    paddingTop: Spacing.three,
  },
  footerLink: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 13,
    textDecorationLine: 'underline',
  },
  collegeText: {
    fontFamily: Fonts.body,
    fontSize: 12,
    textAlign: 'center',
  },
});
