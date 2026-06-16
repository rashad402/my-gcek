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
import { dataCache } from '@/services/data-cache';
import * as Haptics from 'expo-haptics';
import Animated, { 
  FadeInDown, 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring 
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
function getCleanTitleAndCode(rawTitle: string) {
  let cleanTitle = rawTitle.trim();
  let displayCode = '';

  const spaceColonSpaceIdx = rawTitle.indexOf(' : ');
  const colonIdx = rawTitle.indexOf(':');
  const spaceHyphenSpaceIdx = rawTitle.indexOf(' - ');

  if (spaceColonSpaceIdx !== -1) {
    const parts = rawTitle.split(' : ');
    const codePart = parts[0].trim();
    cleanTitle = parts.slice(1).join(' : ').trim();
    displayCode = codePart;
  } else if (colonIdx !== -1) {
    const codePart = rawTitle.substring(0, colonIdx).trim();
    cleanTitle = rawTitle.substring(colonIdx + 1).trim();
    displayCode = codePart;
  } else if (spaceHyphenSpaceIdx !== -1) {
    const codePart = rawTitle.substring(0, spaceHyphenSpaceIdx).trim();
    cleanTitle = rawTitle.substring(spaceHyphenSpaceIdx + 3).trim();
    displayCode = codePart;
  }

  const toSentenceCase = (str: string): string => {
    if (!str) return '';
    let cleaned = str.trim().toLowerCase();
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);

    const acronyms = [
      'ai', 'ml', 'dbms', 'sql', 'it', 'ktu', 'cse', 'ece', 'eee', 'me', 'ce', 'mca', 'btech', 'gcek',
      'python', 'java', 'html', 'css', 'js', 'json', 'pdf', 'cad', 'cam', 'vlsi', 'iot'
    ];
    
    const words = cleaned.split(/\s+/);
    const mappedWords = words.map((word, index) => {
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
            return index === 0 ? proper.charAt(0).toUpperCase() + proper.slice(1) : proper;
          }
          return m;
        });
      }
      if (/^[ivx]+$/i.test(cleanWord)) {
        return word.replace(/[a-zA-Z]+/g, (m) => m.toUpperCase());
      }
      return word;
    });

    return mappedWords.join(' ');
  };

  if (displayCode) {
    const codeMatch = displayCode.match(/[A-Z]{2,5}-\d{3,4}/i) || displayCode.match(/[A-Z]{2,5}\d{3,4}/i);
    if (codeMatch) {
      displayCode = codeMatch[0].toUpperCase();
    } else if (!/\s/.test(displayCode)) {
      displayCode = displayCode.toUpperCase();
    } else {
      displayCode = toSentenceCase(displayCode);
    }
  }

  if (cleanTitle) {
    cleanTitle = toSentenceCase(cleanTitle);
  }

  return { title: cleanTitle, code: displayCode };
}

interface AssignmentCardProps {
  assignment: Assignment;
  colors: any;
}

function AssignmentCard({ assignment, colors }: AssignmentCardProps) {
  const { title: rawTitle, subject, dueDate, status } = assignment;
  const { title, code } = getCleanTitleAndCode(rawTitle);
  const colorScheme = useColorScheme();
  const scheme = colorScheme === 'dark' ? 'dark' : 'light';

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
  const cardBorderColor = scheme === 'dark'
    ? (status === 'submitted' ? 'rgba(16, 185, 129, 0.22)' : status === 'pending' ? 'rgba(9, 76, 178, 0.22)' : 'rgba(239, 68, 68, 0.22)')
    : (status === 'submitted' ? 'rgba(16, 185, 129, 0.12)' : status === 'pending' ? 'rgba(9, 76, 178, 0.12)' : 'rgba(239, 68, 68, 0.12)');

  // Hardware-accelerated spring animations for micro-interactions
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const shadow = useSharedValue(2);

  const handlePressIn = () => {
    scale.value = withSpring(0.985, { damping: 15, stiffness: 300 });
    opacity.value = withSpring(0.96, { damping: 15, stiffness: 300 });
    shadow.value = withSpring(3, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
    opacity.value = withSpring(1, { damping: 15, stiffness: 300 });
    shadow.value = withSpring(2, { damping: 15, stiffness: 300 });
  };

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
      shadowRadius: shadow.value * 4,
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
          borderColor: cardBorderColor,
          borderWidth: 1,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: scheme === 'dark' ? 0.15 : 0.04,
        },
        animatedStyle
      ]}
    >
      {/* Left accent strip */}
      <View style={[styles.accentStrip, { backgroundColor: badgeText }]} />

      {/* Card Header */}
      <View style={styles.cardHeader}>
        <View style={styles.cardLeft}>
          <View style={[styles.iconCircle, { backgroundColor: scheme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(9, 76, 178, 0.06)' }]}>
            <FileText size={20} color={colors.primary} strokeWidth={1.8} />
          </View>
          <View style={styles.cardHeaderText}>
            <Text style={[styles.subjectTitle, { color: colors.text }]} numberOfLines={1}>
              {title}
            </Text>
            <Text style={[styles.subjectSubtitle, { color: colors.textSecondary }]}>
              {code ? `${code} • ` : ''}{subject}
            </Text>
          </View>
        </View>
        <View style={[styles.perfBadge, { backgroundColor: badgeBg }]}>
          <StatusIcon size={12} color={badgeText} strokeWidth={2.2} />
          <Text style={[styles.perfBadgeText, { color: badgeText }]}>{label}</Text>
        </View>
      </View>

      {/* Card Content (Divider + Due Date) */}
      <View style={styles.cardContent}>
        <View style={[styles.divider, { backgroundColor: colors.outlineVariant }]} />
        <View style={styles.metaRow}>
          <Clock3 size={12} color={colors.textSecondary} style={{ opacity: 0.7 }} />
          <Text style={[styles.assignMeta, { color: colors.textSecondary }]}>
            Due: {dueDate}
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
              filteredAssignments.map((item, idx) => (
                <Animated.View key={idx} entering={FadeInDown.delay(idx * 40).springify()}>
                  <AssignmentCard assignment={item} colors={colors} />
                </Animated.View>
              ))
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
  assignCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    position: 'relative',
    paddingLeft: 12,
  },
  accentStrip: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 5,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.three,
    gap: Spacing.one,
    minHeight: 64,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    flex: 1,
  },
  cardHeaderText: {
    flex: 1,
    gap: 2,
  },
  subjectTitle: {
    fontFamily: Fonts.bodyBold,
    fontSize: 15,
  },
  subjectSubtitle: {
    fontFamily: Fonts.body,
    fontSize: 11,
    opacity: 0.7,
  },
  perfBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Roundness.full,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  perfBadgeText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 12,
  },
  cardContent: {
    paddingBottom: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  divider: {
    height: 0.5,
    marginBottom: Spacing.two,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  assignMeta: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 11,
    opacity: 0.7,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: Roundness.full,
    justifyContent: 'center',
    alignItems: 'center',
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

