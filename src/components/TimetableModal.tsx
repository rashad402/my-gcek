import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Fonts, Spacing, Roundness } from '@/constants/theme';
import { TimetableData } from '@/services/etlab-parser';
import { getSubjectName } from '@/services/subject-helper';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

interface Props {
  visible: boolean;
  onClose: () => void;
  colors: any;
  timetableData: TimetableData | null;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

function toTitleCase(str: string) {
  return str.replace(
    /\w\S*/g,
    txt =>
      txt.charAt(0).toUpperCase() +
      txt.substring(1).toLowerCase()
  );
}

const getCurrentDayIndex = () => {
  const day = new Date().getDay(); // 0 is Sunday, 1 is Monday, etc.
  if (day >= 1 && day <= 5) {
    return day - 1; // 0 for Mon, 4 for Fri
  }
  return 0; // default to Monday if weekend
};

export default function TimetableModal({
  visible,
  onClose,
  colors,
  timetableData,
}: Props) {
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);

  const tabWidth = containerWidth > 0 ? containerWidth / 5 : 0;
  const translateX = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setSelectedDayIndex(getCurrentDayIndex());
    }
  }, [visible]);

  useEffect(() => {
    if (containerWidth > 0) {
      translateX.value = withSpring(selectedDayIndex * tabWidth, {
        damping: 24,
        stiffness: 170,
      });
    }
  }, [selectedDayIndex, containerWidth, tabWidth, translateX]);

  const animatedIndicatorStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
      width: tabWidth - 6, // small margin inside the tab frame
    };
  });

  const activeDayData = timetableData?.days.find(d => {
    const dName = d.day.toLowerCase();
    const targetName = DAYS_OF_WEEK[selectedDayIndex].toLowerCase();
    return dName === targetName || dName.substring(0, 3) === targetName.substring(0, 3);
  });

  const getBadgeStyles = (classType: string, isDark: boolean) => {
    switch (classType) {
      case 'TR':
        return {
          bg: 'rgba(99, 102, 241, 0.14)',
          text: isDark ? '#818cf8' : '#4f46e5',
        };
      case 'PR':
        return {
          bg: 'rgba(239, 68, 68, 0.14)',
          text: isDark ? '#f87171' : '#dc2626',
        };
      case 'TL':
        return {
          bg: 'rgba(16, 185, 129, 0.12)',
          text: isDark ? '#34d399' : '#059669',
        };
      case 'EL':
        return {
          bg: 'rgba(245, 158, 11, 0.12)',
          text: isDark ? '#fbbf24' : '#d97706',
        };
      default:
        return {
          bg: 'rgba(107, 114, 128, 0.10)',
          text: isDark ? '#9ca3af' : '#4b5563',
        };
    }
  };

  const isDark = colors.background === '#1b1c1d';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>

      <View style={[styles.sheet, { backgroundColor: colors.surfaceLowest }]}>
        {/* Drag handle */}
        <View style={styles.handleBar}>
          <View style={[styles.handle, { backgroundColor: colors.outlineVariant }]} />
        </View>

        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.sheetTitle, { color: colors.text }]}>
            📅 Weekly Timetable
          </Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.contentContainer}>
          {/* Segmented day selector */}
          <View
            style={[styles.tabsContainer, { backgroundColor: colors.surfaceContainer }]}
            onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
          >
            {containerWidth > 0 && (
              <Animated.View
                style={[
                  styles.tabIndicator,
                  { backgroundColor: colors.surfaceLowest },
                  animatedIndicatorStyle,
                ]}
              />
            )}
            {DAYS_OF_WEEK.map((day, idx) => {
              const label = day.substring(0, 3);
              const isSelected = selectedDayIndex === idx;
              return (
                <TouchableOpacity
                  key={day}
                  style={styles.tabButton}
                  onPress={() => setSelectedDayIndex(idx)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.tabText,
                      {
                        color: isSelected ? colors.primary : colors.textSecondary,
                        fontFamily: isSelected ? Fonts.bodyBold : Fonts.body,
                      },
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Timeline / Cards */}
          {!timetableData ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                Loading timetable...
              </Text>
            </View>
          ) : !activeDayData || activeDayData.periods.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar-outline" size={48} color={colors.outline} style={{ opacity: 0.4 }} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No classes scheduled for {DAYS_OF_WEEK[selectedDayIndex]}
              </Text>
            </View>
          ) : (
            <ScrollView
              style={styles.scrollArea}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              {activeDayData.periods.map((cell, idx) => {
                const header = timetableData.periods[idx] || {
                  index: idx + 1,
                  label: `Period ${idx + 1}`,
                };
                const isFree = cell.classType === 'FP' || !cell.subject || cell.subject.toLowerCase().includes('free period');
                const displayName = isFree ? 'Free Period' : toTitleCase(getSubjectName(cell.subject));
                const displayCode = isFree ? null : cell.subject;
                const hasTeacher = cell.teacher && cell.teacher.trim().length > 0;
                const badge = getBadgeStyles(cell.classType, isDark);

                return (
                  <View key={idx} style={styles.timelineRow}>
                    {/* Left: Time and Period */}
                    <View style={styles.timeColumn}>
                      <Text style={[styles.periodLabel, { color: colors.text }]}>
                        {header.label.replace('Period', 'P')}
                      </Text>
                      {header.timeSlot ? (
                        <Text style={[styles.timeSlotText, { color: colors.textSecondary }]}>
                          {header.timeSlot}
                        </Text>
                      ) : null}
                    </View>

                    {/* Timeline Node */}
                    <View style={styles.nodeColumn}>
                      <View style={[
                        styles.timelineDot,
                        { backgroundColor: isFree ? colors.outlineVariant : colors.primary }
                      ]} />
                      {idx < activeDayData.periods.length - 1 && (
                        <View style={[styles.timelineLine, { backgroundColor: colors.outlineVariant }]} />
                      )}
                    </View>

                    {/* Right: Card */}
                    <View style={[
                      styles.cardContainer,
                      {
                        backgroundColor: colors.surfaceLowest,
                        borderColor: colors.outlineVariant,
                        opacity: isFree ? 0.65 : 1,
                      }
                    ]}>
                      <View style={styles.cardHeaderRow}>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={[
                              styles.subjectName,
                              {
                                color: colors.text,
                                fontStyle: isFree ? 'italic' : 'normal',
                                fontFamily: isFree ? Fonts.body : Fonts.bodyBold,
                              }
                            ]}
                            numberOfLines={2}
                          >
                            {displayName}
                          </Text>
                          {displayCode ? (
                            <Text style={[styles.subjectCode, { color: colors.textSecondary }]}>
                              {displayCode}
                            </Text>
                          ) : null}
                        </View>

                        {/* Tiny badge */}
                        {!isFree && cell.type ? (
                          <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                            <Text style={[styles.badgeText, { color: badge.text }]}>
                              {cell.type}
                            </Text>
                          </View>
                        ) : null}
                      </View>

                      {hasTeacher && !isFree ? (
                        <Text style={[styles.teacherText, { color: colors.textSecondary }]}>
                          👤 {toTitleCase(cell.teacher!)}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sheet: {
    maxHeight: SCREEN_HEIGHT * 0.82,
    borderTopLeftRadius: Roundness.xl,
    borderTopRightRadius: Roundness.xl,
    paddingBottom: Spacing.four,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  handleBar: {
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: Roundness.full,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.two,
  },
  sheetTitle: {
    fontFamily: Fonts.bodyBold,
    fontSize: 20,
    lineHeight: 26,
  },
  contentContainer: {
    flexShrink: 1,
    paddingHorizontal: Spacing.four,
  },
  tabsContainer: {
    flexDirection: 'row',
    height: 40,
    borderRadius: Roundness.md,
    padding: 3,
    position: 'relative',
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  tabIndicator: {
    position: 'absolute',
    top: 3,
    bottom: 3,
    left: 3,
    borderRadius: Roundness.md - 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1.5,
  },
  tabButton: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  tabText: {
    fontSize: 13,
  },
  loadingContainer: {
    paddingVertical: Spacing.seven,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  loadingText: {
    fontFamily: Fonts.body,
    fontSize: 14,
  },
  emptyContainer: {
    paddingVertical: Spacing.seven,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  emptyText: {
    fontFamily: Fonts.body,
    fontSize: 14,
    textAlign: 'center',
  },
  scrollArea: {
    flexShrink: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.six,
  },
  timelineRow: {
    flexDirection: 'row',
    minHeight: 74,
  },
  timeColumn: {
    width: 76,
    paddingRight: Spacing.two,
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    paddingTop: Spacing.one + 2,
  },
  periodLabel: {
    fontFamily: Fonts.bodyBold,
    fontSize: 14,
    lineHeight: 18,
  },
  timeSlotText: {
    fontFamily: Fonts.body,
    fontSize: 10,
    lineHeight: 14,
    marginTop: 2,
    textAlign: 'right',
  },
  nodeColumn: {
    width: 16,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  timelineDot: {
    width: 6,
    height: 6,
    borderRadius: Roundness.full,
    marginTop: Spacing.one + 8,
  },
  timelineLine: {
    width: 1,
    flex: 1,
    opacity: 0.22,
    marginTop: 4,
    marginBottom: -Spacing.one,
  },
  cardContainer: {
    flex: 1,
    borderWidth: 1,
    borderRadius: Roundness.md,
    padding: Spacing.two + 2,
    marginBottom: Spacing.two,
    marginLeft: Spacing.one,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.one,
  },
  subjectName: {
    fontSize: 14,
    lineHeight: 18,
  },
  subjectCode: {
    fontFamily: Fonts.body,
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Roundness.sm,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 10,
    lineHeight: 12,
  },
  teacherText: {
    fontFamily: Fonts.body,
    fontSize: 12,
    lineHeight: 16,
    marginTop: Spacing.one,
  },
});
