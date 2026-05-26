import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { useLogin } from './login-context';
import { ProfileButton } from './profile-button';
import { Colors, Fonts, Spacing, Roundness } from '@/constants/theme';
import { useColorScheme } from 'react-native';

interface SubjectCardProps {
  title: string;
  professor: string;
  percentage: number;
  alertText: string;
  alertType: 'success' | 'warning';
  colors: any;
}

function SubjectCard({
  title,
  professor,
  percentage,
  alertText,
  alertType,
  colors,
}: SubjectCardProps) {
  const isHigh = percentage >= 75;
  const progressColor = isHigh ? colors.primary : colors.error;

  return (
    <View style={[styles.card, { backgroundColor: colors.surfaceLowest, borderColor: colors.outlineVariant }]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardInfo}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>📖 {title}</Text>
          <Text style={[styles.cardProf, { color: colors.textSecondary }]}>👤 {professor}</Text>
        </View>
        
        {/* Simple visual circle container */}
        <View style={[styles.percentageContainer, { borderColor: progressColor }]}>
          <Text style={[styles.percentageText, { color: progressColor }]}>{percentage}%</Text>
        </View>
      </View>

      {/* Spacing */}
      <View style={styles.divider} />

      {/* Alert Banner inside card */}
      <View
        style={[
          styles.alertBanner,
          {
            backgroundColor:
              alertType === 'success'
                ? 'rgba(9, 76, 178, 0.05)'
                : 'rgba(186, 26, 26, 0.05)',
            borderColor:
              alertType === 'success'
                ? 'rgba(9, 76, 178, 0.1)'
                : 'rgba(186, 26, 26, 0.1)',
          },
        ]}
      >
        <Text
          style={[
            styles.alertText,
            { color: alertType === 'success' ? colors.primary : colors.error },
          ]}
        >
          {alertType === 'success' ? '💡' : '⚠️'} {alertText}
        </Text>
      </View>
    </View>
  );
}

export default function AttendanceDashboard() {
  const colorScheme = useColorScheme();
  const scheme = colorScheme === 'dark' ? 'dark' : 'light';
  const colors = Colors[scheme];

  const { username } = useLogin();

  const subjects: Omit<SubjectCardProps, 'colors'>[] = [
    {
      title: 'Advanced Literature',
      professor: 'Prof. E. Sterling',
      percentage: 95,
      alertText: 'You can miss 4 classes.',
      alertType: 'success',
    },
    {
      title: 'Classical Philosophy',
      professor: 'Dr. A. Vance',
      percentage: 68,
      alertText: 'Attend 3 more classes to reach 75%.',
      alertType: 'warning',
    },
    {
      title: 'Modern History',
      professor: 'Prof. M. Rossi',
      percentage: 100,
      alertText: 'You can miss 6 classes.',
      alertType: 'success',
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header bar */}
      <View style={[styles.topBar, { borderBottomColor: colors.surfaceContainer }]}>
        <View>
          <Text style={[styles.topBarSub, { color: colors.textSecondary }]}>FALL SEMESTER 2024</Text>
          <Text style={[styles.topBarTitle, { color: colors.text }]}>Attendance Overview</Text>
        </View>
        <ProfileButton />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Cumulative Standing Header Card */}
        <View style={[styles.cumulativeCard, { backgroundColor: colors.primary }]}>
          <View>
            <Text style={styles.cumulativeLabel}>CUMULATIVE STANDING</Text>
            <Text style={styles.cumulativeValue}>92.4%</Text>
          </View>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarIcon}>🎓</Text>
          </View>
        </View>

        {/* Subjects list */}
        <View style={styles.listSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Courses</Text>
          {subjects.map((subj, index) => (
            <SubjectCard key={index} {...subj} colors={colors} />
          ))}
        </View>

        {/* Info card */}
        <View style={[styles.infoCard, { backgroundColor: colors.surfaceContainer }]}>
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            ℹ️ Attendance is updated every day at 5:00 PM. A minimum threshold of 75% is required to avoid penalty charges.
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
  cumulativeCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.four,
    borderRadius: Roundness.md,
    shadowColor: '#094cb2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  cumulativeLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontFamily: Fonts.label,
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  cumulativeValue: {
    color: '#ffffff',
    fontFamily: Fonts.headlineBold,
    fontSize: 36,
    marginTop: Spacing.one,
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: Roundness.full,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarIcon: {
    fontSize: 24,
  },
  listSection: {
    gap: Spacing.three,
  },
  sectionTitle: {
    fontFamily: Fonts.bodyBold,
    fontSize: 16,
    marginBottom: Spacing.half,
  },
  card: {
    padding: Spacing.three,
    borderRadius: Roundness.default,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardInfo: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    fontFamily: Fonts.headlineBold,
    fontSize: 16,
  },
  cardProf: {
    fontFamily: Fonts.body,
    fontSize: 13,
  },
  percentageContainer: {
    width: 52,
    height: 52,
    borderRadius: Roundness.full,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: Spacing.two,
  },
  percentageText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 13,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(195, 198, 213, 0.1)',
    marginVertical: Spacing.two,
  },
  alertBanner: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Roundness.sm,
    borderWidth: 1,
  },
  alertText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 12,
  },
  infoCard: {
    padding: Spacing.three,
    borderRadius: Roundness.default,
    marginTop: Spacing.two,
  },
  infoText: {
    fontFamily: Fonts.body,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
});
