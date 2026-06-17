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
  Linking,
  Alert,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Fonts, Spacing, Roundness } from '@/constants/theme';
import { ProtectedScreen } from '@/components/protected-screen';
import { ProfileButton } from '@/components/profile-button';
import { useLogin } from '@/components/login-context';
import { fetchSurveys } from '@/services/etlab-api';
import { parseSurveys, Survey } from '@/services/etlab-parser';
import { getSubjectName } from '@/services/subject-helper';
import { dataCache } from '@/services/data-cache';
import * as Haptics from 'expo-haptics';
import Animated, { 
  FadeInDown, 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  interpolateColor
} from 'react-native-reanimated';
import { 
  ClipboardList, 
  Clock3, 
  Info, 
  ExternalLink,
  CircleCheck,
  CircleAlert
} from 'lucide-react-native';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Utility function to parse system survey titles into clean readable names (in Sentence case) and course codes.
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

  // Fallback checks using subject column text
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

  const cleanTitle = toTitleCase(titlePart || 'Survey');
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
  const defaultText = `Deadline: ${dateStr}`;
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

interface SurveyCardProps {
  survey: Survey;
  colors: any;
}

function SurveyCard({ survey, colors }: SurveyCardProps) {
  const { title: rawTitle, description, deadline, status, url } = survey;
  const { title, code, courseName } = getCleanTitleAndCode(rawTitle, '');
  const colorScheme = useColorScheme();
  const scheme = colorScheme === 'dark' ? 'dark' : 'light';

  // Strip code from courseName and format it nicely
  const displayCourseName = courseName 
    ? toTitleCase(cleanCourseName(courseName, code)) 
    : (title || 'Survey');
  const displaySurveyTitle = courseName ? (title || 'Survey') : '';

  // Determine badge colors based on status
  let badgeBg = 'rgba(90, 95, 99, 0.08)';
  let badgeText = colors.secondary;
  let label = 'Unknown';
  let StatusIcon = CircleAlert;

  if (status === 'completed') {
    badgeBg = scheme === 'dark' ? 'rgba(74, 222, 128, 0.15)' : 'rgba(34, 197, 94, 0.1)';
    badgeText = colors.success;
    label = 'Completed';
    StatusIcon = CircleCheck;
  } else if (status === 'pending') {
    badgeBg = scheme === 'dark' ? 'rgba(250, 204, 21, 0.15)' : 'rgba(234, 179, 8, 0.08)';
    badgeText = colors.warning;
    label = 'Pending';
    StatusIcon = Clock3;
  } else if (status === 'new') {
    badgeBg = scheme === 'dark' ? 'rgba(177, 197, 255, 0.15)' : 'rgba(9, 76, 178, 0.08)';
    badgeText = colors.primary;
    label = 'New';
    StatusIcon = CircleAlert;
  }

  // Dynamic relative urgency date parsing
  const urgency = getRelativeUrgency(deadline, false, status === 'completed');

  const handlePress = () => {
    if (url) {
      Haptics.selectionAsync().catch(() => {});
      Linking.openURL(url).catch(() => {
        Alert.alert('Error', 'Unable to open survey link.');
      });
    }
  };

  // Reanimated spring values for micro-interactions
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const glowProgress = useSharedValue(0);

  const handlePressIn = () => {
    if (url) {
      scale.value = withSpring(0.99, { damping: 15, stiffness: 300 });
      opacity.value = withSpring(0.97, { damping: 15, stiffness: 300 });
      glowProgress.value = withSpring(1, { damping: 15, stiffness: 300 });
    }
  };

  const handlePressOut = () => {
    if (url) {
      scale.value = withSpring(1, { damping: 15, stiffness: 300 });
      opacity.value = withSpring(1, { damping: 15, stiffness: 300 });
      glowProgress.value = withSpring(0, { damping: 15, stiffness: 300 });
    }
  };

  const animatedStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      glowProgress.value,
      [0, 1],
      [
        scheme === 'dark' ? 'rgba(255, 255, 255, 0)' : 'rgba(9, 76, 178, 0)',
        scheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(9, 76, 178, 0.06)'
      ]
    );

    return {
      backgroundColor: backgroundColor,
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
    };
  });

  return (
    <AnimatedPressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.surveyCard,
        animatedStyle
      ]}
      onPress={url ? handlePress : undefined}
      disabled={!url}
    >

      {/* Main Row Content */}
      <View style={styles.listItemContent}>
        {/* Left Section: Info Stack */}
        <View style={styles.listItemLeft}>
          <View style={styles.titleRow}>
            {code ? (
              <View style={[styles.codeBadgeCompact, { backgroundColor: scheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(9, 76, 178, 0.06)' }]}>
                <Text style={[styles.codeBadgeTextCompact, { color: colors.primary }]}>
                  {code.toUpperCase()}
                </Text>
              </View>
            ) : null}
            <Text style={[styles.itemTitle, { color: colors.text }]} numberOfLines={1}>
              {displayCourseName}
            </Text>
          </View>
          
          <View style={styles.subRow}>
            {displaySurveyTitle ? (
              <Text style={[styles.itemSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
                {displaySurveyTitle}
              </Text>
            ) : null}
            
            {deadline ? (
              <View style={styles.deadlineRow}>
                {displaySurveyTitle ? <Text style={[styles.dotSeparator, { color: colors.textSecondary }]}>•</Text> : null}
                <Clock3 size={10} color={urgency.color} style={styles.deadlineIcon} />
                <Text style={[styles.itemDeadline, { color: urgency.color }]}>
                  {urgency.label === 'Done' ? 'Completed' : urgency.text}
                </Text>
              </View>
            ) : null}
          </View>

          {description ? (
            <Text style={[styles.itemDesc, { color: colors.textSecondary }]} numberOfLines={1}>
              {description}
            </Text>
          ) : null}
        </View>

        {/* Right Section: Status Pill + Link */}
        <View style={styles.listItemRight}>
          <View style={[styles.statusBadgeCompact, { backgroundColor: badgeBg }]}>
            <StatusIcon size={10} color={badgeText} strokeWidth={2.5} />
            <Text style={[styles.statusBadgeTextCompact, { color: badgeText }]}>{label}</Text>
          </View>
          {url ? (
            <View style={styles.actionIconContainer}>
              <ExternalLink size={12} color={colors.primary} />
            </View>
          ) : null}
        </View>
      </View>
    </AnimatedPressable>
  );
}

export default function SurveyScreen() {
  const colorScheme = useColorScheme();
  const scheme = colorScheme === 'dark' ? 'dark' : 'light';
  const colors = Colors[scheme];

  const { isLoggedIn, handleSessionExpired } = useLogin();
  const [surveys, setSurveys] = useState<Survey[]>(dataCache.surveys || []);
  const [isLoading, setIsLoading] = useState(!dataCache.surveys);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'completed'>('all');

  const loadData = useCallback(async (showRefreshingSpinner = false) => {
    if (!isLoggedIn) return;
    const hasCache = dataCache.surveys && dataCache.surveys.length > 0;
    const isStale = dataCache.isStale('surveys');

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
      const res = await fetchSurveys();
      if (res.sessionExpired) {
        handleSessionExpired();
        return;
      }
      if (!res.ok) {
        throw new Error('Failed to retrieve surveys from ETLAB.');
      }
      const data = parseSurveys(res.html);
      setSurveys(data);
      await dataCache.setSurveys(data);
      setLastUpdated('Updated just now');
    } catch (err: any) {
      if (!hasCache) {
        setErrorMsg(err.message || 'An error occurred while loading surveys.');
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
      all: surveys.length,
      pending: surveys.filter(s => s.status === 'pending' || s.status === 'new').length,
      completed: surveys.filter(s => s.status === 'completed').length,
    };
  }, [surveys]);

  const filteredSurveys = useMemo(() => {
    if (activeFilter === 'all') return surveys;
    if (activeFilter === 'pending') {
      return surveys.filter(s => s.status === 'pending' || s.status === 'new');
    }
    return surveys.filter(s => s.status === 'completed');
  }, [surveys, activeFilter]);

  return (
    <ProtectedScreen>
      <SafeAreaView edges={['top', 'left', 'right']} style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Subtle Ambient Glow */}
        <View style={[styles.ambientGlow, { backgroundColor: colors.primary + '08' }]} />

        {/* Header */}
        <View style={styles.topBar}>
          <View>
            <Text style={[styles.topBarSub, { color: colors.textSecondary }]}>
              {lastUpdated ? `FEEDBACK • ${lastUpdated.toUpperCase()}` : 'FEEDBACK'}
            </Text>
            <Text style={[styles.topBarTitle, { color: colors.text }]}>Surveys</Text>
          </View>
          <ProfileButton />
        </View>

        {/* Horizontal Filter Bar */}
        {!isLoading && !errorMsg && (
          <View style={styles.filterContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
              {(['all', 'pending', 'completed'] as const).map((filter) => {
                const isActive = activeFilter === filter;
                const count = counts[filter];
                const label = filter === 'all' 
                  ? `All (${count})` 
                  : filter === 'pending' 
                    ? `Pending (${count})` 
                    : `Completed (${count})`;

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
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading surveys...</Text>
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
            {filteredSurveys.length === 0 ? (
              <View style={[styles.placeholderCard, { backgroundColor: colors.surfaceContainer }]}>
                <View style={[styles.emptyIconBg, { backgroundColor: colors.surfaceHighest }]}>
                  <ClipboardList size={32} color={colors.textSecondary} strokeWidth={1.8} />
                </View>
                <Text style={[styles.placeholderTitle, { color: colors.text }]}>
                  No {activeFilter !== 'all' ? activeFilter : ''} Surveys
                </Text>
                <Text style={[styles.placeholderDesc, { color: colors.textSecondary }]}>
                  Faculty and course surveys will appear here when they become available for your semester.
                </Text>
              </View>
            ) : (
              <View style={styles.listWrapper}>
                {filteredSurveys.map((item, idx) => (
                  <Animated.View key={idx} entering={FadeInDown.delay(idx * 40).springify()}>
                    <SurveyCard survey={item} colors={colors} />
                    {idx < filteredSurveys.length - 1 && (
                      <View style={[styles.listDivider, { backgroundColor: colors.outlineVariant }]} />
                    )}
                  </Animated.View>
                ))}
              </View>
            )}

            {/* Info card */}
            <View style={[styles.infoCard, { backgroundColor: colors.surfaceContainer }]}>
              <Info size={16} color={colors.textSecondary} style={{ marginTop: 2, marginRight: 8 }} />
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                Surveys are typically available during the last two weeks of each semester. Your responses are anonymous and help improve teaching quality.
              </Text>
            </View>
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
  infoCard: {
    padding: Spacing.four,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: Spacing.two,
  },
  infoText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
    opacity: 0.8,
  },
  listWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  listDivider: {
    height: 1,
    opacity: 0.3,
    marginHorizontal: 12,
  },
  surveyCard: {
    overflow: 'hidden',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  listItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  listItemLeft: {
    flex: 1,
    paddingRight: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  codeBadgeCompact: {
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  codeBadgeTextCompact: {
    fontFamily: Fonts.bodyBold,
    fontSize: 9,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  itemTitle: {
    fontFamily: Fonts.bodyBold,
    fontSize: 14,
    flex: 1,
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    flexWrap: 'wrap',
  },
  itemSubtitle: {
    fontFamily: Fonts.body,
    fontSize: 11,
    opacity: 0.7,
  },
  dotSeparator: {
    fontSize: 11,
    marginHorizontal: 4,
    opacity: 0.5,
  },
  deadlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deadlineIcon: {
    marginRight: 3,
    opacity: 0.8,
  },
  itemDeadline: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 11,
  },
  itemDesc: {
    fontFamily: Fonts.body,
    fontSize: 11,
    opacity: 0.6,
    marginTop: 2,
  },
  listItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusBadgeCompact: {
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: Roundness.full,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  statusBadgeTextCompact: {
    fontFamily: Fonts.bodyBold,
    fontSize: 10,
  },
  actionIconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 20,
    height: 20,
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
