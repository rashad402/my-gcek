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

export default function ResultScreen() {
  const colorScheme = useColorScheme();
  const scheme = colorScheme === 'dark' ? 'dark' : 'light';
  const colors = Colors[scheme];
  const { username } = useLogin();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.topBar, { borderBottomColor: colors.surfaceContainer }]}>
        <View>
          <Text style={[styles.topBarSub, { color: colors.textSecondary }]}>ACADEMIC RECORDS</Text>
          <Text style={[styles.topBarTitle, { color: colors.text }]}>Results</Text>
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
          <Text style={styles.placeholderEmoji}>📊</Text>
          <Text style={[styles.placeholderTitle, { color: colors.text }]}>
            Results Coming Soon
          </Text>
          <Text style={[styles.placeholderDesc, { color: colors.textSecondary }]}>
            Your semester results and GPA analysis will appear here once the module is activated.
          </Text>
        </View>

        {/* Mock semester cards */}
        <View style={[styles.semCard, { backgroundColor: colors.surfaceLowest, borderColor: colors.outlineVariant }]}>
          <Text style={[styles.semLabel, { color: colors.textSecondary }]}>SEMESTER 1</Text>
          <Text style={[styles.semGpa, { color: colors.primary }]}>— / 10.0</Text>
          <Text style={[styles.semStatus, { color: colors.textSecondary }]}>Awaiting results</Text>
        </View>

        <View style={[styles.semCard, { backgroundColor: colors.surfaceLowest, borderColor: colors.outlineVariant }]}>
          <Text style={[styles.semLabel, { color: colors.textSecondary }]}>SEMESTER 2</Text>
          <Text style={[styles.semGpa, { color: colors.primary }]}>— / 10.0</Text>
          <Text style={[styles.semStatus, { color: colors.textSecondary }]}>Awaiting results</Text>
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
  semCard: {
    padding: Spacing.three,
    borderRadius: Roundness.default,
    borderWidth: 1,
    gap: Spacing.one,
  },
  semLabel: {
    fontFamily: Fonts.label,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  semGpa: {
    fontFamily: Fonts.headlineBold,
    fontSize: 24,
  },
  semStatus: {
    fontFamily: Fonts.body,
    fontSize: 12,
    fontStyle: 'italic',
  },
});
