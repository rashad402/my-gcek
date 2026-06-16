import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ProtectedScreen } from '@/components/protected-screen';
import { ProfileButton } from '@/components/profile-button';
import { Colors, Fonts, Spacing, Roundness } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useLogin } from '@/components/login-context';
import { fetchResults } from '@/services/etlab-api';
import { parseResults, SubjectResult, ResultEntry } from '@/services/etlab-parser';
import { dataCache } from '@/services/data-cache';
import * as Haptics from 'expo-haptics';
import Animated, { 
  useAnimatedStyle, 
  withSpring, 
  FadeInUp, 
  useSharedValue,
} from 'react-native-reanimated';
import Toast from 'react-native-toast-message';

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

function StatisticsCard({ subjects, colors }: { subjects: SubjectResult[], colors: any }) {
  const colorScheme = useColorScheme();
  const scheme = colorScheme === 'dark' ? 'dark' : 'light';
  
  const totalSubjects = subjects.length;
  const avgPercentage = subjects.reduce((sum, s) => {
    const obtained = s.results.reduce((o, r) => o + (r.marks ?? 0), 0);
    const possible = s.results.reduce((p, r) => p + (r.marks !== null ? r.total : 0), 0);
    return sum + (possible > 0 ? (obtained / possible) * 100 : 0);
  }, 0) / (totalSubjects || 1);

  const totalAssessments = subjects.reduce((sum, s) => sum + s.results.length, 0);

  const bg = scheme === 'dark' ? 'rgba(177, 197, 255, 0.06)' : 'rgba(9, 76, 178, 0.04)';
  const dividerColor = scheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';

  return (
    <View style={[styles.statsCard, { backgroundColor: bg, borderColor: colors.outlineVariant || 'rgba(0,0,0,0.05)', borderWidth: 1 }]}>
      <View style={styles.statItem}>
        <View style={[styles.statIconCircle, { backgroundColor: scheme === 'dark' ? 'rgba(177, 197, 255, 0.12)' : 'rgba(9, 76, 178, 0.08)' }]}>
          <Ionicons name="book" size={20} color={colors.primary} />
        </View>
        <Text style={[styles.statValue, { color: colors.text }]}>{totalSubjects}</Text>
        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Subjects</Text>
      </View>
      <View style={[styles.statDivider, { backgroundColor: dividerColor }]} />
      <View style={styles.statItem}>
        <View style={[styles.statIconCircle, { backgroundColor: scheme === 'dark' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)' }]}>
          <Ionicons name="trophy" size={20} color={scheme === 'dark' ? '#4ade80' : '#059669'} />
        </View>
        <Text style={[styles.statValue, { color: colors.text }]}>{Math.round(avgPercentage)}%</Text>
        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Average</Text>
      </View>
      <View style={[styles.statDivider, { backgroundColor: dividerColor }]} />
      <View style={styles.statItem}>
        <View style={[styles.statIconCircle, { backgroundColor: scheme === 'dark' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(99, 102, 241, 0.1)' }]}>
          <Ionicons name="clipboard" size={20} color={scheme === 'dark' ? '#818cf8' : '#4f46e5'} />
        </View>
        <Text style={[styles.statValue, { color: colors.text }]}>{totalAssessments}</Text>
        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Assessments</Text>
      </View>
    </View>
  );
}

function GradeBadge({ grade, colors }: { grade: string, colors: any }) {
  const gradeColors: Record<string, { bg: string, text: string }> = {
    'O': { bg: '#10b981', text: '#ffffff' }, // Outstanding - Green
    'A+': { bg: '#059669', text: '#ffffff' },
    'A': { bg: '#3b82f6', text: '#ffffff' }, // Excellent - Blue
    'B+': { bg: '#6366f1', text: '#ffffff' },
    'B': { bg: '#8b5cf6', text: '#ffffff' }, // Good - Purple
    'C': { bg: '#f59e0b', text: '#ffffff' }, // Average - Orange
    'P': { bg: '#10b981', text: '#ffffff' }, // Pass - Green
    'F': { bg: '#ef4444', text: '#ffffff' }, // Fail - Red
  };

  const color = gradeColors[grade] || { bg: colors.surfaceContainer, text: colors.text };

  return (
    <View style={[styles.gradeBadge, { backgroundColor: color.bg }]}>
      <Text style={[styles.gradeBadgeText, { color: color.text }]}>{grade}</Text>
    </View>
  );
}

function EmptyState({ colors }: { colors: any }) {
  return (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIconCircle, { backgroundColor: colors.surfaceContainer }]}>
        <Ionicons name="document-text-outline" size={48} color={colors.textSecondary} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>No Results Yet</Text>
      <Text style={[styles.emptyMessage, { color: colors.textSecondary }]}>
        Your academic records will appear here once they are published by your institution.
      </Text>
    </View>
  );
}

function FilterBar({ sortBy, onFilterChange, colors }: { sortBy: 'name' | 'percentage' | 'assessments', onFilterChange: (sort: 'name' | 'percentage' | 'assessments') => void, colors: any }) {
  const colorScheme = useColorScheme();
  const scheme = colorScheme === 'dark' ? 'dark' : 'light';
  const [containerWidth, setContainerWidth] = useState(0);

  const activeIndex = sortBy === 'name' ? 0 : sortBy === 'percentage' ? 1 : 2;
  const translationX = useSharedValue(0);

  const padding = 4;
  const gap = 4;
  const numSegments = 3;
  
  const segmentWidth = containerWidth > 0 
    ? (containerWidth - (padding * 2) - (gap * (numSegments - 1))) / numSegments 
    : 0;

  useEffect(() => {
    if (segmentWidth > 0) {
      translationX.value = withSpring(activeIndex * (segmentWidth + gap), {
        damping: 22,
        stiffness: 160,
      });
    }
  }, [activeIndex, segmentWidth, translationX]);

  const animatedPillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translationX.value }],
    width: segmentWidth,
  }));

  const onContainerLayout = useCallback((event: any) => {
    setContainerWidth(event.nativeEvent.layout.width);
  }, []);

  return (
    <View 
      style={[styles.filterBar, { backgroundColor: scheme === 'dark' ? colors.surfaceLow : colors.surfaceContainer }]}
      onLayout={onContainerLayout}
    >
      {containerWidth > 0 && segmentWidth > 0 && (
        <Animated.View 
          style={[
            styles.filterActivePill,
            {
              backgroundColor: scheme === 'dark' ? colors.surfaceContainer : colors.surfaceLowest,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.12,
              shadowRadius: 5,
              elevation: 3,
              left: padding,
              width: segmentWidth,
            },
            animatedPillStyle
          ]} 
        />
      )}
      {(['name', 'percentage', 'assessments'] as const).map((option) => {
        const isActive = sortBy === option;
        const label = option === 'name' ? 'Name' : option === 'percentage' ? 'Grade' : 'Tests';
        const icon = option === 'name' ? 'text-outline' : option === 'percentage' ? 'bar-chart-outline' : 'list-outline';
        
        return (
          <TouchableOpacity
            key={option}
            style={styles.filterSegment}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              onFilterChange(option);
            }}
            activeOpacity={0.8}
          >
            <Ionicons 
              name={icon as any} 
              size={13} 
              color={isActive ? colors.primary : colors.textSecondary} 
            />
            <Text 
              style={[
                styles.filterText, 
                { 
                  color: isActive ? colors.text : colors.textSecondary,
                  fontFamily: isActive ? Fonts.bodyBold : Fonts.bodyMedium
                }
              ]}
            >
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function AnimatedProgressBar({ percentage, color }: { percentage: number, color: string }) {
  const animatedStyle = useAnimatedStyle(() => ({
    width: withSpring(`${percentage}%`, {
      damping: 15,
      stiffness: 100,
    }),
  }));

  return (
    <View style={styles.progressBarWrapper}>
      <View style={[styles.progressBarBackground, { backgroundColor: 'rgba(0,0,0,0.05)' }]} />
      <Animated.View style={[styles.progressBarFill, { backgroundColor: color }, animatedStyle]} />
    </View>
  );
}

function PerformanceIcon({ percentage, size = 14 }: { percentage: number; size?: number }) {
  let icon = 'trending-down';
  let color = '#ef4444';
  
  if (percentage >= 75) {
    icon = 'trending-up';
    color = '#10b981';
  } else if (percentage >= 50) {
    icon = 'remove';
    color = '#f59e0b';
  }

  return <Ionicons name={icon as any} size={size} color={color} />;
}

function SkeletonCard({ colors }: { colors: any }) {
  return (
    <View style={[styles.subjectCard, { backgroundColor: colors.surfaceLowest, borderColor: colors.outlineVariant, marginBottom: Spacing.two, paddingLeft: 12 }]}>
      <View style={[styles.accentStrip, { backgroundColor: colors.surfaceContainer }]} />
      <View style={styles.cardHeader}>
        <View style={styles.cardLeft}>
          <View style={[styles.skeleton, styles.skeletonCircle, { backgroundColor: colors.surfaceContainer }]} />
          <View style={{ flex: 1, gap: 6 }}>
            <View style={[styles.skeleton, { width: '70%', height: 15, backgroundColor: colors.surfaceContainer }]} />
            <View style={[styles.skeleton, { width: '45%', height: 11, backgroundColor: colors.surfaceContainer }]} />
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
          <View style={[styles.skeleton, { width: 50, height: 24, borderRadius: 8, backgroundColor: colors.surfaceContainer }]} />
          <View style={[styles.skeleton, { width: 18, height: 18, borderRadius: 9, backgroundColor: colors.surfaceContainer }]} />
        </View>
      </View>
    </View>
  );
}

interface SubjectResultCardProps {
  subject: string;
  subjectName?: string;
  results: ResultEntry[];
  colors: any;
  index: number;
}

function SubjectResultCard({ subject, subjectName, results, colors, index }: SubjectResultCardProps) {
  const [expanded, setExpanded] = useState(false);
  const colorScheme = useColorScheme();
  const scheme = colorScheme === 'dark' ? 'dark' : 'light';

  // Compute overall percentage by excluding ungraded (null) assessments
  const totalObtained = results.reduce((sum, r) => sum + (r.marks !== null ? r.marks : 0), 0);
  const totalPossible = results.reduce((sum, r) => sum + (r.marks !== null ? r.total : 0), 0);
  const percentage = totalPossible > 0 ? Math.round((totalObtained / totalPossible) * 100) : 0;

  // Color based on performance
  let perfColor = '#10b981'; // Green
  let perfBg = 'rgba(16, 185, 129, 0.1)';
  if (percentage < 50) {
    perfColor = '#ef4444'; // Red
    perfBg = 'rgba(239, 68, 68, 0.1)';
  } else if (percentage < 75) {
    perfColor = '#f59e0b'; // Amber
    perfBg = 'rgba(245, 158, 11, 0.1)';
  }

  // Soft border tint glow matching performance
  const cardBorderColor = scheme === 'dark' 
    ? (percentage >= 75 ? 'rgba(16, 185, 129, 0.22)' : percentage >= 50 ? 'rgba(245, 158, 11, 0.22)' : 'rgba(239, 68, 68, 0.22)')
    : (percentage >= 75 ? 'rgba(16, 185, 129, 0.12)' : percentage >= 50 ? 'rgba(245, 158, 11, 0.12)' : 'rgba(239, 68, 68, 0.12)');

  const displayTitle = subjectName ? toSentenceCase(subjectName) : subject.toUpperCase();

  return (
    <Animated.View 
      entering={FadeInUp.delay(index * 50).duration(300)}
      style={[styles.subjectCard, { backgroundColor: colors.surfaceLowest, borderColor: cardBorderColor, paddingLeft: 12 }]}
    >
      <View style={[styles.accentStrip, { backgroundColor: perfColor }]} />
      <TouchableOpacity
        style={styles.cardHeader}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
          setExpanded(!expanded);
        }}
        activeOpacity={0.7}
        accessible={true}
        accessibilityLabel={`${displayTitle}, ${percentage}%, ${results.length} assessments`}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityHint="Double tap to expand and view assessment details"
      >
        <View style={styles.cardLeft}>
          <View style={[styles.iconCircle, { backgroundColor: scheme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(9, 76, 178, 0.06)' }]}>
            <Ionicons name="book-outline" size={20} color={colors.primary} />
          </View>
          <View style={styles.cardHeaderText}>
            <Text style={[styles.subjectTitle, { color: colors.text }]} numberOfLines={1}>
              {displayTitle}
            </Text>
            <Text style={[styles.subjectSubtitle, { color: colors.textSecondary }]}>
              {subject} • {results.length} test{results.length > 1 ? 's' : ''}
            </Text>
          </View>
        </View>
        <View style={styles.cardRight}>
          <View style={[styles.perfBadge, { backgroundColor: perfBg }]}>
            <PerformanceIcon percentage={percentage} size={13} />
            <Text style={[styles.perfBadgeText, { color: perfColor }]}>{percentage}%</Text>
          </View>
          <Ionicons 
            name={expanded ? "chevron-up" : "chevron-down"} 
            size={18} 
            color={colors.textSecondary} 
          />
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.cardContent}>
          <View style={[styles.divider, { backgroundColor: colors.outlineVariant }]} />
          {results.map((res, idx) => {
            const isGraded = res.marks !== null && res.marks !== undefined;
            const ratio = (isGraded && res.total > 0) ? (res.marks as number) / res.total : 0;
            const pct = Math.round(ratio * 100);
            
            // Color based on performance
            let progressBarColor = colors.primary;
            if (pct < 50) {
              progressBarColor = colors.error;
            } else if (pct < 75) {
              progressBarColor = '#d97706'; // warning orange
            }

            return (
              <View key={idx} style={styles.resultItemContainer}>
                <View style={styles.resultRow}>
                  <View style={styles.resultInfo}>
                    <Text style={[styles.examName, { color: colors.text }]}>{toSentenceCase(res.name)}</Text>
                    {res.grade ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 6 }}>
                        <Text style={[styles.gradeText, { color: colors.textSecondary }]}>Grade:</Text>
                        <GradeBadge grade={res.grade} colors={colors} />
                      </View>
                    ) : null}
                  </View>
                  <View style={[styles.marksBadge, { backgroundColor: scheme === 'dark' ? colors.surfaceLow : 'rgba(0, 0, 0, 0.03)' }]}>
                    <Text style={[styles.marksBadgeText, { color: colors.text }]}>
                      {isGraded ? `${res.marks} / ${res.total}` : `- / ${res.total}`}
                    </Text>
                  </View>
                </View>
                {isGraded && res.total > 0 && (
                  <AnimatedProgressBar percentage={Math.min(100, Math.max(0, pct))} color={progressBarColor} />
                )}
              </View>
            );
          })}
        </View>
      )}
    </Animated.View>
  );
}

