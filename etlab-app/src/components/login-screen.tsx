import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useLogin } from './login-context';
import { Colors, Fonts, Spacing, Roundness } from '@/constants/theme';
import { useColorScheme } from 'react-native';

export default function LoginScreen() {
  const colorScheme = useColorScheme();
  const scheme = colorScheme === 'dark' ? 'dark' : 'light';
  const colors = Colors[scheme];

  const { login } = useLogin();

  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [keepLoggedIn, setKeepLoggedIn] = useState(false);

  const handleSignIn = () => {
    const trimmedUser = usernameInput.trim();
    const trimmedPass = passwordInput.trim();

    if (!trimmedUser || !trimmedPass) {
      Alert.alert('Required Fields', 'Please fill in both University ID and Password.');
      return;
    }

    // Dummy Credentials Verification
    if (
      (trimmedUser.toLowerCase() === 'admin' && trimmedPass === 'password') ||
      (trimmedUser.toUpperCase() === 'GCEK2026' && trimmedPass === 'password')
    ) {
      login(trimmedUser);
    } else {
      Alert.alert(
        'Invalid Credentials',
        'Use the test credentials:\nID: admin  or  GCEK2026\nPassword: password'
      );
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.cardContainer}>
            {/* Header Section */}
            <View style={styles.header}>
              <View style={[styles.iconFrame, { backgroundColor: colors.surfaceContainer }]}>
                <Text style={[styles.logoIcon, { color: colors.primary }]}>🏛️</Text>
              </View>
              <Text style={[styles.title, { color: colors.text }]}>Welcome to ETLAB GCEK</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>The Digital Curator</Text>
            </View>

            {/* Login Form */}
            <View style={styles.form}>
              {/* Input Group: Username */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>University ID</Text>
                <View style={[styles.inputWrapper, { borderColor: colors.outlineVariant }]}>
                  <Text style={styles.inputIcon}>👤</Text>
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="Enter your ID (e.g. admin)"
                    placeholderTextColor={colors.outline}
                    value={usernameInput}
                    onChangeText={setUsernameInput}
                    autoCapitalize="none"
                  />
                </View>
              </View>

              {/* Input Group: Password */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Password</Text>
                <View style={[styles.inputWrapper, { borderColor: colors.outlineVariant }]}>
                  <Text style={styles.inputIcon}>🔑</Text>
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="Enter password (e.g. password)"
                    placeholderTextColor={colors.outline}
                    value={passwordInput}
                    onChangeText={setPasswordInput}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeButton}
                  >
                    <Text style={styles.eyeText}>{showPassword ? '👁️' : '🕶️'}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Keep Me Logged In */}
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setKeepLoggedIn(!keepLoggedIn)}
              >
                <View
                  style={[
                    styles.checkbox,
                    {
                      borderColor: colors.outlineVariant,
                      backgroundColor: keepLoggedIn ? colors.primary : 'transparent',
                    },
                  ]}
                >
                  {keepLoggedIn && <Text style={styles.checkMark}>✓</Text>}
                </View>
                <Text style={[styles.checkboxLabel, { color: colors.textSecondary }]}>
                  Keep me logged in
                </Text>
              </TouchableOpacity>

              {/* Sign In Button */}
              <TouchableOpacity
                style={[styles.button, { backgroundColor: colors.primary }]}
                onPress={handleSignIn}
                activeOpacity={0.8}
              >
                <Text style={styles.buttonText}>Sign In  →</Text>
              </TouchableOpacity>
            </View>

            {/* Test Credentials Hint */}
            <View style={[styles.hintCard, { backgroundColor: colors.surfaceContainer }]}>
              <Text style={[styles.hintTitle, { color: colors.primary }]}>🔑 Test Credentials</Text>
              <Text style={[styles.hintText, { color: colors.textSecondary }]}>
                University ID: <Text style={styles.boldText}>admin</Text> or <Text style={styles.boldText}>GCEK2026</Text>
              </Text>
              <Text style={[styles.hintText, { color: colors.textSecondary }]}>
                Password: <Text style={styles.boldText}>password</Text>
              </Text>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <TouchableOpacity>
                <Text style={[styles.footerLink, { color: colors.text, borderBottomColor: colors.outlineVariant }]}>
                  Forgot Password?
                </Text>
              </TouchableOpacity>
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
    marginBottom: Spacing.five,
  },
  iconFrame: {
    width: 64,
    height: 64,
    borderRadius: Roundness.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  logoIcon: {
    fontSize: 28,
  },
  title: {
    fontFamily: Fonts.headline,
    fontSize: 28,
    textAlign: 'center',
    lineHeight: 36,
  },
  subtitle: {
    fontFamily: Fonts.body,
    fontSize: 14,
    marginTop: Spacing.one,
    letterSpacing: 0.5,
  },
  form: {
    gap: Spacing.three,
  },
  inputGroup: {
    gap: Spacing.one,
  },
  label: {
    fontFamily: Fonts.label,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    paddingLeft: Spacing.half,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Roundness.default,
    paddingHorizontal: Spacing.three,
    height: 56,
  },
  inputIcon: {
    fontSize: 16,
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
  eyeText: {
    fontSize: 16,
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
    borderWidth: 1,
    borderRadius: Roundness.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.two,
  },
  checkMark: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
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
    marginTop: Spacing.three,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  buttonText: {
    color: '#ffffff',
    fontFamily: Fonts.labelBold,
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  hintCard: {
    marginTop: Spacing.four,
    padding: Spacing.three,
    borderRadius: Roundness.default,
    borderWidth: 1,
    borderColor: 'rgba(195, 198, 213, 0.1)',
  },
  hintTitle: {
    fontFamily: Fonts.bodyBold,
    fontSize: 13,
    marginBottom: Spacing.half,
  },
  hintText: {
    fontFamily: Fonts.body,
    fontSize: 12,
    marginTop: 2,
  },
  boldText: {
    fontWeight: 'bold',
  },
  footer: {
    marginTop: Spacing.five,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(195, 198, 213, 0.1)',
    paddingTop: Spacing.three,
  },
  footerLink: {
    fontFamily: Fonts.body,
    fontSize: 13,
    textDecorationLine: 'underline',
  },
});
