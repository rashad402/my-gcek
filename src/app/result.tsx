import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ProtectedScreen } from '@/components/protected-screen';
import { ProfileButton } from '@/components/profile-button';
import { Colors, Fonts, Spacing, Roundness } from '@/constants/theme';
import { useColorScheme } from 'react-native';
import { useLogin } from '@/components/login-context';
import { fetchResults } from '@/services/etlab-api';
import { parseResults, SubjectResult, ResultEntry } from '@/services/etlab-parser';

interface SubjectResultCardProps {
  subject: string;
  results: ResultEntry[];
  colors: any;
}

function SubjectResultCard({ subject, results, colors }: SubjectResultCardProps) {
  const [expanded, setExpanded] = useState(false);

  // Compute overall percentage
  const totalObtained = results.reduce((sum, r) => sum + r.marks, 0);
  const totalPossible = results.reduce((sum, r) => sum + r.total, 0);
  const percentage = totalPossible > 0 ? Math.round((totalObtained / totalPossible) * 100) : 0;

  return (
    <View style={[styles.subjectCard, { backgroundColor: colors.surfaceLowest, borderColor: colors.outlineVariant }]}>
      <TouchableOpacity
        style={styles.cardHeader}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <View style={styles.cardLeft}>
          <View style={[styles.iconCircle, { backgroundColor: 'rgba(9, 76, 178, 0.08)' }]}>
            <Text style={styles.iconEmoji}>📚</Text>
          </View>
          <View style={styles.cardHeaderText}>
            <Text style={[styles.subjectTitle, { color: colors.text }]} numberOfLines={1} ellipsizeMode="tail">
              {subject}
            </Text>
            <Text style={[styles.subjectSubtitle, { color: colors.textSecondary }]}>
              {results.length} assessment{results.length > 1 ? 's' : ''}
            </Text>
          </View>
        </View>
        <View style={styles.cardRight}>
          <Text style={[styles.percentageText, { color: colors.primary }]}>{percentage}%</Text>
          <Text style={[styles.chevronText, { color: colors.textSecondary }]}>{expanded ? '▲' : '▼'}</Text>
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.cardContent}>
          <View style={[styles.divider, { backgroundColor: colors.outlineVariant }]} />
          {results.map((res, idx) => (
            <View key={idx} style={styles.resultRow}>
              <View style={styles.resultInfo}>
                <Text style={[styles.examName, { color: colors.text }]}>{res.name}</Text>
                {res.grade ? (
                  <Text style={[styles.gradeText, { color: colors.textSecondary }]}>Grade: {res.grade}</Text>
                ) : null}
              </View>
              <Text style={[styles.marksText, { color: colors.text }]}>
                {res.marks} <Text style={{ color: colors.textSecondary, fontSize: 12 }}>/ {res.total}</Text>
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export default function ResultScreen() {
  const colorScheme = useColorScheme();
  const scheme = colorScheme === 'dark' ? 'dark' : 'light';
  const colors = Colors[scheme];

  const { handleSessionExpired } = useLogin();
  const [subjectResults, setSubjectResults] = useState<SubjectResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const loadData = useCallback(async (showRefreshingSpinner = false) => {
    if (showRefreshingSpinner) {
      setIsRefreshing(true);
    } else {
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
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred while loading results.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [handleSessionExpired]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <ProtectedScreen>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header bar */}
        <View style={[styles.topBar, { borderBottomColor: colors.surfaceContainer }]}>
          <View>
            <Text style={[styles.topBarSub, { color: colors.textSecondary }]}>ACADEMIC RECORDS</Text>
            <Text style={[styles.topBarTitle, { color: colors.text }]}>Results</Text>
          </View>
          <ProfileButton />
        </View>

        {isLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading records...</Text>
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

            {/* Subject Results list */}
            {subjectResults.length === 0 ? (
              <View style={[styles.subjectCard, { backgroundColor: colors.surfaceLowest, borderColor: colors.outlineVariant, alignItems: 'center', paddingVertical: Spacing.six }]}>
                <Text style={[styles.infoText, { color: colors.textSecondary }]}>No exam or internal results found.</Text>
              </View>
            ) : (
              subjectResults.map((item, idx) => (
                <SubjectResultCard key={idx} subject={item.subject} results={item.results} colors={colors} />
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
  topBarSub: {
    fontFamily: Fonts.label,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  topBarTitle: {
    fontFamily: Fonts.headlineBold,
    fontSize: 22,
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

  /* ── Scroll Container ── */
  scrollContainer: {
    padding: Spacing.four,
    gap: Spacing.three,
  },

  /* ── Page Heading ── */
  pageHeader: {
    gap: Spacing.one,
    marginBottom: Spacing.one,
  },
  pageTitle: {
    fontFamily: Fonts.headline,
    fontSize: 30,
    lineHeight: 38,
  },
  pageSubtitle: {
    fontFamily: Fonts.body,
    fontSize: 14,
    lineHeight: 22,
  },

  /* ── Subject Result Card ── */
  subjectCard: {
    borderRadius: Roundness.md,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.three,
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
    fontFamily: Fonts.headlineBold,
    fontSize: 16,
  },
  subjectSubtitle: {
    fontFamily: Fonts.body,
    fontSize: 12,
  },
  cardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
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
    paddingBottom: Spacing.three,
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
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(195, 198, 213, 0.05)',
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
});
