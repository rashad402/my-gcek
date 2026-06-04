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
import * as SecureStore from 'expo-secure-store';

interface SubjectCardProps {
  subject: string;
  professor: string;
  percentage: number;
  attended: number;
  total: number;
  alertText: string;
  alertType: 'success' | 'warning';
  colors: any;
  targetPercentage: number;
}

function getSubjectName(code: string): string {
  const cleanCode = code.trim().toUpperCase();
  
  // 1. Try to find in dynamic results cache
  if (dataCache.results) {
    const found = dataCache.results.find(r => r.subject.trim().toUpperCase() === cleanCode);
    if (found && found.subjectName) {
      return found.subjectName;
    }
  }
  
  // 2. Fallback to static mapping for common GCEK courses
  const staticMap: Record<string, string> = {
    'CST302': 'Compiler Design',
    'HUT300': 'Industrial Economics & Foreign Trade',
    'CST304': 'Computer Graphics & Image Processing',
    'CST306': 'Algorithm Analysis & Design',
    'CST308': 'Comprehensive Course Work',
    'CSL332': 'Networking Lab',
    'CSD334': 'Miniproject',
    'CST362': 'Programming in Python',
  };
  
  return staticMap[cleanCode] || code;
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
  targetPercentage,
}: SubjectCardProps) {
  const isHigh = percentage >= targetPercentage;
  const progressColor = isHigh ? colors.primary : colors.error;
  const displayName = getSubjectName(subject);

  return (
    <View style={[styles.card, { backgroundColor: colors.surfaceLowest, borderColor: colors.outlineVariant }]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardInfo}>
          <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>📖 {displayName}</Text>
          {professor ? (
            <Text style={[styles.cardProf, { color: colors.textSecondary }]}>👤 {professor} ({subject})</Text>
          ) : (
            <Text style={[styles.cardProf, { color: colors.textSecondary }]}>📊 {subject} • Logged: {attended}/{total} hrs</Text>
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

const KEY_TARGET_PERCENTAGE = 'gcek_target_percentage';

export default function AttendanceDashboard() {
  const colorScheme = useColorScheme();
  const scheme = colorScheme === 'dark' ? 'dark' : 'light';
  const colors = Colors[scheme];

  const { studentId, handleSessionExpired } = useLogin();

  const [subjects, setSubjects] = useState<SubjectAttendance[]>(dataCache.attendance || []);
  const [isLoading, setIsLoading] = useState(!dataCache.attendance);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [targetPercentage, setTargetPercentage] = useState<number>(75);

  // Load target percentage from SecureStore
  useEffect(() => {
    const loadTargetPercentage = async () => {
      try {
        const stored = await SecureStore.getItemAsync(KEY_TARGET_PERCENTAGE);
        if (stored) {
          const val = parseInt(stored, 10);
          if (!isNaN(val) && [75, 80, 85, 90, 95].includes(val)) {
            setTargetPercentage(val);
          }
        }
      } catch (err) {
        console.error('Failed to load target percentage', err);
      }
    };
    loadTargetPercentage();
  }, []);

  const updateTargetPercentage = async (val: number) => {
    setTargetPercentage(val);
    try {
      await SecureStore.setItemAsync(KEY_TARGET_PERCENTAGE, val.toString());
    } catch (err) {
      console.error('Failed to save target percentage', err);
    }
  };

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
  const isCumulativeHigh = cumulative >= targetPercentage;

  // Process subject alerts dynamically
  const subjectsWithAlerts = subjects.map((subj) => {
    let alertText = '';
    let alertType: 'success' | 'warning' = 'success';
    const targetFraction = targetPercentage / 100;

    if (subj.total === 0) {
      alertText = 'No classes held yet.';
      alertType = 'success';
    } else if (subj.percentage >= targetPercentage) {
      // Safe: how many classes can the student miss?
      // x <= (attended / F) - total
      const maxMissable = Math.floor(subj.attended / targetFraction - subj.total);
      if (maxMissable <= 0) {
        alertText = `You cannot miss any more classes to stay above ${targetPercentage}%.`;
        alertType = 'warning'; // critical warning even though currently >= target
      } else {
        alertText = `You can miss ${maxMissable} class${maxMissable > 1 ? 'es' : ''} to stay above ${targetPercentage}%.`;
        alertType = 'success';
      }
    } else {
      // Warning: how many consecutive classes to attend to reach targetPercentage?
      // y >= (F * total - attended) / (1 - F)
      const reqClasses = Math.max(
        1,
        Math.ceil((targetFraction * subj.total - subj.attended) / (1 - targetFraction))
      );
      alertText = `Attend ${reqClasses} more class${reqClasses > 1 ? 'es' : ''} to reach ${targetPercentage}%.`;
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

          {/* Target Attendance Selector */}
          <View style={[styles.targetSelectorContainer, { backgroundColor: colors.surfaceLowest, borderColor: colors.outlineVariant }]}>
            <Text style={[styles.targetSelectorTitle, { color: colors.textSecondary }]}>
              🎯 Target Attendance Threshold: <Text style={{ fontFamily: Fonts.bodyBold, color: colors.primary }}>{targetPercentage}%</Text>
            </Text>
            <View style={styles.chipsRow}>
              {[75, 80, 85, 90, 95].map((pct) => {
                const isSelected = targetPercentage === pct;
                return (
                  <TouchableOpacity
                    key={pct}
                    activeOpacity={0.7}
                    onPress={() => updateTargetPercentage(pct)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: isSelected ? colors.primary : colors.surfaceLow,
                        borderColor: isSelected ? colors.primary : colors.outlineVariant,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        {
                          color: isSelected ? (scheme === 'dark' ? '#1b1c1d' : '#ffffff') : colors.text,
                          fontFamily: isSelected ? Fonts.bodyBold : Fonts.bodyMedium,
                        },
                      ]}
                    >
                      {pct}%
                    </Text>
                  </TouchableOpacity>
                );
              })}
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
                <SubjectCard key={index} {...subj} colors={colors} targetPercentage={targetPercentage} />
              ))
            )}
          </View>

          {/* Info card */}
          <View style={[styles.infoCard, { backgroundColor: colors.surfaceContainer }]}>
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              ℹ️ Attendance is fetched directly from ETLAB GCEK. A minimum threshold of 75% is required for each subject to register for exams. Calculations are based on your target of {targetPercentage}%.
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
  targetSelectorContainer: {
    padding: Spacing.three,
    borderRadius: Roundness.default,
    borderWidth: 1,
    gap: Spacing.two,
  },
  targetSelectorTitle: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 13,
  },
  chipsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.one,
  },
  chip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: Roundness.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  chipText: {
    fontSize: 13,
  },
});
