import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  useColorScheme,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLogin } from './login-context';
import { ProfileButton } from './profile-button';
import { Colors, Fonts, Spacing, Roundness } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { fetchAttendance, fetchAttendanceHistory } from '@/services/etlab-api';
import { parseAttendance, parseAttendanceHistory, SubjectAttendance } from '@/services/etlab-parser';
import { dataCache } from '@/services/data-cache';
import * as SecureStore from 'expo-secure-store';
import AttendanceRing from './AttendanceRing';
import AttendanceHistoryModal from './AttendanceHistoryModal';
import { AttendanceRecord } from './AttendanceCalendar';

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
  attendanceRecords: AttendanceRecord[];
}

function getSubjectName(subject: string): string {
  const match = subject.match(/[A-Z]{3}\d{3}/i);
  const cleanCode = match ? match[0].toUpperCase() : subject.trim().toUpperCase();

  // 1. Try to find in dynamic results cache
  if (dataCache.results) {
    const found = dataCache.results.find(r => {
      const rMatch = r.subject.match(/[A-Z]{3}\d{3}/i);
      const rCode = rMatch ? rMatch[0].toUpperCase() : r.subject.trim().toUpperCase();
      return rCode === cleanCode;
    });
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

  return staticMap[cleanCode] || subject;
}

function toTitleCase(str: string) {
  return str.replace(
    /\w\S*/g,
    txt =>
      txt.charAt(0).toUpperCase() +
      txt.substring(1).toLowerCase()
  );
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
  attendanceRecords,
}: SubjectCardProps) {
  const [modalVisible, setModalVisible] = useState(false);

  // Tiered color: <75% red, 75-79% yellow, 80%+ green
  const progressColor = percentage < 75 ? colors.danger : percentage < 80 ? colors.warning : colors.success;
  const variant = percentage >= 80 ? 'success' : percentage >= 75 ? 'warning' : 'danger';
  const displayName = toTitleCase(getSubjectName(subject));

  return (
    <>
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.surfaceLowest, borderColor: colors.outlineVariant }]}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardInfo}>
            <View style={styles.titleRow}>
              <Ionicons name="book-outline" size={16} color={colors.primary} style={styles.titleIcon} />
              <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>{displayName}</Text>
            </View>
            {professor ? (
              <Text style={[styles.cardProf, { color: colors.textSecondary }]}>👤 {professor} ({subject})</Text>
            ) : (
              <Text style={[styles.cardProf, { color: colors.textSecondary }]}>{subject} • Attended {attended}/{total}</Text>
            )}
          </View>

          {/* SVG Progress Ring */}
          <AttendanceRing
            percentage={percentage}
            variant={variant}
          />
        </View>

        {/* Compact status pill */}
        <View
          style={[
            styles.statusPill,
            {
              backgroundColor: `${progressColor}15`,
              borderColor: `${progressColor}30`,
            },
          ]}
        >
          <Text style={[styles.statusPillText, { color: progressColor }]}>
            {alertText}
          </Text>
        </View>
      </TouchableOpacity>

      <AttendanceHistoryModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        subject={subject}
        displayName={displayName}
        professor={professor}
        percentage={percentage}
        attended={attended}
        total={total}
        alertText={alertText}
        colors={colors}
        targetPercentage={targetPercentage}
        attendanceRecords={attendanceRecords}
      />
    </>
  );
}

const KEY_TARGET_PERCENTAGE = 'gcek_target_percentage';
const OPTIONS = [75, 80, 85, 90, 95];

