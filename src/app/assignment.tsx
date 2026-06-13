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
  BookOpen 
} from 'lucide-react-native';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Utility function to parse system coursework titles into clean readable names and course codes.
 */
function getCleanTitleAndCode(rawTitle: string) {
  if (rawTitle.includes(' : ')) {
    const parts = rawTitle.split(' : ');
    const codePart = parts[0].trim();
    const cleanTitle = parts[1].trim();

    // Try to extract course code (e.g. CST362) from codePart
    const codeMatch = codePart.match(/[A-Z]{2,5}-\d{3,4}/) || codePart.match(/[A-Z]{2,5}\d{3,4}/);
    const displayCode = codeMatch ? codeMatch[0] : codePart;

    return { title: cleanTitle, code: displayCode };
  }
  return { title: rawTitle, code: '' };
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

  // Determine badge colors based on status
  let badgeBg = 'rgba(90, 95, 99, 0.08)';
  let badgeText = colors.secondary;
  let label = 'Unknown';
  let StatusIcon = CircleAlert;

  if (status === 'submitted') {
    badgeBg = `${colors.success}15`;
    badgeText = colors.success;
    label = 'Submitted';
    StatusIcon = CircleCheck;
  } else if (status === 'pending') {
    badgeBg = `${colors.primary}15`;
    badgeText = colors.primary;
    label = 'Pending';
    StatusIcon = Clock3;
  } else if (status === 'overdue') {
    badgeBg = `${colors.error}15`;
    badgeText = colors.error;
    label = 'Overdue';
    StatusIcon = CircleAlert;
  }

  // Hardware-accelerated spring animations for micro-interactions
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const shadow = useSharedValue(3);

  const handlePressIn = () => {
    scale.value = withSpring(0.985, { damping: 15, stiffness: 300 });
    opacity.value = withSpring(0.96, { damping: 15, stiffness: 300 });
    shadow.value = withSpring(4, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
    opacity.value = withSpring(1, { damping: 15, stiffness: 300 });
    shadow.value = withSpring(3, { damping: 15, stiffness: 300 });
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
          backgroundColor: scheme === 'dark' ? colors.surfaceContainer : colors.surfaceLowest,
          borderColor: colors.ghostBorder,
          borderWidth: 1,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: scheme === 'dark' ? 0.18 : 0.05,
        },
        animatedStyle
      ]}
    >
      <View style={styles.assignHeader}>
        <View style={styles.titleRow}>
          {/* Circular Tinted Icon Badge Container */}
          <View style={[styles.iconBadge, { backgroundColor: `${colors.primary}12` }]}>
            <FileText size={18} color={colors.primary} strokeWidth={2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.assignTitle, { color: colors.text }]} numberOfLines={2}>
              {title}
            </Text>
            {code ? (
              <Text style={[styles.assignCode, { color: colors.textSecondary }]}>
                {code}
              </Text>
            ) : null}
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: badgeBg }]}>
          <StatusIcon size={12} color={badgeText} style={{ marginRight: 4 }} strokeWidth={2.5} />
          <Text style={[styles.statusText, { color: badgeText }]}>{label}</Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        {subject ? (
          <View style={styles.metaItem}>
            <BookOpen size={13} color={colors.textSecondary} style={{ opacity: 0.8 }} />
            <Text style={[styles.metaText, { color: colors.textSecondary }]} numberOfLines={1}>
              {subject}
            </Text>
          </View>
        ) : null}
        <View style={styles.metaItem}>
          <Clock3 size={13} color={colors.textSecondary} style={{ opacity: 0.8 }} />
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
    padding: Spacing.four,
    paddingBottom: 96,
    gap: Spacing.four,
  },
  placeholderCard: {
    padding: Spacing.six,
    borderRadius: 24,
    alignItems: 'center',
    gap: Spacing.two,
    alignSelf: 'center',
    width: '90%',
    maxWidth: 400,
    marginTop: Spacing.six,
  },
  emptyIconBg: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  placeholderTitle: {
    fontFamily: Fonts.headlineBold,
    fontSize: 20,
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
    padding: Spacing.five,
    borderRadius: 24,
    gap: Spacing.two,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
    elevation: 3,
  },
  assignHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    flex: 1,
    paddingRight: Spacing.two,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  assignTitle: {
    fontFamily: Fonts.bodyBold,
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: -0.2,
    flex: 1,
  },
  assignCode: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 12,
    opacity: 0.65,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 11,
  },
  assignMeta: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 12,
    opacity: 0.55,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.three,
    marginTop: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 12,
    opacity: 0.75,
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
