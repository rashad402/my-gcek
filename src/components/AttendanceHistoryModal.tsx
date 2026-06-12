import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  Pressable,
  TouchableWithoutFeedback,
  ScrollView,
  Dimensions,
  PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Fonts, Spacing, Roundness, ThemeColors } from '@/constants/theme';
import AttendanceRing from './AttendanceRing';
import AttendanceCalendar, { AttendanceRecord } from './AttendanceCalendar';
import { getStatusTier, getStatusColor } from '@/services/attendance-status';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';

interface Props {
  visible: boolean;
  onClose: () => void;
  subject: string;
  displayName: string;
  professor: string;
  percentage: number;
  attended: number;
  total: number;
  alertText: string;
  colors: ThemeColors;
  targetPercentage: number;
  attendanceRecords: AttendanceRecord[];
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function AttendanceHistoryModal({
  visible,
  onClose,
  subject,
  displayName,
  professor,
  percentage,
  attended,
  total,
  alertText,
  colors,
  targetPercentage,
  attendanceRecords,
}: Props) {
  const [simAtt, setSimAtt] = useState(0);
  const [simMiss, setSimMiss] = useState(0);

  // Sync state and colors using centralized status helper
  const variant = getStatusTier(percentage, targetPercentage);
  const progressColor = getStatusColor(percentage, targetPercentage, colors);

  // Reset simulator values when modal opens
  useEffect(() => {
    if (visible) {
      setSimAtt(0);
      setSimMiss(0);
      offsetY.value = 0;
    }
  }, [visible, offsetY]);

  const handleClose = () => {
    setSimAtt(0);
    setSimMiss(0);
    onClose();
  };

  // Simulator calculations
  const newAtt = attended + simAtt;
  const newTot = total + simAtt + simMiss;
  const newPct = newTot > 0 ? Math.round((newAtt / newTot) * 1000) / 10 : 0;
  const statusColor = getStatusColor(newPct, targetPercentage, colors);

  // Increment / Decrement handlers with haptics
  const adjustSimAtt = (amount: number) => {
    Haptics.selectionAsync().catch(() => {});
    setSimAtt((prev) => Math.max(0, prev + amount));
  };

  const adjustSimMiss = (amount: number) => {
    Haptics.selectionAsync().catch(() => {});
    setSimMiss((prev) => Math.max(0, prev + amount));
  };

  // Smart suggestion chip logic based on user's targetPercentage
  const targetSuggestion = useMemo(() => {
    if (total === 0) return null;
    if (percentage >= targetPercentage) {
      // Find how many classes they can miss without falling below target
      const targetFraction = targetPercentage / 100;
      const maxMissable = Math.max(0, Math.floor(attended / targetFraction - total));
      if (maxMissable > 0) {
        return {
          type: 'miss',
          count: maxMissable,
          label: `Can miss next ${maxMissable} class${maxMissable > 1 ? 'es' : ''} safely`,
        };
      }
      return null;
    } else {
      // Find how many classes they must attend consecutively to reach target
      const reqClasses = Math.max(
        0,
        Math.ceil((targetPercentage * total - 100 * attended) / (100 - targetPercentage))
      );
      if (reqClasses > 0) {
        return {
          type: 'attend',
          count: reqClasses,
          label: `Attend next ${reqClasses} class${reqClasses > 1 ? 'es' : ''} to reach ${targetPercentage}%`,
        };
      }
      return null;
    }
  }, [percentage, targetPercentage, attended, total]);

  // Bottom Sheet swipe down-to-dismiss gesture setup
  const offsetY = useSharedValue(0);

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

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
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
              runOnJS(handleClose)();
            }
          });
        } else {
          offsetY.value = withSpring(0, { damping: 15 });
        }
      },
    })
  ).current;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={handleClose}>
        <Animated.View style={[styles.backdrop, animatedBackdropStyle]} />
      </TouchableWithoutFeedback>

      <Animated.View style={[styles.sheet, { backgroundColor: colors.surfaceLowest }, animatedSheetStyle]}>
        {/* Swipe-to-dismiss Drag Zone */}
        <View {...panResponder.panHandlers}>
          {/* Drag handle */}
          <View style={styles.handleBar}>
            <View style={[styles.handle, { backgroundColor: colors.outlineVariant }]} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sheetTitle, { color: colors.text }]} numberOfLines={2}>
                {displayName}
              </Text>
              {professor ? (
                <View style={styles.profRow}>
                  <Ionicons name="person-outline" size={14} color={colors.textSecondary} style={{ marginRight: 4 }} />
                  <Text style={[styles.sheetSubtitle, { color: colors.textSecondary }]}>
                    {professor}
                  </Text>
                </View>
              ) : (
                <View style={styles.profRow}>
                  <Ionicons name="book-outline" size={14} color={colors.textSecondary} style={{ marginRight: 4 }} />
                  <Text style={[styles.sheetSubtitle, { color: colors.textSecondary }]}>
                    {subject}
                  </Text>
                </View>
              )}
            </View>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Close history modal"
              onPress={handleClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Stats row */}
          <View style={[styles.statsRow, { backgroundColor: colors.surfaceLow, borderColor: colors.outlineVariant }]}>
            <AttendanceRing percentage={percentage} variant={variant} size={64} strokeWidth={5.5} colors={colors} />
            <View style={styles.statsInfo}>
              <Text style={[styles.statsPercentage, { color: progressColor }]}>
                {percentage}%
              </Text>
              <Text style={[styles.statsDetail, { color: colors.textSecondary }]}>
                Attended {attended} of {total} hours
              </Text>
              <View style={[
                styles.alertPill,
                { backgroundColor: `${progressColor}15`, borderColor: `${progressColor}30` },
              ]}>
                <Text style={[styles.alertPillText, { color: progressColor }]}>
                  {alertText}
                </Text>
              </View>
            </View>
          </View>

          {/* Calendar Section */}
          <View style={[styles.calendarSection, { backgroundColor: colors.surfaceLow, borderColor: colors.outlineVariant }]}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="calendar-outline" size={18} color={colors.primary} style={{ marginRight: 6 }} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Attendance History
              </Text>
            </View>
            <AttendanceCalendar
              records={attendanceRecords}
              subjectCode={subject}
              colors={colors}
            />
          </View>

          {/* Simulator Section */}
          {subject !== 'ALL' && (
            <View style={[styles.simulatorSection, { backgroundColor: colors.surfaceLow, borderColor: colors.outlineVariant }]}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="flask-outline" size={18} color={colors.primary} style={{ marginRight: 6 }} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Attendance Simulator
                </Text>
              </View>

              <View style={styles.simulatorRow}>
                <Text style={[styles.simulatorLabel, { color: colors.textSecondary }]}>Attend consecutive classes</Text>
                <View style={styles.counterGroup}>
                  <Pressable
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    accessibilityRole="button"
                    accessibilityLabel="Decrease simulated attended classes"
                    style={({ pressed }) => [
                      styles.counterBtn,
                      { backgroundColor: colors.surfaceContainer },
                      pressed && { transform: [{ scale: 0.9 }], opacity: 0.8 }
                    ]}
                    onPress={() => adjustSimAtt(-1)}
                  >
                    <Text style={[styles.counterBtnText, { color: colors.text }]}>-</Text>
                  </Pressable>
                  <Text style={[styles.counterValue, { color: colors.text }]}>{simAtt}</Text>
                  <Pressable
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    accessibilityRole="button"
                    accessibilityLabel="Increase simulated attended classes"
                    style={({ pressed }) => [
                      styles.counterBtn,
                      { backgroundColor: colors.surfaceContainer },
                      pressed && { transform: [{ scale: 0.9 }], opacity: 0.8 }
                    ]}
                    onPress={() => adjustSimAtt(1)}
                  >
                    <Text style={[styles.counterBtnText, { color: colors.text }]}>+</Text>
                  </Pressable>
                </View>
              </View>

              <View style={styles.simulatorRow}>
                <Text style={[styles.simulatorLabel, { color: colors.textSecondary }]}>Miss consecutive classes</Text>
                <View style={styles.counterGroup}>
                  <Pressable
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    accessibilityRole="button"
                    accessibilityLabel="Decrease simulated missed classes"
                    style={({ pressed }) => [
                      styles.counterBtn,
                      { backgroundColor: colors.surfaceContainer },
                      pressed && { transform: [{ scale: 0.9 }], opacity: 0.8 }
                    ]}
                    onPress={() => adjustSimMiss(-1)}
                  >
                    <Text style={[styles.counterBtnText, { color: colors.text }]}>-</Text>
                  </Pressable>
                  <Text style={[styles.counterValue, { color: colors.text }]}>{simMiss}</Text>
                  <Pressable
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    accessibilityRole="button"
                    accessibilityLabel="Increase simulated missed classes"
                    style={({ pressed }) => [
                      styles.counterBtn,
                      { backgroundColor: colors.surfaceContainer },
                      pressed && { transform: [{ scale: 0.9 }], opacity: 0.8 }
                    ]}
                    onPress={() => adjustSimMiss(1)}
                  >
                    <Text style={[styles.counterBtnText, { color: colors.text }]}>+</Text>
                  </Pressable>
                </View>
              </View>

              {/* Fast Action Suggestion Chip */}
              {targetSuggestion && (
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={`Apply suggestion: ${targetSuggestion.label}`}
                  style={[styles.suggestionChip, { backgroundColor: `${colors.primary}0D`, borderColor: `${colors.primary}25` }]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    if (targetSuggestion.type === 'attend') {
                      setSimAtt(targetSuggestion.count);
                      setSimMiss(0);
                    } else {
                      setSimAtt(0);
                      setSimMiss(targetSuggestion.count);
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="sparkles-outline" size={14} color={colors.primary} style={{ marginRight: 6 }} />
                  <Text style={[styles.suggestionText, { color: colors.primary }]}>
                    {targetSuggestion.label}
                  </Text>
                </TouchableOpacity>
              )}

              {/* Simulator result */}
              <View style={[styles.simResultCard, { backgroundColor: colors.surfaceContainer }]}>
                <View style={styles.simResultLeft}>
                  <Text style={[styles.simResultLabel, { color: colors.textSecondary }]}>Simulated %</Text>
                  <Text style={[styles.simResultValue, { color: statusColor }]}>{newPct}%</Text>
                </View>
                <View style={styles.simResultRight}>
                  <Text style={[styles.simResultText, { color: colors.text }]}>
                    {simAtt === 0 && simMiss === 0
                      ? 'Adjust controls above to simulate hypothetical classes.'
                      : `Simulated: ${newAtt}/${newTot} hrs. You would be ${newPct >= targetPercentage ? 'safe' : 'below target'}!`}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </ScrollView>
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
    maxHeight: SCREEN_HEIGHT * 0.85,
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
  scrollArea: {
    flexShrink: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.six,
    gap: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.one,
  },
  sheetTitle: {
    fontFamily: Fonts.bodyBold,
    fontSize: 20,
    lineHeight: 26,
  },
  sheetSubtitle: {
    fontFamily: Fonts.body,
    fontSize: 13,
    lineHeight: 18,
  },
  profRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Roundness.md,
    borderWidth: 1,
  },
  statsInfo: {
    flex: 1,
    gap: 4,
  },
  statsPercentage: {
    fontFamily: Fonts.bodyBold,
    fontSize: 24,
    lineHeight: 28,
  },
  statsDetail: {
    fontFamily: Fonts.body,
    fontSize: 13,
    lineHeight: 18,
  },
  alertPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Roundness.full,
    borderWidth: 1,
    marginTop: 2,
  },
  alertPillText: {
    fontSize: 11,
    lineHeight: 14,
    fontFamily: Fonts.bodyMedium,
  },
  calendarSection: {
    padding: Spacing.three,
    borderRadius: Roundness.md,
    borderWidth: 1,
    gap: Spacing.two,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.half,
  },
  sectionTitle: {
    fontFamily: Fonts.bodyBold,
    fontSize: 16,
    lineHeight: 22,
  },
  simulatorSection: {
    padding: Spacing.three,
    borderRadius: Roundness.md,
    borderWidth: 1,
    gap: Spacing.two,
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
    width: 32,
    height: 32,
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
    minWidth: 24,
    textAlign: 'center',
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: Roundness.md,
    borderWidth: 1,
    marginVertical: Spacing.one,
  },
  suggestionText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 12,
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