export default function ResultScreen() {
  const colorScheme = useColorScheme();
  const scheme = colorScheme === 'dark' ? 'dark' : 'light';
  const colors = Colors[scheme];

  const { isLoggedIn, handleSessionExpired } = useLogin();
  const [subjectResults, setSubjectResults] = useState<SubjectResult[]>(dataCache.results || []);
  const [isLoading, setIsLoading] = useState(!dataCache.results);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'percentage' | 'assessments'>('name');

  const loadData = useCallback(async (showRefreshingSpinner = false) => {
    if (!isLoggedIn) return;
    const hasCache = dataCache.results && dataCache.results.length > 0;
    const isStale = dataCache.isStale('results');

    // Skip network request if we have fresh cached data and aren't forcing a refresh
    if (hasCache && !isStale && !showRefreshingSpinner) {
      return;
    }

    if (showRefreshingSpinner) {
      setIsRefreshing(true);
    } else if (!hasCache) {
      setIsLoading(true);
    }
    setErrorMsg('');

    try {
      const res = await fetchResults();
      if (res.sessionExpired) {
        handleSessionExpired();
        return;
      }
      if (!res.ok) {
        throw new Error('Failed to retrieve academic records from ETLAB.');
      }
      const data = parseResults(res.html);
      setSubjectResults(data);
      await dataCache.setResults(data);

      if (showRefreshingSpinner) {
        Toast.show({
          type: 'success',
          text1: 'Updated',
          text2: 'Your results are up to date',
          position: 'top',
          visibilityTime: 2000,
        });
      }
    } catch (err: any) {
      if (!hasCache) {
        setErrorMsg(err.message || 'An error occurred while loading results.');
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

  const sortedResults = useMemo(() => {
    return [...subjectResults].sort((a, b) => {
      if (sortBy === 'name') {
        const nameA = a.subjectName || a.subject;
        const nameB = b.subjectName || b.subject;
        return nameA.localeCompare(nameB);
      } else if (sortBy === 'percentage') {
        // Sort by percentage descending
        const totalObtainedA = a.results.reduce((sum, r) => sum + (r.marks !== null ? r.marks : 0), 0);
        const totalPossibleA = a.results.reduce((sum, r) => sum + (r.marks !== null ? r.total : 0), 0);
        const pctA = totalPossibleA > 0 ? (totalObtainedA / totalPossibleA) : 0;

        const totalObtainedB = b.results.reduce((sum, r) => sum + (r.marks !== null ? r.marks : 0), 0);
        const totalPossibleB = b.results.reduce((sum, r) => sum + (r.marks !== null ? r.total : 0), 0);
        const pctB = totalPossibleB > 0 ? (totalObtainedB / totalPossibleB) : 0;

        return pctB - pctA;
      } else {
        // Sort by assessments count descending
        return b.results.length - a.results.length;
      }
    });
  }, [subjectResults, sortBy]);

  return (
    <ProtectedScreen>
      <SafeAreaView edges={['top', 'left', 'right']} style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header bar */}
        <View style={[styles.topBar, { borderBottomColor: colors.surfaceContainer, paddingVertical: Spacing.two }]}>
          <Text style={[styles.topBarTitle, { color: colors.text }]}>Results</Text>
          <ProfileButton />
        </View>

        {isLoading ? (
          <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
            {/* Page heading skeleton */}
            <View style={styles.pageHeader}>
              <View style={[styles.skeleton, { width: '50%', height: 24, backgroundColor: colors.surfaceContainer }]} />
              <View style={[styles.skeleton, { width: '90%', height: 14, backgroundColor: colors.surfaceContainer, marginTop: 4 }]} />
              <View style={[styles.skeleton, { width: '70%', height: 14, backgroundColor: colors.surfaceContainer }]} />
            </View>
            
            {/* StatisticsCard skeleton */}
            <View style={[styles.statsCard, { backgroundColor: colors.surfaceContainer, opacity: 0.6, borderColor: colors.ghostBorder || 'rgba(0,0,0,0.05)', borderWidth: 1 }]}>
              <View style={styles.statItem}>
                <View style={[styles.skeleton, { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.surfaceLow }]} />
                <View style={[styles.skeleton, { width: 32, height: 20, backgroundColor: colors.surfaceLow }]} />
                <View style={[styles.skeleton, { width: 50, height: 12, backgroundColor: colors.surfaceLow }]} />
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.surfaceLow }]} />
              <View style={styles.statItem}>
                <View style={[styles.skeleton, { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.surfaceLow }]} />
                <View style={[styles.skeleton, { width: 32, height: 20, backgroundColor: colors.surfaceLow }]} />
                <View style={[styles.skeleton, { width: 50, height: 12, backgroundColor: colors.surfaceLow }]} />
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.surfaceLow }]} />
              <View style={styles.statItem}>
                <View style={[styles.skeleton, { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.surfaceLow }]} />
                <View style={[styles.skeleton, { width: 32, height: 20, backgroundColor: colors.surfaceLow }]} />
                <View style={[styles.skeleton, { width: 50, height: 12, backgroundColor: colors.surfaceLow }]} />
              </View>
            </View>

            {/* FilterBar skeleton */}
            <View style={[styles.filterBar, { backgroundColor: colors.surfaceContainer, opacity: 0.6 }]}>
              <View style={[styles.skeleton, { flex: 1, height: 28, borderRadius: 8, backgroundColor: colors.surfaceLow }]} />
              <View style={[styles.skeleton, { flex: 1, height: 28, borderRadius: 8, backgroundColor: colors.surfaceLow }]} />
              <View style={[styles.skeleton, { flex: 1, height: 28, borderRadius: 8, backgroundColor: colors.surfaceLow }]} />
            </View>

            {/* Multiple card skeletons */}
            {[1, 2, 3, 4].map((i) => (
              <SkeletonCard key={i} colors={colors} />
            ))}
          </ScrollView>
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
            refreshControl={
              <RefreshControl refreshing={isRefreshing} onRefresh={() => loadData(true)} tintColor={colors.primary} />
            }
          >
            {/* Page heading */}
            <View style={styles.pageHeader}>
              <Text style={[styles.pageTitle, { color: colors.text }]}>Academic Records</Text>
              <Text style={[styles.pageSubtitle, { color: colors.textSecondary }]}>
                A comprehensive ledger of your scholarly assessments and evaluations.
              </Text>
            </View>

            {subjectResults.length > 0 && (
              <>
                {/* Statistics Card */}
                <StatisticsCard subjects={subjectResults} colors={colors} />

                {/* Filter/Sort bar */}
                <FilterBar sortBy={sortBy} onFilterChange={setSortBy} colors={colors} />
              </>
            )}

            {/* Subject Results list */}
            {sortedResults.length === 0 ? (
              <EmptyState colors={colors} />
            ) : (
              sortedResults.map((item, idx) => (
                <SubjectResultCard key={item.subject} subject={item.subject} subjectName={item.subjectName} results={item.results} colors={colors} index={idx} />
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

  /* ── Header Bar ── */
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
  },
  topBarTitle: {
    fontFamily: Fonts.bodyBold,
    fontSize: 18,
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

  /* ── Scroll Container ── */
  scrollContainer: {
    padding: Spacing.four,
    paddingBottom: 96,
    gap: Spacing.three,
    maxWidth: 768,
    alignSelf: 'center',
    width: '100%',
  },

  /* ── Page Heading ── */
  pageHeader: {
    gap: Spacing.one,
    marginBottom: Spacing.one,
  },
  pageTitle: {
    fontFamily: Fonts.headlineBold,
    fontSize: 30,
    lineHeight: 38,
  },
  pageSubtitle: {
    fontFamily: Fonts.body,
    fontSize: 13,
    lineHeight: 20,
    opacity: 0.8,
  },

  /* ── Subject Result Card ── */
  subjectCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    position: 'relative',
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
  cardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
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
  percentageText: {
    fontFamily: Fonts.headlineBold,
    fontSize: 16,
  },
  chevronText: {
    fontSize: 18,
    fontFamily: Fonts.body,
  },
  cardContent: {
    paddingBottom: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  divider: {
    height: 1,
    marginBottom: Spacing.two,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  resultInfo: {
    flex: 1,
    marginRight: Spacing.four,
    gap: 2,
  },
  examName: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 14,
  },
  gradeText: {
    fontFamily: Fonts.body,
    fontSize: 11,
  },
  marksText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 14,
  },
  marksBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Roundness.full,
    minWidth: 60,
    alignItems: 'center',
  },
  marksBadgeText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 11,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: Roundness.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconEmoji: {
    fontSize: 20,
  },

  /* ── States ── */
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
  infoText: {
    fontFamily: Fonts.body,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  resultItemContainer: {
    paddingVertical: 6,
  },
  progressBarWrapper: {
    height: 2,
    width: '100%',
    position: 'relative',
    marginTop: 6,
    marginBottom: 4,
  },
  progressBarBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    borderRadius: 1,
  },
  progressBarFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 1,
  },

  // StatisticsCard styles
  statsCard: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.four,
    borderRadius: 16,
    justifyContent: 'space-around',
    marginBottom: Spacing.two,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
    gap: 6,
  },
  statIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  statTexts: {
    alignItems: 'center',
  },
  statValue: {
    fontFamily: Fonts.bodyBold,
    fontSize: 20,
    lineHeight: 24,
  },
  statLabel: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 12,
    opacity: 0.8,
  },
  statDivider: {
    width: 1,
    height: 48,
    alignSelf: 'center',
  },

  // GradeBadge styles
  gradeBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
    borderRadius: Roundness.sm,
    minWidth: 32,
    alignItems: 'center',
  },
  gradeBadgeText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 0.5,
  },

  // EmptyState styles
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.six,
    gap: Spacing.three,
    borderRadius: 16,
  },
  emptyIconCircle: {
    width: 96,
    height: 96,
    borderRadius: Roundness.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  emptyTitle: {
    fontFamily: Fonts.headlineBold,
    fontSize: 20,
  },
  emptyMessage: {
    fontFamily: Fonts.body,
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: Spacing.six,
    lineHeight: 22,
  },

  // FilterBar styles
  filterBar: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    marginBottom: Spacing.three,
    gap: 4,
    position: 'relative',
  },
  filterActivePill: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    borderRadius: 8,
  },
  filterSegment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
    zIndex: 1,
  },
  filterText: {
    fontSize: 12,
  },

  // PerformanceIcon styles
  performanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },

  // Skeleton styles
  skeleton: {
    borderRadius: Roundness.sm,
    opacity: 0.5,
  },
  skeletonCircle: {
    width: 44,
    height: 44,
    borderRadius: Roundness.full,
  },
});
