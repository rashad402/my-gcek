import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Colors, Fonts, Spacing, Roundness } from '@/constants/theme';
import { useColorScheme } from 'react-native';
import { useLogin } from '@/components/login-context';

export default function SurveyScreen() {
  const colorScheme = useColorScheme();
  const scheme = colorScheme === 'dark' ? 'dark' : 'light';
  const colors = Colors[scheme];
  const { username } = useLogin();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.topBar, { borderBottomColor: colors.surfaceContainer }]}>
        <View>
          <Text style={[styles.topBarSub, { color: colors.textSecondary }]}>FEEDBACK</Text>
          <Text style={[styles.topBarTitle, { color: colors.text }]}>Survey</Text>
        </View>
        <View style={[styles.profileCircle, { backgroundColor: colors.surfaceHigh }]}>
          <Text style={[styles.profileLetter, { color: colors.textSecondary }]}>
            {username ? username.charAt(0).toUpperCase() : 'U'}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Placeholder content */}
        <View style={[styles.placeholderCard, { backgroundColor: colors.surfaceContainer }]}>
          <Text style={styles.placeholderEmoji}>📋</Text>
          <Text style={[styles.placeholderTitle, { color: colors.text }]}>
            Surveys Coming Soon
          </Text>
          <Text style={[styles.placeholderDesc, { color: colors.textSecondary }]}>
            Faculty and course surveys will appear here when they become available for your semester.
          </Text>
        </View>

        {/* Info card */}
        <View style={[styles.infoCard, { backgroundColor: colors.surfaceContainer }]}>
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            ℹ️ Surveys are typically available during the last two weeks of each semester. Your responses are anonymous and help improve teaching quality.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
  },
  topBarSub: {
    fontFamily: Fonts.label,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  topBarTitle: {
    fontFamily: Fonts.headlineBold,
    fontSize: 22,
    marginTop: 2,
  },
  profileCircle: {
    width: 32,
    height: 32,
    borderRadius: Roundness.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileLetter: {
    fontFamily: Fonts.bodyBold,
    fontSize: 14,
  },
  scrollContainer: {
    padding: Spacing.four,
    gap: Spacing.four,
  },
  placeholderCard: {
    padding: Spacing.five,
    borderRadius: Roundness.md,
    alignItems: 'center',
    gap: Spacing.two,
  },
  placeholderEmoji: {
    fontSize: 40,
  },
  placeholderTitle: {
    fontFamily: Fonts.headlineBold,
    fontSize: 18,
    textAlign: 'center',
  },
  placeholderDesc: {
    fontFamily: Fonts.body,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
  infoCard: {
    padding: Spacing.three,
    borderRadius: Roundness.default,
  },
  infoText: {
    fontFamily: Fonts.body,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
});