export default function AttendanceDashboard() {
  const colorScheme = useColorScheme();
  const scheme = colorScheme === 'dark' ? 'dark' : 'light';
  const colors = Colors[scheme];

  const { studentId, isLoggedIn, handleSessionExpired } = useLogin();

  const [subjects, setSubjects] = useState<SubjectAttendance[]>(dataCache.attendance || []);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(dataCache.attendanceHistory || []);
  const [isLoading, setIsLoading] = useState(!dataCache.attendance || !dataCache.attendanceHistory);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [targetPercentage, setTargetPercentage] = useState<number>(75);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const [overallModalVisible, setOverallModalVisible] = useState(false);

  const [sliderAnim] = useState(new Animated.Value(0));
  const segmentWidth = 100 / OPTIONS.length;

  // Load target percentage from SecureStore
  useEffect(() => {
    const loadTargetPercentage = async () => {
      try {
        const stored = await SecureStore.getItemAsync(KEY_TARGET_PERCENTAGE);
        if (stored) {
          const val = parseInt(stored, 10);
          if (!isNaN(val) && OPTIONS.includes(val)) {
            setTargetPercentage(val);
            sliderAnim.setValue(OPTIONS.indexOf(val));
          }
        }
      } catch (err) {
        console.error('Failed to load target percentage', err);
      }
    };
    loadTargetPercentage();
  }, [sliderAnim]);

  const updateTargetPercentage = async (val: number) => {
    setTargetPercentage(val);

    Animated.spring(sliderAnim, {
      toValue: OPTIONS.indexOf(val),
      useNativeDriver: false,
    }).start();

    try {
      await SecureStore.setItemAsync(KEY_TARGET_PERCENTAGE, val.toString());
    } catch (err) {
      console.error('Failed to save target percentage', err);
    }
  };

  const loadData = useCallback(async (showRefreshingSpinner = false) => {
    if (!isLoggedIn) return;
    if (!studentId) {
      setErrorMsg('Unable to retrieve student ID for attendance records.');
      setIsLoading(false);
      setIsRefreshing(false);
      return;
    }

    const hasCache =
      dataCache.attendance &&
      dataCache.attendance.length > 0 &&
      dataCache.attendanceHistory &&
      dataCache.attendanceHistory.length > 0;
    const isStale = dataCache.isStale('attendance') || dataCache.isStale('attendanceHistory');

    // Skip network request if we have fresh cached data and aren't forcing a refresh
    if (hasCache && !isStale && !showRefreshingSpinner) {
      return;
    }

    if (showRefreshingSpinner) {
      setIsRefreshing(true);
    } else if (!hasCache) {
      setIsLoading(true);
    }
    setErrorMsg('');

    try {
      const [res, resHist] = await Promise.all([
        fetchAttendance(studentId),
        fetchAttendanceHistory()
      ]);

      if (res.sessionExpired || resHist.sessionExpired) {
        handleSessionExpired();
        return;
      }
      if (!res.ok) {
        throw new Error('Failed to retrieve attendance from ETLAB.');
      }
      if (!resHist.ok) {
        throw new Error('Failed to retrieve attendance history from ETLAB.');
      }

      const data = parseAttendance(res.html);
      
      // Parse all fetched months and concatenate them
      const rawRecords: AttendanceRecord[] = [];
      for (const html of resHist.htmls) {
        const parsed = parseAttendanceHistory(html);
        rawRecords.push(...parsed);
      }

      // Deduplicate records on date + hour key
      const seen = new Set<string>();
      const deduplicatedRecords: AttendanceRecord[] = [];
      for (const record of rawRecords) {
        const key = `${record.date}-${record.hour}`;
        if (!seen.has(key)) {
          seen.add(key);
          deduplicatedRecords.push(record);
        }
      }

      setSubjects(data);
      setAttendanceRecords(deduplicatedRecords);

      await dataCache.setAttendance(data);
      await dataCache.setAttendanceHistory(deduplicatedRecords);
    } catch (err: any) {
      if (!hasCache) {
        setErrorMsg(err.message || 'An error occurred while loading attendance.');
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [studentId, isLoggedIn, handleSessionExpired]);

  useEffect(() => {
    if (isLoggedIn) {
      loadData();
    }
  }, [loadData, isLoggedIn]);

  // Compute cumulative standing
  const totalAttended = subjects.reduce((sum, s) => sum + s.attended, 0);
  const totalHours = subjects.reduce((sum, s) => sum + s.total, 0);
  const cumulative = totalHours > 0 ? Math.round((totalAttended / totalHours) * 1000) / 10 : 0;
  // Tiered color for cumulative: <75% red, 75-79% yellow, 80%+ green
  const cumulativeColor = cumulative < 75 ? colors.danger : cumulative < 80 ? colors.warning : colors.success;

  // Process subject alerts dynamically
  const subjectsWithAlerts = subjects.map((subj) => {
    let alertText = '';
    let alertType: 'success' | 'warning' = 'success';
    const targetFraction = targetPercentage / 100;

    if (subj.total === 0) {
      alertText = 'No classes yet';
      alertType = 'success';
    } else if (subj.percentage >= targetPercentage) {
      // Safe: how many classes can the student miss?
      // x <= (attended / F) - total
      const maxMissable = Math.floor(subj.attended / targetFraction - subj.total);
      if (maxMissable <= 0) {
        alertText = '0 margin — attend next class';
        alertType = 'warning';
      } else {
        alertText = `Can miss ${maxMissable} class${maxMissable > 1 ? 'es' : ''}`;
        alertType = 'success';
      }
    } else {
      // Warning: how many consecutive classes to attend to reach targetPercentage?
      // y >= (F * total - attended) / (1 - F)
      const reqClasses = Math.max(
        1,
        Math.ceil((targetFraction * subj.total - subj.attended) / (1 - targetFraction))
      );
      alertText = `Need ${reqClasses} more class${reqClasses > 1 ? 'es' : ''}`;
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
          <TouchableOpacity
            style={[styles.cumulativeCard, { backgroundColor: cumulativeColor }]}
            onPress={() => setOverallModalVisible(true)}
            activeOpacity={0.85}
          >
            <View>
              <Text style={styles.cumulativeLabel}>CUMULATIVE STANDING</Text>
              <Text style={styles.cumulativeValue}>{cumulative}%</Text>
            </View>
            <View style={styles.avatarCircle}>
              <Ionicons name="school" size={24} color="#ffffff" />
            </View>
          </TouchableOpacity>

          {/* Target Attendance Selector */}
          <View style={[styles.targetSelectorContainer, { backgroundColor: colors.surfaceLowest, borderColor: colors.outlineVariant }]}>
            <Text style={[styles.targetSelectorTitle, { color: colors.textSecondary }]}>
              🎯 Target Attendance Threshold: <Text style={{ fontFamily: Fonts.bodyBold, color: colors.primary }}>{targetPercentage}%</Text>
            </Text>
            <View
              style={[
                styles.segmentedContainer,
                {
                  backgroundColor: colors.surfaceLow,
                },
              ]}
              onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
            >
              {/* Sliding active pill */}
              <Animated.View
                style={[
                  styles.activeSegment,
                  {
                    backgroundColor: colors.surfaceLowest,
                    transform: [
                      {
                        translateX: sliderAnim.interpolate({
                          inputRange: OPTIONS.map((_, i) => i),
                          outputRange: OPTIONS.map(
                            (_, i) => i * ((containerWidth - 8) / OPTIONS.length)
                          ),
                        }),
                      },
                    ],
                    width: `${segmentWidth - 1.6}%`,
                  },
                ]}
              />

              {OPTIONS.map((pct) => {
                const isSelected = targetPercentage === pct;

                return (
                  <TouchableOpacity
                    key={pct}
                    style={styles.segmentButton}
                    activeOpacity={0.8}
                    onPress={() => updateTargetPercentage(pct)}
                  >
                    <Text
                      style={{
                        color: isSelected
                          ? colors.text
                          : colors.textSecondary,
                        fontFamily: isSelected
                          ? Fonts.bodyBold
                          : Fonts.bodyMedium,
                        fontSize: 13,
                      }}
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
                <SubjectCard
                  key={index}
                  {...subj}
                  colors={colors}
                  targetPercentage={targetPercentage}
                  attendanceRecords={attendanceRecords}
                />
              ))
            )}
          </View>

        </ScrollView>
      )}

      <AttendanceHistoryModal
        visible={overallModalVisible}
        onClose={() => setOverallModalVisible(false)}
        subject="ALL"
        displayName="Cumulative Standing"
        professor=""
        percentage={cumulative}
        attended={totalAttended}
        total={totalHours}
        alertText={cumulative >= targetPercentage ? "Above threshold target" : "Below threshold target"}
        colors={colors}
        targetPercentage={targetPercentage}
        attendanceRecords={attendanceRecords}
      />
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
    lineHeight: 28,
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
    fontFamily: Fonts.bodyBold,
    fontSize: 36,
    letterSpacing: -0.5,
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
    lineHeight: 22,
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  titleIcon: {
    marginTop: 1,
  },
  cardTitle: {
    fontFamily: Fonts.bodyBold,
    fontSize: 16,
    lineHeight: 22,
    flex: 1,
  },
  cardProf: {
    fontFamily: Fonts.body,
    fontSize: 13,
    lineHeight: 18,
    marginLeft: 22,
  },

  statusPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    marginTop: 10,
  },
  statusPillText: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: Fonts.bodyMedium,
  },
  infoCard: {
    padding: Spacing.three,
    borderRadius: Roundness.default,
    marginTop: Spacing.two,
  },
  infoText: {
    fontFamily: Fonts.body,
    fontSize: 13,
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
    fontSize: 13,
    lineHeight: 18,
    marginTop: Spacing.two,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: Spacing.two,
  },
  errorText: {
    fontFamily: Fonts.body,
    fontSize: 13,
    lineHeight: 18,
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
    lineHeight: 18,
  },
  segmentedContainer: {
    flexDirection: 'row',
    borderRadius: 999,
    padding: 4,
    position: 'relative',
    overflow: 'hidden',
    height: 44,
  },
  activeSegment: {
    position: 'absolute',
    left: 4,
    top: 4,
    bottom: 4,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },

  simHint: {
    fontFamily: Fonts.label,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  simulatorContainer: {
    marginTop: Spacing.two,
    gap: Spacing.two,
  },
  simDivider: {
    height: 1,
    opacity: 0.1,
    marginVertical: Spacing.one,
  },
  simulatorTitle: {
    fontFamily: Fonts.bodyBold,
    fontSize: 16,
    lineHeight: 22,
    marginBottom: Spacing.half,
  },
  simulatorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.half,
  },
  simulatorLabel: {
    fontFamily: Fonts.body,
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  counterGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  counterBtn: {
    width: 28,
    height: 28,
    borderRadius: Roundness.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterBtnText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 16,
    lineHeight: 18,
  },
  counterValue: {
    fontFamily: Fonts.bodyBold,
    fontSize: 14,
    letterSpacing: -0.3,
    minWidth: 20,
    textAlign: 'center',
  },
  simResultCard: {
    flexDirection: 'row',
    padding: Spacing.two,
    borderRadius: Roundness.default,
    marginTop: Spacing.one,
    alignItems: 'center',
    gap: Spacing.two,
  },
  simResultLeft: {
    alignItems: 'center',
    paddingRight: Spacing.two,
    borderRightWidth: 1,
    borderRightColor: 'rgba(195, 198, 213, 0.15)',
    minWidth: 70,
  },
  simResultLabel: {
    fontFamily: Fonts.label,
    fontSize: 8,
    textTransform: 'uppercase',
  },
  simResultValue: {
    fontFamily: Fonts.bodyBold,
    fontSize: 18,
    letterSpacing: -0.3,
  },
  simResultRight: {
    flex: 1,
    paddingLeft: Spacing.one,
  },
  simResultText: {
    fontFamily: Fonts.body,
    fontSize: 12,
    lineHeight: 16,
  },
});
