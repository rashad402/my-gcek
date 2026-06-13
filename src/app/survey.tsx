import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Alert,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Fonts, Spacing, Roundness } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { ProtectedScreen } from '@/components/protected-screen';
import { ProfileButton } from '@/components/profile-button';
import { useLogin } from '@/components/login-context';
import { fetchSurveys } from '@/services/etlab-api';
import { parseSurveys, Survey } from '@/services/etlab-parser';
import { dataCache } from '@/services/data-cache';

interface SurveyCardProps {
  survey: Survey;
  colors: any;
}

function SurveyCard({ survey, colors }: SurveyCardProps) {
  const { title, description, deadline, status, url } = survey;

  // Determine badge colors based on status
  let badgeBg = 'rgba(90, 95, 99, 0.08)';
  let badgeText = colors.secondary;
  let label = 'Unknown';

  if (status === 'completed') {
    badgeBg = 'rgba(40, 167, 69, 0.08)';
    badgeText = '#28a745';
    label = 'Completed';
  } else if (status === 'pending') {
    badgeBg = 'rgba(217, 119, 6, 0.08)';
    badgeText = '#d97706'; // orange
    label = 'Pending';
  } else if (status === 'new') {
    badgeBg = 'rgba(9, 76, 178, 0.08)';
    badgeText = colors.primary;
    label = 'New';
  }

  const handlePress = () => {
    if (url) {
      Linking.openURL(url).catch(() => {
        Alert.alert('Error', 'Unable to open survey link.');
      });
    }
  };

  return (
    <TouchableOpacity
      style={[styles.surveyCard, { backgroundColor: colors.surfaceLowest, borderColor: colors.outlineVariant }]}
      onPress={url ? handlePress : undefined}
      activeOpacity={url ? 0.7 : 1}
      disabled={!url}
    >
      <View style={styles.surveyHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.one, flex: 1 }}>
          <Ionicons name="checkbox-outline" size={16} color={colors.primary} />
          <Text style={[styles.surveyTitle, { color: colors.text }]}>{title}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: badgeBg }]}>
          <Text style={[styles.statusText, { color: badgeText }]}>{label}</Text>
        </View>
      </View>
      {description ? <Text style={[styles.surveyDesc, { color: colors.textSecondary }]}>{description}</Text> : null}
      {deadline ? <Text style={[styles.surveyMeta, { color: colors.textSecondary }]}>Deadline: {deadline}</Text> : null}
      {url ? <Text style={[styles.linkHint, { color: colors.primary }]}>Tap to open survey ↗</Text> : null}
    </TouchableOpacity>
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

  return (
    <ProtectedScreen>
      <SafeAreaView edges={['top', 'left', 'right']} style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.topBar, { borderBottomColor: colors.surfaceContainer }]}>
          <View>
            <Text style={[styles.topBarSub, { color: colors.textSecondary }]}>FEEDBACK</Text>
            <Text style={[styles.topBarTitle, { color: colors.text }]}>Surveys</Text>
          </View>
          <ProfileButton />
        </View>

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
            refreshControl={
              <RefreshControl refreshing={isRefreshing} onRefresh={() => loadData(true)} tintColor={colors.primary} />
            }
          >
            {surveys.length === 0 ? (
              <View style={[styles.placeholderCard, { backgroundColor: colors.surfaceContainer }]}>
                <Ionicons name="checkbox-outline" size={40} color={colors.textSecondary} style={{ marginBottom: Spacing.one }} />
                <Text style={[styles.placeholderTitle, { color: colors.text }]}>
                  No Surveys Found
                </Text>
                <Text style={[styles.placeholderDesc, { color: colors.textSecondary }]}>
                  Faculty and course surveys will appear here when they become available for your semester.
                </Text>
              </View>
            ) : (
              surveys.map((item, idx) => (
                <SurveyCard key={idx} survey={item} colors={colors} />
              ))
            )}

            {/* Info card */}
            <View style={[styles.infoCard, { backgroundColor: colors.surfaceContainer, flexDirection: 'row', gap: Spacing.two, alignItems: 'flex-start' }]}>
              <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} style={{ marginTop: 1 }} />
              <Text style={[styles.infoText, { color: colors.textSecondary, flex: 1, textAlign: 'left' }]}>
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
    paddingBottom: 96,
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
  infoCard: {
    padding: Spacing.three,
    borderRadius: Roundness.default,
  },
  infoText: {
    fontFamily: Fonts.body,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  surveyCard: {
    padding: Spacing.three,
    borderRadius: Roundness.default,
    borderWidth: 1,
    gap: Spacing.one,
  },
  surveyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  surveyTitle: {
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
  surveyDesc: {
    fontFamily: Fonts.body,
    fontSize: 13,
    marginTop: 2,
  },
  surveyMeta: {
    fontFamily: Fonts.body,
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 4,
  },
  linkHint: {
    fontFamily: Fonts.bodyBold,
    fontSize: 12,
    marginTop: Spacing.one,
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
