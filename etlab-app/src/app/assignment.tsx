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
import { ProtectedScreen } from '@/components/protected-screen';
import { ProfileButton } from '@/components/profile-button';

export default function AssignmentScreen() {
  const colorScheme = useColorScheme();
  const scheme = colorScheme === 'dark' ? 'dark' : 'light';
  const colors = Colors[scheme];
  return (
    <ProtectedScreen>
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.topBar, { borderBottomColor: colors.surfaceContainer }]}>
        <View>
          <Text style={[styles.topBarSub, { color: colors.textSecondary }]}>COURSEWORK</Text>
          <Text style={[styles.topBarTitle, { color: colors.text }]}>Assignments</Text>
        </View>
        <ProfileButton />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Placeholder content */}
        <View style={[styles.placeholderCard, { backgroundColor: colors.surfaceContainer }]}>
          <Text style={styles.placeholderEmoji}>📝</Text>
          <Text style={[styles.placeholderTitle, { color: colors.text }]}>
            Assignments Coming Soon
          </Text>
          <Text style={[styles.placeholderDesc, { color: colors.textSecondary }]}>
            Your pending and submitted assignments will appear here once the module is activated.
          </Text>
        </View>

        {/* Mock assignment cards */}
        <View style={[styles.assignCard, { backgroundColor: colors.surfaceLowest, borderColor: colors.outlineVariant }]}>
          <View style={styles.assignHeader}>
            <Text style={[styles.assignTitle, { color: colors.text }]}>📖 Literature Essay</Text>
            <View style={[styles.statusBadge, { backgroundColor: 'rgba(9, 76, 178, 0.08)' }]}>
              <Text style={[styles.statusText, { color: colors.primary }]}>Pending</Text>
            </View>
          </View>
          <Text style={[styles.assignMeta, { color: colors.textSecondary }]}>Due: To be announced</Text>
        </View>

        <View style={[styles.assignCard, { backgroundColor: colors.surfaceLowest, borderColor: colors.outlineVariant }]}>
          <View style={styles.assignHeader}>
            <Text style={[styles.assignTitle, { color: colors.text }]}>🏛 Philosophy Report</Text>
            <View style={[styles.statusBadge, { backgroundColor: 'rgba(9, 76, 178, 0.08)' }]}>
              <Text style={[styles.statusText, { color: colors.primary }]}>Pending</Text>
            </View>
          </View>
          <Text style={[styles.assignMeta, { color: colors.textSecondary }]}>Due: To be announced</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
    </ProtectedScreen>
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
  assignCard: {
    padding: Spacing.three,
    borderRadius: Roundness.default,
    borderWidth: 1,
    gap: Spacing.one,
  },
  assignHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  assignTitle: {
    fontFamily: Fonts.headlineBold,
    fontSize: 15,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
    borderRadius: Roundness.sm,
  },
  statusText: {
    fontFamily: Fonts.label,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  assignMeta: {
    fontFamily: Fonts.body,
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 4,
  },
});
