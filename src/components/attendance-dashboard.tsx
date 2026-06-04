import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLogin } from './login-context';
import { ProfileButton } from './profile-button';
import { Colors, Fonts, Spacing, Roundness } from '@/constants/theme';
import { useColorScheme } from 'react-native';
import { fetchAttendance } from '@/services/etlab-api';
import { parseAttendance, SubjectAttendance } from '@/services/etlab-parser';
import { dataCache } from '@/services/data-cache';

interface SubjectCardProps {
  subject: string;
  professor: string;
  percentage: number;
  attended: number;
  total: number;
  alertText: string;
  alertType: 'success' | 'warning';
  colors: any;
}

function SubjectCard({
  subject,
  professor,
  percentage,
  attended,
  total,
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
          <Text style={[styles.cardTitle, { color: colors.text }]}>📖 {subject}</Text>
          {professor ? (
            <Text style={[styles.cardProf, { color: colors.textSecondary }]}>👤 {professor}</Text>
          ) : (
            <Text style={[styles.cardProf, { color: colors.textSecondary }]}>📊 Logged Hours: {attended}/{total}</Text>
          )}
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

  const { studentId, handleSessionExpired } = useLogin();

  const [subjects, setSubjects] = useState<SubjectAttendance[]>(dataCache.attendance || []);
  const [isLoading, setIsLoading] = useState(!dataCache.attendance);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const loadData = useCallback(async (showRefreshingSpinner = false) => {
    const hasCache = dataCache.attendance && dataCache.attendance.length > 0;

    if (showRefreshingSpinner) {
      setIsRefreshing(true);
    } else if (!hasCache) {
      setIsLoading(true);
    }
    setErrorMsg('');

    try {
      const res = await fetchAttendance(studentId);
      if (res.sessionExpired) {
        handleSessionExpired();
        return;
      }
      if (!res.ok) {
        throw new Error('Failed to retrieve attendance from ETLAB.');
      }
      const data = parseAttendance(res.html);
      setSubjects(data);
      await dataCache.setAttendance(data);
    } catch (err: any) {
      if (!hasCache) {
        setErrorMsg(err.message || 'An error occurred while loading attendance.');
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [studentId, handleSessionExpired]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Compute cumulative standing
  const totalAttended = subjects.reduce((sum, s) => sum + s.attended, 0);
  const totalHours = subjects.reduce((sum, s) => sum + s.total, 0);
  const cumulative = totalHours > 0 ? Math.round((totalAttended / totalHours) * 1000) / 10 : 0;
  const isCumulativeHigh = cumulative >= 75;

  // Process subject alerts dynamically
  const subjectsWithAlerts = subjects.map((subj) => {
    let alertText = '';
    let alertType: 'success' | 'warning' = 'success';

    if (subj.total === 0) {
      alertText = 'No classes held yet.';
      alertType = 'success';
    } else if (subj.percentage >= 75) {
      // Safe: how many classes can the student miss?
      // x <= (attended / 0.75) - total
      const maxMissable = Math.floor(subj.attended / 0.75 - subj.total);
      if (maxMissable <= 0) {
        alertText = 'You cannot miss any more classes to stay above 75%.';
        alertType = 'warning'; // critical warning even though currently >= 75%
      } else {
        alertText = `You can miss ${maxMissable} class${maxMissable > 1 ? 'es' : ''}.`;
        alertType = 'success';
      }
    } else {
      // Warning: how many consecutive classes to attend to reach 75%?
      // y >= 3*total - 4*attended
      const reqClasses = Math.max(1, 3 * subj.total - 4 * subj.attended);
      alertText = `Attend ${reqClasses} more class${reqClasses > 1 ? 'es' : ''} to reach 75%.`;
      alertType = 'warning';
    }

    return {
      ...subj,
      alertText,
      alertType,
    };
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header bar */}
      <View style={[styles.topBar, { borderBottomColor: colors.surfaceContainer }]}>
        <View>
          <Text style={[styles.topBarSub, { color: colors.textSecondary }]}>MyGCEK Student Portal</Text>
          <Text style={[styles.topBarTitle, { color: colors.text }]}>Attendance Overview</Text>
        </View>
        <ProfileButton />
      </View>

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading attendance...</Text>
        </View>
      ) : errorMsg ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={[styles.errorText, { color: colors.text }]}>{errorMsg}</Text>
          <TouchableOpacity style={[styles.retryButton, { backgroundColor: colors.primary }]} onPress={() => loadData()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={() => loadData(true)} tintColor={colors.primary} />
          }
        >
          {/* Cumulative Standing Header Card */}
          <View style={[styles.cumulativeCard, { backgroundColor: isCumulativeHigh ? colors.primary : colors.error }]}>
            <View>
              <Text style={styles.cumulativeLabel}>CUMULATIVE STANDING</Text>
              <Text style={styles.cumulativeValue}>{cumulative}%</Text>
            </View>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarIcon}>🎓</Text>
            </View>
          </View>

          {/* Subjects list */}
          <View style={styles.listSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Courses</Text>
            {subjectsWithAlerts.length === 0 ? (
              <View style={[styles.card, { backgroundColor: colors.surfaceLowest, borderColor: colors.outlineVariant, alignItems: 'center', paddingVertical: Spacing.six }]}>
                <Text style={[styles.infoText, { color: colors.textSecondary }]}>No subjects or attendance data found.</Text>
              </View>
            ) : (
              subjectsWithAlerts.map((subj, index) => (
                <SubjectCard key={index} {...subj} colors={colors} />
              ))
            )}
          </View>

          {/* Info card */}
          <View style={[styles.infoCard, { backgroundColor: colors.surfaceContainer }]}>
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              ℹ️ Attendance is fetched directly from ETLAB GCEK. A minimum threshold of 75% is required for each subject to register for exams.
            </Text>
          </View>
        </ScrollView>
      )}
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.six,
    gap: Spacing.two,
  },
  loadingText: {
    fontFamily: Fonts.body,
    fontSize: 14,
    marginTop: Spacing.two,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: Spacing.two,
  },
  errorText: {
    fontFamily: Fonts.body,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: Spacing.three,
  },
  retryButton: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Roundness.md,
  },
  retryButtonText: {
    color: '#ffffff',
    fontFamily: Fonts.bodyBold,
    fontSize: 14,
  },
});
