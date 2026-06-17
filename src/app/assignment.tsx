import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Fonts, Spacing, Roundness } from '@/constants/theme';
import { ProtectedScreen } from '@/components/protected-screen';
import { ProfileButton } from '@/components/profile-button';
import { useLogin } from '@/components/login-context';
import { fetchAssignments } from '@/services/etlab-api';
import { parseAssignments, Assignment } from '@/services/etlab-parser';
import { getSubjectName } from '@/services/subject-helper';
import { dataCache } from '@/services/data-cache';
import * as Haptics from 'expo-haptics';
import Animated, { 
  FadeInDown, 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  interpolate,
  interpolateColor
} from 'react-native-reanimated';
import { 
  FileText, 
  Clock3, 
  CircleCheck, 
  CircleAlert, 
} from 'lucide-react-native';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Utility function to parse system coursework titles into clean readable names (in Sentence case) and course codes.
 */
function toTitleCase(str: string): string {
  if (!str) return '';
  let cleaned = str.trim().toLowerCase();

  const acronyms = [
    'ai', 'ml', 'dbms', 'sql', 'it', 'ktu', 'cse', 'ece', 'eee', 'me', 'ce', 'mca', 'btech', 'gcek',
    'python', 'java', 'html', 'css', 'js', 'json', 'pdf', 'cad', 'cam', 'vlsi', 'iot'
  ];
  
  const words = cleaned.split(/\s+/);
  const mappedWords = words.map((word) => {
    const cleanWord = word.replace(/[^a-zA-Z]/g, '').toLowerCase();
    if (acronyms.includes(cleanWord)) {
      const idx = acronyms.indexOf(cleanWord);
      let proper = acronyms[idx];
      if (['ai', 'ml', 'dbms', 'sql', 'it', 'ktu', 'cse', 'ece', 'eee', 'me', 'ce', 'mca', 'btech', 'gcek', 'html', 'css', 'js', 'json', 'pdf', 'cad', 'cam', 'vlsi', 'iot'].includes(proper)) {
        proper = proper.toUpperCase();
      } else if (proper === 'python') {
        proper = 'Python';
      } else if (proper === 'java') {
        proper = 'Java';
      }
      
      return word.replace(/[a-zA-Z]+/g, (m) => {
        if (m.toLowerCase() === cleanWord) {
          return proper;
        }
        return m;
      });
    }
    if (/^[ivx]+$/i.test(cleanWord)) {
      return word.replace(/[a-zA-Z]+/g, (m) => m.toUpperCase());
    }
    return word.charAt(0).toUpperCase() + word.slice(1);
  });

  return mappedWords.join(' ');
}

function cleanCourseName(courseName: string, code: string): string {
  if (!courseName) return '';
  let cleaned = courseName.trim();
  if (code) {
    const regex = new RegExp(code.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'gi');
    cleaned = cleaned.replace(regex, '');
  }
  return cleaned.replace(/^[-\s:•]+/g, '').trim();
}

function getCleanTitleAndCode(rawTitle: string, rawSubjectCol: string) {
  // Try to split rawTitle into parts
  let parts: string[] = [rawTitle.trim()];
  if (rawTitle.includes(' : ')) {
    parts = rawTitle.split(' : ').map(p => p.trim());
  } else if (rawTitle.includes(' - ')) {
    parts = rawTitle.split(' - ').map(p => p.trim());
  } else if (rawTitle.includes(':')) {
    parts = rawTitle.split(':').map(p => p.trim());
  } else if (rawTitle.includes('-')) {
    parts = rawTitle.split('-').map(p => p.trim());
  }

  let semester = '';
  let courseCode = '';
  let courseName = '';
  let titlePart = '';

  const codeRegex = /[A-Z]{2,5}-?\d{3,4}[A-Z]?/i;
  const semRegex = /^(semester|sem|sem\s*\d|\bs\d\b)/i;

  const remaining: string[] = [];
  for (const part of parts) {
    if (semRegex.test(part) || /semester\s*\d+/i.test(part) || /sem\s*\d+/i.test(part)) {
      semester = part;
    } else if (codeRegex.test(part)) {
      const match = part.match(codeRegex);
      if (match) {
        courseCode = match[0].toUpperCase();
      }
    } else {
      remaining.push(part);
    }
  }

  if (remaining.length >= 2) {
    courseName = remaining[0];
    titlePart = remaining.slice(1).join(' - ');
  } else if (remaining.length === 1) {
    titlePart = remaining[0];
  }

  // Fallback checks using subject column text (which is often "Semester 6" or similar)
  if (rawSubjectCol) {
    if (!courseCode) {
      const match = rawSubjectCol.match(codeRegex);
      if (match) {
        courseCode = match[0].toUpperCase();
      }
    }
    if (!semester) {
      if (semRegex.test(rawSubjectCol) || /semester\s*\d+/i.test(rawSubjectCol) || /sem\s*\d+/i.test(rawSubjectCol)) {
        semester = rawSubjectCol;
      }
    }
    if (!courseName && !semRegex.test(rawSubjectCol)) {
      courseName = rawSubjectCol;
    }
  }

  if (courseCode && (!courseName || courseName === courseCode)) {
    courseName = getSubjectName(courseCode);
  }

  const cleanTitle = toTitleCase(titlePart || 'Assignment');
  const cleanCode = courseCode ? courseCode.toUpperCase() : '';
  const cleanCourseName = courseName ? toTitleCase(courseName) : '';

  return {
    title: cleanTitle,
    code: cleanCode,
    courseName: cleanCourseName,
    semester: semester ? toTitleCase(semester) : ''
  };
}

