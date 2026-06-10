import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Fonts, Spacing, Roundness } from '@/constants/theme';
import AttendanceRing from './AttendanceRing';
import AttendanceCalendar, { AttendanceRecord } from './AttendanceCalendar';

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
  colors: any;
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

  const progressColor = percentage < 75 ? colors.danger : percentage < 80 ? colors.warning : colors.success;
  const variant = percentage >= 80 ? 'success' : percentage >= 75 ? 'warning' : 'danger';

  // Reset simulator when modal opens
  const handleClose = () => {
    setSimAtt(0);
    setSimMiss(0);
    onClose();
  };

  // Simulator calculations
  const newAtt = attended + simAtt;
  const newTot = total + simAtt + simMiss;
  const newPct = newTot > 0 ? Math.round((newAtt / newTot) * 1000) / 10 : 0;
  const statusColor = newPct < 75 ? colors.danger : newPct < 80 ? colors.warning : colors.success;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>

      <View style={[styles.sheet, { backgroundColor: colors.surfaceLowest }]}>
        {/* Drag handle */}
        <View style={styles.handleBar}>
          <View style={[styles.handle, { backgroundColor: colors.outlineVariant }]} />
        </View>

        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sheetTitle, { color: colors.text }]} numberOfLines={2}>
                {displayName}
              </Text>
              {professor ? (
                <Text style={[styles.sheetSubtitle, { color: colors.textSecondary }]}>
                  👤 {professor}
                </Text>
              ) : (
                <Text style={[styles.sheetSubtitle, { color: colors.textSecondary }]}>
                  {subject}
                </Text>
              )}
            </View>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Stats row */}
          <View style={[styles.statsRow, { backgroundColor: colors.surfaceLow, borderColor: colors.outlineVariant }]}>
            <AttendanceRing percentage={percentage} variant={variant} size={64} strokeWidth={5.5} />
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

          {/* Calendar */}
          <View style={[styles.calendarSection, { backgroundColor: colors.surfaceLow, borderColor: colors.outlineVariant }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              📅 Attendance History
            </Text>
            <AttendanceCalendar
              records={attendanceRecords}
              subjectCode={subject}
              colors={colors}
            />
          </View>

          {/* Simulator */}
          {subject !== 'ALL' && (
            <View style={[styles.simulatorSection, { backgroundColor: colors.surfaceLow, borderColor: colors.outlineVariant }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>🔮 Attendance Simulator</Text>

              <View style={styles.simulatorRow}>
                <Text style={[styles.simulatorLabel, { color: colors.textSecondary }]}>Attend consecutive classes</Text>
                <View style={styles.counterGroup}>
                  <TouchableOpacity
                    style={[styles.counterBtn, { backgroundColor: colors.surfaceContainer }]}
                    onPress={() => setSimAtt(Math.max(0, simAtt - 1))}
                  >
                    <Text style={[styles.counterBtnText, { color: colors.text }]}>-</Text>
                  </TouchableOpacity>
                  <Text style={[styles.counterValue, { color: colors.text }]}>{simAtt}</Text>
                  <TouchableOpacity
                    style={[styles.counterBtn, { backgroundColor: colors.surfaceContainer }]}
                    onPress={() => setSimAtt(simAtt + 1)}
                  >
                    <Text style={[styles.counterBtnText, { color: colors.text }]}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.simulatorRow}>
                <Text style={[styles.simulatorLabel, { color: colors.textSecondary }]}>Miss consecutive classes</Text>
                <View style={styles.counterGroup}>
                  <TouchableOpacity
                    style={[styles.counterBtn, { backgroundColor: colors.surfaceContainer }]}
                    onPress={() => setSimMiss(Math.max(0, simMiss - 1))}
                  >
                    <Text style={[styles.counterBtnText, { color: colors.text }]}>-</Text>
                  </TouchableOpacity>
                  <Text style={[styles.counterValue, { color: colors.text }]}>{simMiss}</Text>
                  <TouchableOpacity
                    style={[styles.counterBtn, { backgroundColor: colors.surfaceContainer }]}
                    onPress={() => setSimMiss(simMiss + 1)}
                  >
                    <Text style={[styles.counterBtnText, { color: colors.text }]}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>

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
                      : `Simulated: ${newAtt}/${newTot} hrs. You would be ${newPct >= 75 ? 'safe' : 'below target'}!`}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </ScrollView>
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
