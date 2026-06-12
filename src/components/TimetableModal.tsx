import React, { useState, useEffect, useCallback } from 'react';
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
  PanResponder,
  useColorScheme,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Fonts, Spacing, Roundness } from '@/constants/theme';
import { TimetableData } from '@/services/etlab-parser';
import { getSubjectName } from '@/services/subject-helper';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  runOnJS,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

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
  
  // Shared value for sheet vertical translation drag-to-dismiss gesture
  const offsetY = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setSelectedDayIndex(getCurrentDayIndex());
      offsetY.value = 0;
    }
  }, [visible, offsetY]);

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
      width: tabWidth - 6,
    };
  });

  const animatedSheetStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: offsetY.value }],
    };
  });

  const animatedBackdropStyle = useAnimatedStyle(() => {
    const opacity = 1 - Math.min(1, offsetY.value / (SCREEN_HEIGHT * 0.4));
    return {
      opacity: opacity,
    };
  });

  // Setup pan responder for gesture-dismissing the sheet downwards
  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Intercept touch movements only when swiping downwards
        return gestureState.dy > 5 && Math.abs(gestureState.dx) < 10;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          offsetY.value = gestureState.dy;
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 120 || gestureState.vy > 0.5) {
          offsetY.value = withSpring(SCREEN_HEIGHT, { damping: 20 }, (finished) => {
            if (finished) {
              runOnJS(onClose)();
            }
          });
        } else {
          offsetY.value = withSpring(0, { damping: 15 });
        }
      },
    })
  ).current;

  // Pulse animation for the "NOW" live dot
  const liveDotOpacity = useSharedValue(0.3);
  useEffect(() => {
    if (visible) {
      liveDotOpacity.value = withRepeat(
        withTiming(1, { duration: 650 }),
        -1,
        true
      );
    } else {
      liveDotOpacity.value = 0.3;
    }
  }, [visible, liveDotOpacity]);

  const animatedLiveDotStyle = useAnimatedStyle(() => {
    return {
      opacity: liveDotOpacity.value,
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

  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Check if today matches selected day index (Mon-Fri)
  const isToday = selectedDayIndex === getCurrentDayIndex() && new Date().getDay() >= 1 && new Date().getDay() <= 5;

  const isCurrentPeriod = useCallback((timeSlot?: string) => {
    if (!isToday || !timeSlot) return false;
    
    // Parse times like "9:00 AM - 9:50 AM" or "09:00 - 09:50" or "9:00 - 9:50"
    const cleanSlot = timeSlot.replace(/\s+/g, '');
    const match = cleanSlot.match(/^(\d{1,2}):(\d{2})([ap]m)?\s*[-–—]\s*(\d{1,2}):(\d{2})([ap]m)?$/i);
    if (!match) return false;
    
    let startHour = parseInt(match[1], 10);
    const startMin = parseInt(match[2], 10);
    const startAmPm = match[3];
    if (startAmPm && startAmPm.toLowerCase() === 'pm' && startHour < 12) startHour += 12;
    if (startAmPm && startAmPm.toLowerCase() === 'am' && startHour === 12) startHour = 0;
    
    let endHour = parseInt(match[4], 10);
    const endMin = parseInt(match[5], 10);
    const endAmPm = match[6];
    if (endAmPm && endAmPm.toLowerCase() === 'pm' && endHour < 12) endHour += 12;
    if (endAmPm && endAmPm.toLowerCase() === 'am' && endHour === 12) endHour = 0;
    
    const startTotal = startHour * 60 + startMin;
    const endTotal = endHour * 60 + endMin;
    
    const now = new Date();
    const nowTotal = now.getHours() * 60 + now.getMinutes();
    return nowTotal >= startTotal && nowTotal <= endTotal;
  }, [isToday]);

  const isWeekend = new Date().getDay() === 0 || new Date().getDay() === 6;

  // Auto-scroll anchor logic
  const scrollViewRef = React.useRef<ScrollView>(null);
  const rowOffsets = React.useRef<{ [key: number]: number }>({}).current;

  useEffect(() => {
    if (visible && timetableData) {
      const today = getCurrentDayIndex();
      if (selectedDayIndex === today) {
        const activeDay = timetableData.days.find(d => {
          const dName = d.day.toLowerCase();
          const targetName = DAYS_OF_WEEK[today].toLowerCase();
          return dName === targetName || dName.substring(0, 3) === targetName.substring(0, 3);
        });
        if (activeDay) {
          const currentIdx = activeDay.periods.findIndex((_, idx) => {
            const header = timetableData.periods[idx];
            return isCurrentPeriod(header?.timeSlot);
          });
          if (currentIdx !== -1) {
            setTimeout(() => {
              const y = rowOffsets[currentIdx];
              if (y !== undefined && scrollViewRef.current) {
                scrollViewRef.current.scrollTo({ y: Math.max(0, y - 20), animated: true });
              }
            }, 300);
          }
        }
      }
    }
  }, [visible, selectedDayIndex, timetableData, isCurrentPeriod, rowOffsets]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.backdrop, animatedBackdropStyle]} />
      </TouchableWithoutFeedback>

      <Animated.View 
        style={[
          styles.sheet, 
          { backgroundColor: colors.surfaceLowest }, 
          animatedSheetStyle
        ]}
      >
        <View {...panResponder.panHandlers}>
          {/* Drag handle */}
          <View style={styles.handleBar}>
            <View style={[styles.handle, { backgroundColor: colors.outlineVariant }]} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Ionicons name="calendar-outline" size={22} color={colors.text} style={{ marginRight: 8 }} />
              <Text style={[styles.sheetTitle, { color: colors.text }]}>
                Weekly Timetable
              </Text>
            </View>
            <TouchableOpacity 
              accessibilityRole="button"
              accessibilityLabel="Close timetable modal"
              onPress={onClose} 
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
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
                  accessibilityRole="tab"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={`${day} timetable tab`}
                  style={styles.tabButton}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setSelectedDayIndex(idx);
                  }}
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

          {/* Timetable Badge Legend */}
          <View style={styles.legendRow}>
            {[
              ['TR', 'Theory'],
              ['PR', 'Lab'],
              ['TL', 'Tutorial'],
              ['EL', 'Elective']
            ].map(([code, label]) => {
              const b = getBadgeStyles(code, isDark);
              return (
                <View key={code} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: b.text }]} />
                  <Text style={[styles.legendText, { color: colors.textSecondary }]}>{label}</Text>
                </View>
              );
            })}
          </View>

          {/* Weekend Banner */}
          {isWeekend && (
            <View style={[styles.weekendBanner, { backgroundColor: `${colors.primary}12`, borderColor: `${colors.primary}25` }]}>
              <Ionicons name="sparkles-outline" size={14} color={colors.primary} />
              <Text style={[styles.weekendText, { color: colors.primary }]}>
                {"It's the weekend! Showing Monday's timetable."}
              </Text>
            </View>
          )}

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
              ref={scrollViewRef}
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
                
                const isCurrent = isCurrentPeriod(header.timeSlot);

                return (
                  <View 
                    key={idx} 
                    style={styles.timelineRow}
                    onLayout={(e) => {
                      rowOffsets[idx] = e.nativeEvent.layout.y;
                    }}
                  >
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
                        borderColor: isCurrent ? colors.primary : colors.outlineVariant,
                        borderWidth: isCurrent ? 1.5 : 1,
                        opacity: isFree ? 0.65 : 1,
                      },
                      isCurrent && { backgroundColor: `${colors.primary}08` }
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

                        <View style={styles.badgesCol}>
                          {isCurrent && (
                            <View style={[styles.nowBadge, { backgroundColor: colors.primary }]}>
                              <Animated.View style={[styles.liveDot, animatedLiveDotStyle]} />
                              <Text style={styles.nowText}>NOW</Text>
                            </View>
                          )}
                          {!isFree && cell.type ? (
                            <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                              <Text style={[styles.badgeText, { color: badge.text }]}>
                                {cell.type}
                              </Text>
                            </View>
                          ) : null}
                        </View>
                      </View>

                      {hasTeacher && !isFree ? (
                        <View style={styles.teacherRow}>
                          <Ionicons name="person-outline" size={12} color={colors.textSecondary} style={{ marginRight: 4 }} />
                          <Text style={[styles.teacherText, { color: colors.textSecondary }]}>
                            {toTitleCase(cell.teacher!)}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
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
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
    marginBottom: Spacing.two,
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
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginBottom: Spacing.two,
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 11,
  },
  weekendBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: Roundness.md,
    borderWidth: 1,
    marginBottom: Spacing.two,
  },
  weekendText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 12,
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
  badgesCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
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
  nowBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Roundness.sm,
    alignSelf: 'flex-start',
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ffffff',
  },
  nowText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 10,
    lineHeight: 12,
    color: '#ffffff',
  },
  teacherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.one,
  },
  teacherText: {
    fontFamily: Fonts.body,
    fontSize: 12,
    lineHeight: 16,
  },
});