/**
 * Helper to calculate the relative urgency text and semantic color for coursework deadlines.
 */
function getRelativeUrgency(
  dateStr: string,
  isOverdue: boolean,
  isCompletedOrSubmitted: boolean
): { text: string; color: string; label: string } {
  const defaultText = `Due: ${dateStr}`;
  if (!dateStr || dateStr.toLowerCase().includes('to be') || dateStr.trim() === '') {
    return { text: dateStr || 'No deadline', color: '#5a5f63', label: 'TBA' };
  }

  // Parse DD-MM-YYYY or DD/MM/YYYY or YYYY-MM-DD
  const cleanStr = dateStr.replace(/\//g, '-').trim();
  const parts = cleanStr.split('-');
  
  let dateObj: Date | null = null;
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      // YYYY-MM-DD
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      dateObj = new Date(y, m, d, 23, 59, 59);
    } else if (parts[2].length === 4) {
      // DD-MM-YYYY
      const d = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const y = parseInt(parts[2], 10);
      dateObj = new Date(y, m, d, 23, 59, 59);
    }
  }

  if (!dateObj || isNaN(dateObj.getTime())) {
    return { text: defaultText, color: '#5a5f63', label: 'TBA' };
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetDay = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
  
  const diffTime = targetDay.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (isCompletedOrSubmitted) {
    return { text: defaultText, color: '#5a5f63', label: 'Done' };
  }

  if (diffDays < 0 || isOverdue) {
    const absDays = Math.abs(diffDays);
    if (absDays <= 1) {
      return { text: 'Overdue (yesterday)', color: '#ef4444', label: 'Overdue' };
    }
    return { text: `Overdue by ${absDays} days`, color: '#ef4444', label: 'Overdue' };
  } else if (diffDays === 0) {
    return { text: 'Due today!', color: '#ef4444', label: 'Urgent' };
  } else if (diffDays === 1) {
    return { text: 'Due tomorrow', color: '#d97706', label: 'Soon' };
  } else if (diffDays <= 3) {
    return { text: `Due in ${diffDays} days`, color: '#d97706', label: 'Soon' };
  } else {
    return { text: `Due in ${diffDays} days`, color: '#5a5f63', label: 'Normal' };
  }
}

interface AssignmentCardProps {
  assignment: Assignment;
  colors: any;
}

