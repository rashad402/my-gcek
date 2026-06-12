import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Fonts, Spacing, Roundness } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { ProtectedScreen } from '@/components/protected-screen';
import { ProfileButton } from '@/components/profile-button';
import { useLogin } from '@/components/login-context';
import { fetchAssignments } from '@/services/etlab-api';
import { parseAssignments, Assignment } from '@/services/etlab-parser';
import { dataCache } from '@/services/data-cache';

interface AssignmentCardProps {
  assignment: Assignment;
  colors: any;
}

function AssignmentCard({ assignment, colors }: AssignmentCardProps) {
  const { title, subject, dueDate, status } = assignment;

  // Determine badge colors based on status
  let badgeBg = 'rgba(90, 95, 99, 0.08)';
  let badgeText = colors.secondary;
  let label = 'Unknown';

  if (status === 'submitted') {
    badgeBg = 'rgba(40, 167, 69, 0.08)';
    badgeText = '#28a745';
    label = 'Submitted';
  } else if (status === 'pending') {
    badgeBg = 'rgba(9, 76, 178, 0.08)';
    badgeText = colors.primary;
    label = 'Pending';
  } else if (status === 'overdue') {
    badgeBg = 'rgba(186, 26, 26, 0.08)';
    badgeText = colors.error;
    label = 'Overdue';
  }

  return (
    <View style={[styles.assignCard, { backgroundColor: colors.surfaceLowest, borderColor: colors.outlineVariant }]}>
      <View style={styles.assignHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.one, flex: 1 }}>
          <Ionicons name="document-text-outline" size={16} color={colors.primary} />
          <Text style={[styles.assignTitle, { color: colors.text }]}>{title}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: badgeBg }]}>
          <Text style={[styles.statusText, { color: badgeText }]}>{label}</Text>
        </View>
      </View>
      {subject ? <Text style={[styles.assignSubject, { color: colors.textSecondary }]}>Course: {subject}</Text> : null}
      <Text style={[styles.assignMeta, { color: colors.textSecondary }]}>Due: {dueDate}</Text>
    </View>
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

  return (
    <ProtectedScreen>
      <SafeAreaView edges={['top', 'left', 'right']} style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.topBar, { borderBottomColor: colors.surfaceContainer }]}>
          <View>
            <Text style={[styles.topBarSub, { color: colors.textSecondary }]}>COURSEWORK</Text>
            <Text style={[styles.topBarTitle, { color: colors.text }]}>Assignments</Text>
          </View>
          <ProfileButton />
        </View>

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
            refreshControl={
              <RefreshControl refreshing={isRefreshing} onRefresh={() => loadData(true)} tintColor={colors.primary} />
            }
          >
            {assignments.length === 0 ? (
              <View style={[styles.placeholderCard, { backgroundColor: colors.surfaceContainer }]}>
                <Ionicons name="document-text-outline" size={40} color={colors.textSecondary} style={{ marginBottom: Spacing.one }} />
                <Text style={[styles.placeholderTitle, { color: colors.text }]}>
                  No Assignments Found
                </Text>
                <Text style={[styles.placeholderDesc, { color: colors.textSecondary }]}>
                  You have no pending or completed assignments recorded on ETLAB.
                </Text>
              </View>
            ) : (
              assignments.map((item, idx) => (
                <AssignmentCard key={idx} assignment={item} colors={colors} />
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
  scrollContainer: {
    padding: Spacing.four,
    gap: Spacing.four,
  },
  placeholderCard: {
    padding: Spacing.five,
    borderRadius: Roundness.md,
    alignItems: 'center',
    gap: Spacing.two,
  },
  placeholderEmoji: {
    fontSize: 40,
  },
  placeholderTitle: {
    fontFamily: Fonts.headlineBold,
    fontSize: 18,
    textAlign: 'center',
  },
  placeholderDesc: {
    fontFamily: Fonts.body,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
  assignCard: {
    padding: Spacing.three,
    borderRadius: Roundness.default,
    borderWidth: 1,
    gap: Spacing.one,
  },
  assignHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  assignTitle: {
    fontFamily: Fonts.headlineBold,
    fontSize: 15,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
    borderRadius: Roundness.sm,
  },
  statusText: {
    fontFamily: Fonts.label,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  assignMeta: {
    fontFamily: Fonts.body,
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 4,
  },
  assignSubject: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 13,
    marginTop: 2,
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
