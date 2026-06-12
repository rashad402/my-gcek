import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp, FadeOutDown, LinearTransition } from 'react-native-reanimated';
import { Fonts, Spacing, Roundness, ThemeColors } from '@/constants/theme';
import { getSubjectName } from '@/services/subject-helper';
import * as Haptics from 'expo-haptics';

export interface AttendanceRecord {
  date: string;      // 'YYYY-MM-DD'
  subject: string;   // subject code
  hour: number;
  status: 'present' | 'absent';
}

interface Props {
  records: AttendanceRecord[];
  subjectCode: string;
  colors: ThemeColors;
}

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

// Hoisted pure function to extract course code cleanly
const getCode = (str: string) => {
  const match = str.match(/[A-Z]{2,4}\d{2,4}[A-Z]?/i);
  return match ? match[0].toUpperCase() : str.trim().toUpperCase();
};

export default function AttendanceCalendar({ records, subjectCode, colors }: Props) {
  const now = new Date();
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  // Deselect selectedDate when currentMonth, currentYear, or subjectCode changes
  useEffect(() => {
    setSelectedDate(null);
  }, [currentMonth, currentYear, subjectCode]);

  // Track if auto-navigation has initialised for the current subjectCode
  const didInitNav = useRef(false);
  const lastSubjectCode = useRef(subjectCode);

  useEffect(() => {
    if (lastSubjectCode.current !== subjectCode) {
      didInitNav.current = false;
      lastSubjectCode.current = subjectCode;
    }
  }, [subjectCode]);

  // Auto-navigate to the latest month that has records for this subject
  useEffect(() => {
    if (didInitNav.current || records.length === 0) return;

    const targetCode = subjectCode ? getCode(subjectCode) : '';
    const isAllMode = !subjectCode || subjectCode === 'ALL' || subjectCode.trim() === '';
    const subjectRecords = isAllMode
      ? records
      : records.filter(r => getCode(r.subject) === targetCode);

    if (subjectRecords.length === 0) return;

    didInitNav.current = true;
    const sorted = [...subjectRecords].sort((a, b) => a.date.localeCompare(b.date));
    const lastRecord = sorted[sorted.length - 1];
    const parts = lastRecord.date.split('-');
    if (parts.length === 3) {
      const recYear = parseInt(parts[0], 10);
      const recMonth = parseInt(parts[1], 10) - 1; // Convert to 0-indexed
      if (!isNaN(recYear) && !isNaN(recMonth)) {
        setCurrentYear(recYear);
        setCurrentMonth(recMonth);
      }
    }
  }, [records, subjectCode]);

  const handleDatePress = (dateStr: string) => {
    if (selectedDate === dateStr) {
      setSelectedDate(null);
    } else {
      setSelectedDate(dateStr);
    }
  };

  const formatSelectedDate = (dateStr: string) => {
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);

    const dateObj = new Date(y, m, d);
    if (isNaN(dateObj.getTime())) return dateStr;

    const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dateObj.getDay()];
    const monthName = MONTH_NAMES[m];
    return `${dayOfWeek}, ${d} ${monthName} ${y}`;
  };

  // Filter records for the selected date
  const selectedDayRecords = useMemo(() => {
    if (!selectedDate) return [];

    const targetCode = subjectCode ? getCode(subjectCode) : '';
    const isAllMode = !subjectCode || subjectCode === 'ALL' || subjectCode.trim() === '';

    return records
      .filter(r => {
        const isSameDate = r.date === selectedDate;
        if (!isSameDate) return false;
        if (isAllMode) return true;
        return getCode(r.subject) === targetCode;
      })
      .sort((a, b) => a.hour - b.hour);
  }, [records, selectedDate, subjectCode]);

  // Filter records for this subject and build a map: date -> 'present' | 'absent' | 'partial'
  const dayStatusMap = useMemo(() => {
    const map: Record<string, 'present' | 'absent' | 'partial'> = {};
    const targetCode = subjectCode ? getCode(subjectCode) : '';
    const isAllMode = !subjectCode || subjectCode === 'ALL' || subjectCode.trim() === '';

    const subjectRecords = isAllMode
      ? records
      : records.filter(r => getCode(r.subject) === targetCode);

    // Group by date
    const byDate: Record<string, AttendanceRecord[]> = {};
    for (const r of subjectRecords) {
      if (!byDate[r.date]) byDate[r.date] = [];
      byDate[r.date].push(r);
    }

    for (const [date, recs] of Object.entries(byDate)) {
      const allPresent = recs.every(r => r.status === 'present');
      const allAbsent = recs.every(r => r.status === 'absent');
      if (allPresent) {
        map[date] = 'present';
      } else if (allAbsent) {
        map[date] = 'absent';
      } else {
        map[date] = 'partial';
      }
    }

    return map;
  }, [records, subjectCode]);

  // Block infinite empty navigation
  const hasNextData = useMemo(() => {
    const cursor = currentYear * 12 + currentMonth;
    return Object.keys(dayStatusMap).some(d => {
      const [y, m] = d.split('-').map(Number);
      return (y * 12 + (m - 1)) > cursor;
    });
  }, [dayStatusMap, currentYear, currentMonth]);

  const hasPrevData = useMemo(() => {
    const cursor = currentYear * 12 + currentMonth;
    return Object.keys(dayStatusMap).some(d => {
      const [y, m] = d.split('-').map(Number);
      return (y * 12 + (m - 1)) < cursor;
    });
  }, [dayStatusMap, currentYear, currentMonth]);

  const goPrev = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(y => y - 1);
    } else {
      setCurrentMonth(m => m - 1);
    }
  };

  const goNext = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(y => y + 1);
    } else {
      setCurrentMonth(m => m + 1);
    }
  };

  // Monthly stats calculations
  const monthlyStats = useMemo(() => {
    const targetCode = subjectCode ? getCode(subjectCode) : '';
    const isAllMode = !subjectCode || subjectCode === 'ALL' || subjectCode.trim() === '';
    
    let monthPresent = 0;
    let monthTotal = 0;
    let monthAbsent = 0;

    for (const r of records) {
      const parts = r.date.split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        if (y === currentYear && m === currentMonth) {
          if (isAllMode || getCode(r.subject) === targetCode) {
            monthTotal++;
            if (r.status === 'present') {
              monthPresent++;
            } else {
              monthAbsent++;
            }
          }
        }
      }
    }

    const monthPct = monthTotal > 0 ? Math.round((monthPresent / monthTotal) * 100) : 0;
    return {
      present: monthPresent,
      absent: monthAbsent,
      total: monthTotal,
      percentage: monthPct,
    };
  }, [records, subjectCode, currentYear, currentMonth]);

  // Swipe gesture setup for horizontal transitions
  const calendarPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 15 && Math.abs(gestureState.dy) < 10;
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -50) {
          if (hasNextData) {
            Haptics.selectionAsync().catch(() => {});
            goNext();
          }
        } else if (gestureState.dx > 50) {
          if (hasPrevData) {
            Haptics.selectionAsync().catch(() => {});
            goPrev();
          }
        }
      },
    })
  ).current;

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfWeek(currentYear, currentMonth);

  // Build grid cells
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <Animated.View layout={LinearTransition.springify().damping(15)} style={styles.container}>
      {/* Month header */}
      <View style={styles.monthHeader}>
        <TouchableOpacity
          disabled={!hasPrevData}
          onPress={goPrev}
          style={{ opacity: hasPrevData ? 1 : 0.3 }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.monthTitle, { color: colors.text }]}>
          {MONTH_NAMES[currentMonth]} {currentYear}
        </Text>
        <TouchableOpacity
          disabled={!hasNextData}
          onPress={goNext}
          style={{ opacity: hasNextData ? 1 : 0.3 }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-forward" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Day-of-week header */}
      <View style={styles.weekRow}>
        {DAY_LABELS.map((label, i) => (
          <View key={i} style={styles.dayCell}>
            <Text style={[styles.dayLabel, { color: colors.textSecondary }]}>{label}</Text>
          </View>
        ))}
      </View>

      {/* Calendar grid wrapped with horizontal pan gestures */}
      <View {...calendarPanResponder.panHandlers}>
        {Array.from({ length: cells.length / 7 }, (_, rowIdx) => (
          <View key={rowIdx} style={styles.weekRow}>
            {cells.slice(rowIdx * 7, rowIdx * 7 + 7).map((day, colIdx) => {
              if (day === null) {
                return <View key={colIdx} style={styles.dayCell} />;
              }

              const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const status = dayStatusMap[dateStr];
              const isToday = dateStr === todayStr;
              const isSelected = selectedDate === dateStr;

              // Construct accessibility tags
              const accessibilityStatus = status ? `, ${status}` : '';
              const accessibilityLabel = `${day} ${MONTH_NAMES[currentMonth]} ${currentYear}${accessibilityStatus}`;

              return (
                <TouchableOpacity
                  key={colIdx}
                  accessibilityRole="button"
                  accessibilityLabel={accessibilityLabel}
                  accessibilityState={{ selected: isSelected }}
                  style={styles.dayCell}
                  onPress={() => handleDatePress(dateStr)}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.dayNumber,
                    isToday && { borderWidth: 1.5, borderColor: colors.primary, borderRadius: Roundness.full },
                    isSelected && { backgroundColor: colors.primary, borderRadius: Roundness.full, borderWidth: 0 },
                    (!isSelected && status === 'present') && { backgroundColor: `${colors.success}14`, borderRadius: Roundness.full },
                    (!isSelected && status === 'absent') && { backgroundColor: `${colors.danger}14`, borderRadius: Roundness.full },
                    (!isSelected && status === 'partial') && { backgroundColor: `${colors.warning}14`, borderRadius: Roundness.full }
                  ]}>
                    <Text style={[
                      styles.dayText,
                      { color: colors.text },
                      isToday && { color: colors.primary, fontFamily: Fonts.bodyBold },
                      isSelected && { color: '#FFFFFF', fontFamily: Fonts.bodyBold },
                      (!isSelected && status === 'present') && { color: colors.success },
                      (!isSelected && status === 'absent') && { color: colors.danger },
                      (!isSelected && status === 'partial') && { color: colors.warning }
                    ]}>
                      {day}
                    </Text>
                  </View>
                  {/* Dot indicator */}
                  {status === 'present' && (
                    <View style={[styles.dot, { backgroundColor: colors.success }]} />
                  )}
                  {status === 'absent' && (
                    <View style={[styles.dot, { backgroundColor: colors.danger }]} />
                  )}
                  {status === 'partial' && (
                    <View style={[styles.dot, { backgroundColor: colors.warning }]} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>

      {/* Monthly Summary line */}
      {monthlyStats.total > 0 && (
        <View style={[styles.monthlySummary, { backgroundColor: `${colors.primary}0D`, borderColor: colors.outlineVariant }]}>
          <Text style={[styles.monthlySummaryText, { color: colors.textSecondary }]}>
            This month: <Text style={{ fontFamily: Fonts.bodyBold, color: colors.text }}>{monthlyStats.present}</Text> present · <Text style={{ fontFamily: Fonts.bodyBold, color: colors.text }}>{monthlyStats.absent}</Text> absent · <Text style={{ fontFamily: Fonts.bodyBold, color: colors.text }}>{monthlyStats.percentage}%</Text>
          </Text>
        </View>
      )}

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>Present</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.danger }]} />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>Absent</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.warning }]} />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>Partial</Text>
        </View>
      </View>

      {/* Collapsible Animated Detail Card */}
      {selectedDate && (
        <Animated.View
          entering={FadeInUp.duration(250).springify().damping(15)}
          exiting={FadeOutDown.duration(200)}
          style={[
            styles.detailCard,
            {
              backgroundColor: colors.surfaceHigh || colors.surfaceLow,
              borderColor: colors.outlineVariant,
            },
          ]}
        >
          {/* Header */}
          <View style={styles.detailHeader}>
            <Text style={[styles.detailDateText, { color: colors.text }]}>
              {formatSelectedDate(selectedDate)}
            </Text>
            <TouchableOpacity onPress={() => setSelectedDate(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle-outline" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Hour List */}
          <View style={styles.detailList}>
            {selectedDayRecords.length > 0 ? (
              selectedDayRecords.map((rec, idx) => {
                const isRecPresent = rec.status === 'present';
                return (
                  <View
                    key={idx}
                    style={[
                      styles.detailRow,
                      idx < selectedDayRecords.length - 1 && { borderBottomWidth: 0.5, borderBottomColor: colors.outlineVariant }
                    ]}
                  >
                    <View style={styles.detailRowLeft}>
                      <View style={[styles.periodBadge, { backgroundColor: colors.outlineVariant }]}>
                        <Text style={[styles.periodBadgeText, { color: colors.textSecondary }]}>
                          P{rec.hour}
                        </Text>
                      </View>
                      <Text style={[styles.detailSubjectText, { color: colors.text }]} numberOfLines={1}>
                        {getSubjectName(rec.subject)}
                      </Text>
                    </View>

                    <View style={[
                      styles.statusBadge,
                      { backgroundColor: isRecPresent ? `${colors.success}12` : `${colors.danger}12` }
                    ]}>
                      <Text style={[
                        styles.statusBadgeText,
                        { color: isRecPresent ? colors.success : colors.danger }
                      ]}>
                        {isRecPresent ? 'Present' : 'Absent'}
                      </Text>
                    </View>
                  </View>
                );
              })
            ) : (
              <View style={styles.emptyDetailContainer}>
                <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} style={{ marginBottom: 4 }} />
                <Text style={[styles.emptyDetailText, { color: colors.textSecondary }]}>
                  No class hours recorded on this day.
                </Text>
              </View>
            )}
          </View>
        </Animated.View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.half,
  },
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.half,
  },
  monthTitle: {
    fontFamily: Fonts.bodyBold,
    fontSize: 15,
    lineHeight: 20,
  },
  weekRow: {
    flexDirection: 'row',
  },
  dayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 3,
    minHeight: 40,
  },
  dayLabel: {
    fontFamily: Fonts.label,
    fontSize: 11,
    textTransform: 'uppercase',
  },
  dayNumber: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayText: {
    fontFamily: Fonts.body,
    fontSize: 13,
    lineHeight: 18,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: Roundness.full,
    marginTop: 2,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.three,
    marginTop: Spacing.one,
    paddingVertical: Spacing.half,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.half,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: Roundness.full,
  },
  legendText: {
    fontFamily: Fonts.body,
    fontSize: 11,
  },
  detailCard: {
    marginTop: Spacing.one,
    borderWidth: 1,
    borderRadius: Roundness.md,
    padding: Spacing.one,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.half,
  },
  detailDateText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailList: {
    gap: 0,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.half,
  },
  detailRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.half,
    flex: 1,
  },
  periodBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Roundness.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  periodBadgeText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 10,
  },
  detailSubjectText: {
    fontFamily: Fonts.body,
    fontSize: 13,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Roundness.full,
  },
  statusBadgeText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 10,
  },
  emptyDetailContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
  emptyDetailText: {
    fontFamily: Fonts.body,
    fontSize: 12,
    textAlign: 'center',
  },
  monthlySummary: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: Roundness.default,
    alignSelf: 'center',
    marginTop: Spacing.two,
    borderWidth: 0.5,
  },
  monthlySummaryText: {
    fontFamily: Fonts.body,
    fontSize: 12,
    textAlign: 'center',
  },
});
