import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Pressable,
  useColorScheme,
  Animated,
  LayoutAnimation,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLogin } from './login-context';
import { ProfileButton } from './profile-button';
import { Colors, Fonts, Spacing, Roundness, ThemeColors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { getStatusTier, getStatusColor } from '@/services/attendance-status';
import { fetchAttendance, fetchAttendanceHistory, fetchTimetable } from '@/services/etlab-api';
import { parseAttendance, parseAttendanceHistory, parseTimetable, SubjectAttendance, TimetableData } from '@/services/etlab-parser';
import { dataCache } from '@/services/data-cache';
import * as SecureStore from 'expo-secure-store';
import * as Haptics from 'expo-haptics';
import { getSubjectName } from '@/services/subject-helper';
import AttendanceRing from './AttendanceRing';
import AttendanceHistoryModal from './AttendanceHistoryModal';
import { AttendanceRecord } from './AttendanceCalendar';
import TimetableModal from './TimetableModal';

interface SubjectCardProps {
  subject: string;
  professor: string;
  percentage: number;
  attended: number;
  total: number;
  alertText: string;
  alertType: 'success' | 'warning';
  colors: ThemeColors;
  targetPercentage: number;
  attendanceRecords: AttendanceRecord[];
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

  const variant = getStatusTier(percentage, targetPercentage);
  const progressColor = getStatusColor(percentage, targetPercentage, colors);
  const displayName = toTitleCase(getSubjectName(subject));

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${displayName}, ${percentage}% attendance, ${attended} of ${total} classes attended. ${alertText}. Tap for history.`}
        style={({ pressed }) => [
          styles.card,
          { backgroundColor: colors.surfaceLowest, borderColor: colors.outlineVariant },
          pressed && { transform: [{ scale: 0.98 }], opacity: 0.9 },
        ]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setModalVisible(true);
        }}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardInfo}>
            <View style={styles.titleRow}>
              <Ionicons name="book-outline" size={16} color={colors.primary} style={styles.titleIcon} />
              <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>{displayName}</Text>
            </View>
            {professor ? (
              <View style={styles.profRow}>
                <Ionicons name="person-outline" size={12} color={colors.textSecondary} />
                <Text style={[styles.cardProfText, { color: colors.textSecondary }]}>{professor} ({subject})</Text>
              </View>
            ) : (
              <View style={styles.profRow}>
                <Ionicons name="stats-chart-outline" size={12} color={colors.textSecondary} />
                <Text style={[styles.cardProfText, { color: colors.textSecondary }]}>{subject} • Attended {attended}/{total}</Text>
              </View>
            )}
          </View>

          <View style={styles.ringAndAffordance}>
            <AttendanceRing
              percentage={percentage}
              variant={variant}
              colors={colors}
            />
            <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} style={{ marginLeft: 6 }} />
          </View>
        </View>

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
      </Pressable>

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

function SkeletonCard({ colors }: { colors: any }) {
  const pulse = React.useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, [pulse]);

  return (
    <Animated.View style={[styles.card, { opacity: pulse, backgroundColor: colors.surfaceLowest, borderColor: colors.outlineVariant }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ gap: 8, flex: 1 }}>
          <View style={{ height: 16, width: '75%', borderRadius: 4, backgroundColor: colors.surfaceContainer }} />
          <View style={{ height: 12, width: '50%', borderRadius: 4, backgroundColor: colors.surfaceContainer }} />
        </View>
        <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.surfaceContainer }} />
      </View>
    </Animated.View>
  );
}

const KEY_TARGET_PERCENTAGE = 'gcek_target_percentage';
const OPTIONS = [75, 80, 85, 90, 95];

export default function AttendanceDashboard() {
  const colorScheme = useColorScheme();
  const scheme = colorScheme === 'dark' ? 'dark' : 'light';
  const colors = Colors[scheme];

  const { studentId, username, isLoggedIn, handleSessionExpired } = useLogin();

  const [subjects, setSubjects] = useState<SubjectAttendance[]>(dataCache.attendance || []);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(dataCache.attendanceHistory || []);
  const [timetable, setTimetable] = useState<TimetableData | null>(dataCache.timetable || null);
  const [isLoading, setIsLoading] = useState(!dataCache.attendance || !dataCache.attendanceHistory || !dataCache.timetable);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [targetPercentage, setTargetPercentage] = useState<number>(75);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const [overallModalVisible, setOverallModalVisible] = useState(false);
  const [timetableModalVisible, setTimetableModalVisible] = useState(false);
  
  // Filter chips state: 'all' | 'below' | 'safe'
  const [filter, setFilter] = useState<'all' | 'below' | 'safe'>('all');

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
    Haptics.selectionAsync();

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
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
      dataCache.attendanceHistory.length > 0 &&
      dataCache.timetable;
    const isStale = dataCache.isStale('attendance') || dataCache.isStale('attendanceHistory') || dataCache.isStale('timetable');

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
      const fetchTimetablePromise = (!dataCache.timetable || dataCache.isStale('timetable') || showRefreshingSpinner)
        ? fetchTimetable()
        : null;

      const [res, resHist, resTimetable] = await Promise.all([
        fetchAttendance(studentId),
        fetchAttendanceHistory(),
        fetchTimetablePromise,
      ]);

      if (res.sessionExpired || resHist.sessionExpired || (resTimetable && resTimetable.sessionExpired)) {
        handleSessionExpired();
        return;
      }
      if (!res.ok) {
        throw new Error('Failed to retrieve attendance from ETLAB.');
      }
      if (!resHist.ok) {
        throw new Error('Failed to retrieve attendance history from ETLAB.');
      }

      const data = parseAttendance(res.html, username);
      
      const rawRecords: AttendanceRecord[] = [];
      for (const html of resHist.htmls) {
        const parsed = parseAttendanceHistory(html);
        rawRecords.push(...parsed);
      }

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

      if (resTimetable && resTimetable.ok) {
        try {
          const ttData = parseTimetable(resTimetable.html);
          setTimetable(ttData);
          await dataCache.setTimetable(ttData);
        } catch (ttErr) {
          console.warn('Failed to parse timetable HTML:', ttErr);
        }
      }
    } catch (err: any) {
      if (!hasCache) {
        setErrorMsg(err.message || 'An error occurred while loading attendance.');
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [studentId, username, isLoggedIn, handleSessionExpired]);

  useEffect(() => {
    if (isLoggedIn) {
      loadData();
    }
  }, [loadData, isLoggedIn]);

  // Compute cumulative standing
  const totalAttended = subjects.reduce((sum, s) => sum + s.attended, 0);
  const totalHours = subjects.reduce((sum, s) => sum + s.total, 0);
  const cumulative = totalHours > 0 ? Math.round((totalAttended / totalHours) * 1000) / 10 : 0;
  const cumulativeColor = getStatusColor(cumulative, targetPercentage, colors);

  // Number counting animation on loading complete
  const [animatedCumulative, setAnimatedCumulative] = useState(0);
  useEffect(() => {
    if (!isLoading && cumulative > 0) {
      let start = 0;
      const end = cumulative;
      const duration = 750;
      const stepTime = 16;
      const steps = duration / stepTime;
      const stepValue = end / steps;
      
      const timer = setInterval(() => {
        start += stepValue;
        if (start >= end) {
          setAnimatedCumulative(end);
          clearInterval(timer);
        } else {
          setAnimatedCumulative(Math.round(start * 10) / 10);
        }
      }, stepTime);
      
      return () => clearInterval(timer);
    }
  }, [isLoading, cumulative]);

  // Last Updated cache timestamp check
  const [lastUpdatedText, setLastUpdatedText] = useState<string | null>(null);
  const updateLastUpdatedText = useCallback(() => {
    const time = dataCache.lastUpdated.attendance;
    if (!time) {
      setLastUpdatedText(null);
      return;
    }
    const diffMins = Math.floor((Date.now() - time) / (60 * 1000));
    if (diffMins < 1) {
      setLastUpdatedText('Sync status: updated just now');
    } else if (diffMins < 60) {
      setLastUpdatedText(`Sync status: updated ${diffMins}m ago`);
    } else {
      const diffHrs = Math.floor(diffMins / 60);
      if (diffHrs < 24) {
        setLastUpdatedText(`Sync status: updated ${diffHrs}h ago`);
      } else {
        const diffDays = Math.floor(diffHrs / 24);
        setLastUpdatedText(`Sync status: updated ${diffDays}d ago`);
      }
    }
  }, []);

  useEffect(() => {
    updateLastUpdatedText();
    const interval = setInterval(updateLastUpdatedText, 30000);
    return () => clearInterval(interval);
  }, [updateLastUpdatedText, subjects]);

  // Process subject alerts dynamically
  const subjectsWithAlerts = subjects.map((subj) => {
    let alertText = '';
    let alertType: 'success' | 'warning' = 'success';
    const targetFraction = targetPercentage / 100;

    if (subj.total === 0) {
      alertText = 'No classes yet';
      alertType = 'success';
    } else if (subj.percentage >= targetPercentage) {
      const maxMissable = Math.floor(subj.attended / targetFraction - subj.total);
      if (maxMissable <= 0) {
        alertText = '0 margin — attend next class';
        alertType = 'warning';
      } else {
        alertText = `Can miss ${maxMissable} class${maxMissable > 1 ? 'es' : ''}`;
        alertType = 'success';
      }
    } else {
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

  // Filter and sort by risk (lowest percentage first)
  const filteredSubjects = subjectsWithAlerts.filter((s) => {
    if (filter === 'below') return s.percentage < targetPercentage;
    if (filter === 'safe') return s.percentage >= targetPercentage;
    return true;
  });
  const sortedSubjects = [...filteredSubjects].sort((a, b) => a.percentage - b.percentage);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header bar */}
      <View style={[styles.topBar, { borderBottomColor: colors.outlineVariant }]}>
        <View>
          <Text style={[styles.topBarSub, { color: colors.textSecondary }]}>MyGCEK Student Portal</Text>
          <Text style={[styles.topBarTitle, { color: colors.text }]}>Attendance Overview</Text>
        </View>
        <ProfileButton />
      </View>

      {isLoading ? (
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          <View style={[styles.cumulativeCard, { backgroundColor: colors.surfaceContainer, height: 92, marginBottom: Spacing.four }]} />
          {[...Array(5)].map((_, i) => (
            <SkeletonCard key={i} colors={colors} />
          ))}
        </ScrollView>
      ) : errorMsg ? (
        <View style={styles.centerContainer}>
          <Ionicons
            name={errorMsg.includes('connection') || errorMsg.includes('connect') ? 'cloud-offline-outline' : 'warning-outline'}
            size={48}
            color={colors.danger}
            style={{ marginBottom: Spacing.two }}
          />
          <Text style={[styles.errorTitle, { color: colors.text }]}>
            {errorMsg.includes('connection') || errorMsg.includes('connect') ? 'Connection Error' : 'Sync Error'}
          </Text>
          <Text style={[styles.errorText, { color: colors.textSecondary }]}>{errorMsg}</Text>
          <Text style={[styles.errorHint, { color: colors.textSecondary }]}>Pull down to retry or click below</Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              loadData();
            }}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={() => loadData(true)} tintColor={colors.primary} />
          }
        >
          {/* Cumulative Standing Header Card */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Cumulative standing, ${cumulative}% attendance. ${totalAttended} of ${totalHours} total hours. Tap to view overall details.`}
            style={({ pressed }) => [
              styles.cumulativeCard,
              { backgroundColor: cumulativeColor },
              pressed && { transform: [{ scale: 0.98 }], opacity: 0.9 }
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setOverallModalVisible(true);
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.cumulativeLabel}>CUMULATIVE STANDING</Text>
              <Text style={styles.cumulativeValue}>{animatedCumulative}%</Text>
              
              <View style={styles.heroStatsRow}>
                <Ionicons name="time-outline" size={12} color="rgba(255,255,255,0.85)" />
                <Text style={styles.heroStat}>{totalAttended}/{totalHours} hrs</Text>
                <Text style={styles.heroStatDot}>•</Text>
                <Ionicons name="alert-circle-outline" size={12} color="rgba(255,255,255,0.85)" />
                <Text style={styles.heroStat}>
                  {subjectsWithAlerts.filter(s => s.percentage < targetPercentage).length} below target
                </Text>
              </View>
            </View>
            <View style={styles.avatarCircle}>
              <Ionicons name="school-outline" size={24} color="#ffffff" />
            </View>
          </Pressable>

          {/* Stale Cache Banner */}
          {lastUpdatedText && (
            <View style={[styles.staleBanner, { backgroundColor: colors.surfaceContainer, borderColor: colors.outlineVariant }]}>
              <Ionicons name="cloud-done-outline" size={14} color={colors.textSecondary} />
              <Text style={[styles.staleText, { color: colors.textSecondary }]}>
                {lastUpdatedText}
              </Text>
            </View>
          )}

          {/* Target Attendance Selector */}
          <View style={[styles.targetSelectorContainer, { backgroundColor: colors.surfaceLowest, borderColor: colors.outlineVariant }]}>
            <Text style={[styles.targetSelectorTitle, { color: colors.textSecondary }]}>
              <Ionicons name="compass-outline" size={14} color={colors.primary} style={{ marginRight: 4 }} />
              Target Attendance Threshold: <Text style={{ fontFamily: Fonts.bodyBold, color: colors.primary }}>{targetPercentage}%</Text>
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
              {/* Sliding active pill with render guard */}
              {containerWidth > 0 && (
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
              )}

              {OPTIONS.map((pct) => {
                const isSelected = targetPercentage === pct;

                return (
                  <TouchableOpacity
                    key={pct}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: isSelected }}
                    accessibilityLabel={`Set target threshold to ${pct}%`}
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

          {/* Filter Chips */}
          <View style={styles.filterContainer}>
            {(['all', 'below', 'safe'] as const).map((type) => {
              const isSelected = filter === type;
              const label = type === 'all' ? 'All' : type === 'below' ? 'Below Target' : 'Safe';
              const count = type === 'all' 
                ? subjectsWithAlerts.length 
                : type === 'below' 
                  ? subjectsWithAlerts.filter(s => s.percentage < targetPercentage).length
                  : subjectsWithAlerts.filter(s => s.percentage >= targetPercentage).length;

              return (
                <TouchableOpacity
                  key={type}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={`${label} filter chip, ${count} courses`}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: isSelected ? colors.primary : colors.surfaceContainer,
                      borderColor: isSelected ? colors.primary : colors.outlineVariant,
                    }
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setFilter(type);
                  }}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      {
                        color: isSelected ? '#ffffff' : colors.textSecondary,
                        fontFamily: isSelected ? Fonts.bodyBold : Fonts.bodyMedium,
                      }
                    ]}
                  >
                    {label} ({count})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Subjects list */}
          <View style={styles.listSection}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Courses</Text>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Open weekly timetable modal"
                style={[styles.timetableButton, { backgroundColor: colors.surfaceContainer, borderColor: colors.outlineVariant }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setTimetableModalVisible(true);
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="calendar-outline" size={14} color={colors.primary} style={{ marginRight: 4 }} />
                <Text style={[styles.timetableButtonText, { color: colors.primary }]}>Timetable</Text>
              </TouchableOpacity>
            </View>
            {sortedSubjects.length === 0 ? (
              <View style={[styles.card, { backgroundColor: colors.surfaceLowest, borderColor: colors.outlineVariant, alignItems: 'center', paddingVertical: Spacing.six }]}>
                <Ionicons name="file-tray-outline" size={32} color={colors.textSecondary} style={{ opacity: 0.5, marginBottom: 8 }} />
                <Text style={[styles.infoText, { color: colors.textSecondary }]}>No courses fit the active filter.</Text>
              </View>
            ) : (
              sortedSubjects.map((subj) => (
                <SubjectCard
                  key={subj.subject}
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

      <TimetableModal
        visible={timetableModalVisible}
        onClose={() => setTimetableModalVisible(false)}
        colors={colors}
        timetableData={timetable}
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
  heroStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: Spacing.one,
  },
  heroStat: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontFamily: Fonts.bodyMedium,
    fontSize: 12,
  },
  heroStatDot: {
    color: 'rgba(255, 255, 255, 0.5)',
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: Roundness.full,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listSection: {
    gap: Spacing.three,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.half,
  },
  timetableButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half + 2,
    borderRadius: Roundness.full,
    borderWidth: 1,
  },
  timetableButtonText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 12,
  },
  sectionTitle: {
    fontFamily: Fonts.bodyBold,
    fontSize: 16,
    lineHeight: 22,
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
  profRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 22,
    marginTop: 2,
  },
  cardProfText: {
    fontFamily: Fonts.body,
    fontSize: 13,
    lineHeight: 18,
  },
  ringAndAffordance: {
    flexDirection: 'row',
    alignItems: 'center',
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
  errorTitle: {
    fontFamily: Fonts.bodyBold,
    fontSize: 16,
    lineHeight: 22,
  },
  errorText: {
    fontFamily: Fonts.body,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  errorHint: {
    fontFamily: Fonts.body,
    fontSize: 12,
    fontStyle: 'italic',
    marginBottom: Spacing.two,
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
    flexDirection: 'row',
    alignItems: 'center',
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
  staleBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: Roundness.md,
    borderWidth: 1,
  },
  staleText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 11,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.two,
    paddingHorizontal: 2,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Roundness.full,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 12,
    lineHeight: 16,
  },
});
