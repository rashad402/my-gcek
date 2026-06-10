import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Fonts, Spacing, Roundness } from '@/constants/theme';

export interface AttendanceRecord {
  date: string;      // 'YYYY-MM-DD'
  subject: string;   // subject code
  hour: number;
  status: 'present' | 'absent';
}

interface Props {
  records: AttendanceRecord[];
  subjectCode: string;
  colors: any;
}

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function AttendanceCalendar({ records, subjectCode, colors }: Props) {
  const now = new Date();
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(now.getMonth());

  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  // Log raw records before useMemo
  console.log('ALL RECORDS:', records);

  // Filter records for this subject and build a map: date -> 'present' | 'absent' | 'partial'
  const dayStatusMap = useMemo(() => {
    const map: Record<string, 'present' | 'absent' | 'partial'> = {};
    const subjectRecords = !subjectCode || subjectCode === 'ALL'
      ? records
      : records.filter(
          r => r.subject.trim().toUpperCase() === subjectCode.trim().toUpperCase()
        );

    // Verify subject filtering
    console.log('SUBJECT CODE:', subjectCode);
    console.log('FILTERED RECORDS:', subjectRecords);

    // Log exact subject strings (using JSON.stringify to catch spaces/newlines)
    subjectRecords.forEach(r => {
      console.log({
        parsedSubject: JSON.stringify(r.subject),
        filterSubject: JSON.stringify(subjectCode),
      });
    });

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

    // Verify calendar map
    console.log('DAY STATUS MAP:', map);

    return map;
  }, [records, subjectCode]);

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfWeek(currentYear, currentMonth);

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

  // Verify calendar month and record dates
  console.log('CURRENT MONTH:', currentMonth + 1, currentYear);
  console.log('RECORD DATES:', records.map(r => r.date));

  // Build grid cells
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  // Pad to fill last row
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <View style={styles.container}>
      {/* Month header */}
      <View style={styles.monthHeader}>
        <TouchableOpacity onPress={goPrev} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.monthTitle, { color: colors.text }]}>
          {MONTH_NAMES[currentMonth]} {currentYear}
        </Text>
        <TouchableOpacity onPress={goNext} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
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

      {/* Calendar grid */}
      {Array.from({ length: cells.length / 7 }, (_, rowIdx) => (
        <View key={rowIdx} style={styles.weekRow}>
          {cells.slice(rowIdx * 7, rowIdx * 7 + 7).map((day, colIdx) => {
            if (day === null) {
              return <View key={colIdx} style={styles.dayCell} />;
            }

            const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const status = dayStatusMap[dateStr];
            const isToday = dateStr === todayStr;

            return (
              <View key={colIdx} style={styles.dayCell}>
                <View style={[
                  styles.dayNumber,
                  isToday && { borderWidth: 1.5, borderColor: colors.primary, borderRadius: Roundness.full },
                ]}>
                  <Text style={[
                    styles.dayText,
                    { color: colors.text },
                    isToday && { color: colors.primary, fontFamily: Fonts.bodyBold },
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
              </View>
            );
          })}
        </View>
      ))}

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
    </View>
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
});