function AssignmentCard({ assignment, colors }: AssignmentCardProps) {
  const { title: rawTitle, subject, dueDate, status } = assignment;
  const { title, code, courseName } = getCleanTitleAndCode(rawTitle, subject);
  const colorScheme = useColorScheme();
  const scheme = colorScheme === 'dark' ? 'dark' : 'light';

  // Strip code from courseName and format it nicely
  const displayCourseName = toTitleCase(cleanCourseName(courseName || subject, code));
  const displayAssignmentTitle = title || 'Assignment';

  // Determine badge colors and icons based on status
  let badgeBg = 'rgba(90, 95, 99, 0.08)';
  let badgeText = colors.secondary;
  let label = 'Unknown';
  let StatusIcon = CircleAlert;

  if (status === 'submitted') {
    badgeBg = scheme === 'dark' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)';
    badgeText = '#10b981';
    label = 'Submitted';
    StatusIcon = CircleCheck;
  } else if (status === 'pending') {
    badgeBg = scheme === 'dark' ? 'rgba(9, 76, 178, 0.15)' : 'rgba(9, 76, 178, 0.08)';
    badgeText = colors.primary;
    label = 'Pending';
    StatusIcon = Clock3;
  } else if (status === 'overdue') {
    badgeBg = scheme === 'dark' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)';
    badgeText = '#ef4444';
    label = 'Overdue';
    StatusIcon = CircleAlert;
  }

  // Soft border tint glow matching status
  const borderStart = scheme === 'dark'
    ? (status === 'submitted' ? 'rgba(16, 185, 129, 0.22)' : status === 'pending' ? 'rgba(9, 76, 178, 0.22)' : status === 'overdue' ? 'rgba(239, 68, 68, 0.22)' : 'rgba(90, 95, 99, 0.22)')
    : (status === 'submitted' ? 'rgba(16, 185, 129, 0.12)' : status === 'pending' ? 'rgba(9, 76, 178, 0.12)' : status === 'overdue' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(90, 95, 99, 0.12)');

  const borderEnd = scheme === 'dark'
    ? (status === 'submitted' ? 'rgba(16, 185, 129, 0.55)' : status === 'pending' ? 'rgba(9, 76, 178, 0.55)' : status === 'overdue' ? 'rgba(239, 68, 68, 0.55)' : 'rgba(90, 95, 99, 0.55)')
    : (status === 'submitted' ? 'rgba(16, 185, 129, 0.35)' : status === 'pending' ? 'rgba(9, 76, 178, 0.35)' : status === 'overdue' ? 'rgba(239, 68, 68, 0.35)' : 'rgba(90, 95, 99, 0.35)');


  // Dynamic relative urgency date parsing
  const urgency = getRelativeUrgency(dueDate, status === 'overdue', status === 'submitted');

  // Hardware-accelerated spring animations for micro-interactions
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const shadow = useSharedValue(2);
  const glowProgress = useSharedValue(0);

  const handlePressIn = () => {
    scale.value = withSpring(0.985, { damping: 15, stiffness: 300 });
    opacity.value = withSpring(0.96, { damping: 15, stiffness: 300 });
    shadow.value = withSpring(3, { damping: 15, stiffness: 300 });
    glowProgress.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
    opacity.value = withSpring(1, { damping: 15, stiffness: 300 });
    shadow.value = withSpring(2, { damping: 15, stiffness: 300 });
    glowProgress.value = withSpring(0, { damping: 15, stiffness: 300 });
  };

  const animatedStyle = useAnimatedStyle(() => {
    const borderColor = interpolateColor(
      glowProgress.value,
      [0, 1],
      [borderStart, borderEnd]
    );

    const shadowOpacityVal = scheme === 'dark'
      ? interpolate(glowProgress.value, [0, 1], [0.15, 0.35])
      : interpolate(glowProgress.value, [0, 1], [0.04, 0.12]);

    const shadowRadiusVal = interpolate(glowProgress.value, [0, 1], [6, 12]);

    return {
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
      borderColor: borderColor,
      shadowOpacity: shadowOpacityVal,
      shadowRadius: shadowRadiusVal,
      elevation: shadow.value,
    };
  });

  return (
    <AnimatedPressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.assignCard,
        {
          backgroundColor: colors.surfaceLowest,
          borderWidth: 1,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
        },
        animatedStyle
      ]}
    >
      {/* Background Watermark Icon */}
      <View style={styles.watermarkContainer} pointerEvents="none">
        <FileText 
          size={76} 
          color={badgeText} 
          strokeWidth={0.8}
        />
      </View>

      {/* Left accent strip */}
      <View style={[styles.accentStrip, { backgroundColor: badgeText }]} />

      <View style={styles.cardInner}>
        {/* Header: Code & Status */}
        <View style={styles.gridHeader}>
          <View style={styles.headerLeft}>
            <FileText size={11} color={colors.textSecondary} style={{ opacity: 0.6 }} />
            {code ? (
              <View style={[styles.codeBadgeGrid, { backgroundColor: scheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(9, 76, 178, 0.06)' }]}>
                <Text style={[styles.codeBadgeTextGrid, { color: colors.primary }]}>
                  {code.toUpperCase()}
                </Text>
              </View>
            ) : null}
          </View>
          <View style={[styles.statusBadgeGrid, { backgroundColor: badgeBg }]}>
            <StatusIcon size={9} color={badgeText} strokeWidth={2.5} />
            <Text style={[styles.statusBadgeTextGrid, { color: badgeText }]}>{label}</Text>
          </View>
        </View>

        {/* Content: Course & Title */}
        <View style={styles.gridContent}>
          <Text style={[styles.courseTitleGrid, { color: colors.text }]} numberOfLines={2}>
            {displayCourseName}
          </Text>
          {displayAssignmentTitle ? (
            <Text style={[styles.assignmentTitleGrid, { color: colors.textSecondary }]} numberOfLines={2}>
              {displayAssignmentTitle}
            </Text>
          ) : null}
        </View>

        {/* Footer: Due date */}
        <View style={styles.gridFooter}>
          <Clock3 size={10} color={urgency.color} style={{ marginRight: 4, opacity: 0.8 }} />
          <Text style={[styles.dueTextGrid, { color: urgency.color }]} numberOfLines={1}>
            {urgency.label === 'Done' ? 'Submitted' : urgency.text}
          </Text>
        </View>
      </View>
    </AnimatedPressable>
  );
}

export default function AssignmentScreen() {
  const colorScheme = useColorScheme();
  const scheme = colorScheme === 'dark' ? 'dark' : 'light';
  const colors = Colors[scheme];

  const { isLoggedIn, handleSessionExpired } = useLogin();
  const [assignments, setAssignments] = useState<Assignment[]>(dataCache.assignments || []);
  const [isLoading, setIsLoading] = useState(!dataCache.assignments);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'submitted'>('all');

  const loadData = useCallback(async (showRefreshingSpinner = false) => {
    if (!isLoggedIn) return;
    const hasCache = dataCache.assignments && dataCache.assignments.length > 0;
    const isStale = dataCache.isStale('assignments');

    // Skip network request if we have fresh cached data and aren't forcing a refresh
    if (hasCache && !isStale && !showRefreshingSpinner) {
      return;
    }

    if (showRefreshingSpinner) {
      setIsRefreshing(true);
      Haptics.selectionAsync().catch(() => {});
    } else if (!hasCache) {
      setIsLoading(true);
    }
    setErrorMsg('');

    try {
      const res = await fetchAssignments();
      if (res.sessionExpired) {
        handleSessionExpired();
        return;
      }
      if (!res.ok) {
        throw new Error('Failed to retrieve coursework from ETLAB.');
      }
      const data = parseAssignments(res.html);
      setAssignments(data);
      await dataCache.setAssignments(data);
      setLastUpdated('Updated just now');
    } catch (err: any) {
      if (!hasCache) {
        setErrorMsg(err.message || 'An error occurred while loading assignments.');
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [isLoggedIn, handleSessionExpired]);

  useEffect(() => {
    if (isLoggedIn) {
      loadData();
    }
  }, [loadData, isLoggedIn]);

  // Dynamic filter stats counts calculation
  const counts = useMemo(() => {
    return {
      all: assignments.length,
      pending: assignments.filter(a => a.status === 'pending').length,
      submitted: assignments.filter(a => a.status === 'submitted').length,
    };
  }, [assignments]);

  const filteredAssignments = useMemo(() => {
    if (activeFilter === 'all') return assignments;
    return assignments.filter(a => a.status === activeFilter);
  }, [assignments, activeFilter]);

  return (
    <ProtectedScreen>
      <SafeAreaView edges={['top', 'left', 'right']} style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Subtle Ambient Glow */}
        <View style={[styles.ambientGlow, { backgroundColor: colors.primary + '08' }]} />

        {/* Header */}
        <View style={styles.topBar}>
          <View>
            <Text style={[styles.topBarSub, { color: colors.textSecondary }]}>
              {lastUpdated ? `COURSEWORK • ${lastUpdated.toUpperCase()}` : 'COURSEWORK'}
            </Text>
            <Text style={[styles.topBarTitle, { color: colors.text }]}>Assignments</Text>
          </View>
          <ProfileButton />
        </View>

        {/* Horizontal Filter Bar */}
        {!isLoading && !errorMsg && (
          <View style={styles.filterContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
              {(['all', 'pending', 'submitted'] as const).map((filter) => {
                const isActive = activeFilter === filter;
                const count = counts[filter];
                const label = filter === 'all' 
                  ? `All (${count})` 
                  : filter === 'pending' 
                    ? `Pending (${count})` 
                    : `Submitted (${count})`;

                return (
                  <Pressable
                    key={filter}
                    onPress={() => {
                      Haptics.selectionAsync().catch(() => {});
                      setActiveFilter(filter);
                    }}
                    style={[
                      styles.filterPill,
                      isActive 
                        ? { backgroundColor: colors.primary }
                        : { backgroundColor: colors.surfaceContainer }
                    ]}
                  >
                    <Text 
                      style={[
                        styles.filterPillText, 
                        isActive 
                          ? { color: colors.surfaceLowest, fontFamily: Fonts.bodyBold }
                          : { color: colors.textSecondary, fontFamily: Fonts.bodyMedium }
                      ]}
                    >
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}

        {isLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading coursework...</Text>
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
            showsVerticalScrollIndicator={false}
            contentInsetAdjustmentBehavior="automatic"
            refreshControl={
              <RefreshControl refreshing={isRefreshing} onRefresh={() => loadData(true)} tintColor={colors.primary} />
            }
          >
            {filteredAssignments.length === 0 ? (
              <View style={[styles.placeholderCard, { backgroundColor: colors.surfaceContainer }]}>
                <View style={[styles.emptyIconBg, { backgroundColor: colors.surfaceHighest }]}>
                  <FileText size={32} color={colors.textSecondary} strokeWidth={1.8} />
                </View>
                <Text style={[styles.placeholderTitle, { color: colors.text }]}>
                  No {activeFilter !== 'all' ? activeFilter : ''} Assignments
                </Text>
                <Text style={[styles.placeholderDesc, { color: colors.textSecondary }]}>
                  You have no {activeFilter !== 'all' ? activeFilter : ''} coursework items recorded on ETLAB.
                </Text>
              </View>
            ) : (
              <View style={styles.gridContainer}>
                {filteredAssignments.map((item, idx) => (
                  <Animated.View 
                    key={idx} 
                    entering={FadeInDown.delay(idx * 40).springify()}
                    style={styles.gridItem}
                  >
                    <AssignmentCard assignment={item} colors={colors} />
                  </Animated.View>
                ))}
              </View>
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </ProtectedScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  ambientGlow: {
    position: 'absolute',
    top: -120,
    left: -120,
    width: 320,
    height: 320,
    borderRadius: 160,
    pointerEvents: 'none',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.five,
    paddingBottom: Spacing.three,
  },
  topBarSub: {
    fontFamily: Fonts.label,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  topBarTitle: {
    fontFamily: Fonts.headlineBold,
    fontSize: 28,
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
  filterContainer: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.three,
  },
  filterScroll: {
    gap: Spacing.two,
    alignItems: 'center',
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterPillText: {
    fontSize: 13,
  },
  scrollContainer: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    paddingBottom: 96,
    gap: Spacing.two,
  },
  placeholderCard: {
    padding: Spacing.six,
    borderRadius: 20,
    alignItems: 'center',
    gap: Spacing.two,
    alignSelf: 'center',
    width: '90%',
    maxWidth: 400,
    marginTop: Spacing.six,
  },
  emptyIconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  placeholderTitle: {
    fontFamily: Fonts.headlineBold,
    fontSize: 18,
    textAlign: 'center',
    marginTop: Spacing.one,
  },
  placeholderDesc: {
    fontFamily: Fonts.body,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    opacity: 0.8,
    maxWidth: 280,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 12,
    columnGap: 12,
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  gridItem: {
    width: '48%',
  },
  watermarkContainer: {
    position: 'absolute',
    right: -15,
    bottom: -15,
    opacity: 0.05,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  assignCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
    position: 'relative',
    paddingLeft: 8,
    flex: 1,
  },
  accentStrip: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
  },
  cardInner: {
    padding: 10,
    gap: 8,
  },
  gridHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },
  codeBadgeGrid: {
    paddingHorizontal: 4,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  codeBadgeTextGrid: {
    fontFamily: Fonts.bodyBold,
    fontSize: 8,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  statusBadgeGrid: {
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: Roundness.full,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2.5,
  },
  statusBadgeTextGrid: {
    fontFamily: Fonts.bodyBold,
    fontSize: 9,
  },
  gridContent: {
    gap: 4,
    minHeight: 68,
  },
  courseTitleGrid: {
    fontFamily: Fonts.bodyBold,
    fontSize: 12.5,
    lineHeight: 16,
  },
  assignmentTitleGrid: {
    fontFamily: Fonts.body,
    fontSize: 10.5,
    lineHeight: 14,
    opacity: 0.7,
  },
  gridFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 'auto',
  },
  dueTextGrid: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 10,
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

