import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { ProtectedScreen } from '@/components/protected-screen';
import { ProfileButton } from '@/components/profile-button';
import { Colors, Fonts, Spacing, Roundness } from '@/constants/theme';
import { useColorScheme } from 'react-native';

const SERIES_ITEMS = [
  { label: 'Assessment', title: 'Series 1' },
  { label: 'Assessment', title: 'Series 2' },
  { label: 'Assessment', title: 'Series 3' },
  { label: 'Assessment', title: 'Series 4' },
];

interface CategoryCardProps {
  emoji: string;
  title: string;
  iconBg: string;
  colors: any;
}

function CategoryCard({ emoji, title, iconBg, colors }: CategoryCardProps) {
  return (
    <TouchableOpacity
      style={[styles.categoryCard, { backgroundColor: colors.surfaceLowest, borderColor: colors.outlineVariant }]}
      activeOpacity={0.7}
    >
      <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
        <Text style={styles.iconEmoji}>{emoji}</Text>
      </View>
      <Text style={[styles.categoryTitle, { color: colors.text }]}>{title}</Text>
    </TouchableOpacity>
  );
}

export default function ResultScreen() {
  const colorScheme = useColorScheme();
  const scheme = colorScheme === 'dark' ? 'dark' : 'light';
  const colors = Colors[scheme];
  const [seriesExpanded, setSeriesExpanded] = useState(false);
  const animHeight = useRef(new Animated.Value(0)).current;
  const animRotation = useRef(new Animated.Value(0)).current;

  const toggleSeries = () => {
    const toValue = seriesExpanded ? 0 : 1;
    Animated.parallel([
      Animated.timing(animHeight, {
        toValue,
        duration: 280,
        useNativeDriver: false,
      }),
      Animated.timing(animRotation, {
        toValue,
        duration: 280,
        useNativeDriver: true,
      }),
    ]).start();
    setSeriesExpanded(!seriesExpanded);
  };

  const maxHeight = animHeight.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 280],
  });

  const chevronRotation = animRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

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

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Page heading */}
        <View style={styles.pageHeader}>
          <Text style={[styles.pageTitle, { color: colors.text }]}>Academic Records</Text>
          <Text style={[styles.pageSubtitle, { color: colors.textSecondary }]}>
            A comprehensive ledger of your scholarly assessments and evaluations.
          </Text>
        </View>

        {/* ── Series Card (Expandable) ── */}
        <View
          style={[
            styles.seriesCard,
            {
              backgroundColor: colors.surfaceLowest,
              borderColor: colors.outlineVariant,
            },
          ]}
        >
          <TouchableOpacity
            style={styles.seriesHeader}
            onPress={toggleSeries}
            activeOpacity={0.7}
          >
            <View style={styles.seriesLeft}>
              <View style={[styles.iconCircle, { backgroundColor: 'rgba(9, 76, 178, 0.08)' }]}>
                <Text style={styles.iconEmoji}>📚</Text>
              </View>
              <Text style={[styles.categoryTitle, { color: colors.text }]}>Series</Text>
            </View>
            <Animated.View style={{ transform: [{ rotate: chevronRotation }] }}>
              <Text style={[styles.chevronText, { color: colors.textSecondary }]}>▾</Text>
            </Animated.View>
          </TouchableOpacity>

          {/* Animated expandable grid */}
          <Animated.View style={[styles.seriesContentWrapper, { maxHeight }]}>
            <View style={[styles.seriesDivider, { backgroundColor: colors.surfaceContainer }]} />
            <View style={styles.seriesGrid}>
              {SERIES_ITEMS.map((item, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[styles.seriesGridItem, { backgroundColor: colors.surfaceLow }]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.seriesItemLabel, { color: colors.textSecondary }]}>
                    {item.label.toUpperCase()}
                  </Text>
                  <Text style={[styles.seriesItemTitle, { color: colors.text }]}>{item.title}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>
        </View>

        {/* ── Other Category Cards ── */}
        <CategoryCard
          emoji="✅"
          title="Internal"
          iconBg={colors.surfaceHigh}
          colors={colors}
        />

        <CategoryCard
          emoji="📋"
          title="Assignment"
          iconBg="rgba(109, 94, 0, 0.08)"
          colors={colors}
        />

        <CategoryCard
          emoji="📖"
          title="Tutorials"
          iconBg="rgba(9, 76, 178, 0.08)"
          colors={colors}
        />

        <CategoryCard
          emoji="🏛️"
          title="University"
          iconBg={colors.surfaceContainer}
          colors={colors}
        />
      </ScrollView>
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

  /* ── Series Card ── */
  seriesCard: {
    borderRadius: Roundness.md,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  seriesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.three,
  },
  seriesLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  chevronText: {
    fontSize: 22,
    lineHeight: 26,
    fontFamily: Fonts.body,
  },
  seriesContentWrapper: {
    overflow: 'hidden',
  },
  seriesDivider: {
    height: 1,
    marginHorizontal: Spacing.three,
  },
  seriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: Spacing.three,
    gap: Spacing.two,
  },
  seriesGridItem: {
    flex: 1,
    minWidth: '45%',
    padding: Spacing.three,
    borderRadius: Roundness.default,
    gap: 4,
  },
  seriesItemLabel: {
    fontFamily: Fonts.label,
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  seriesItemTitle: {
    fontFamily: Fonts.headline,
    fontSize: 17,
    marginTop: 2,
  },

  /* ── Category Card ── */
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Roundness.md,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: Roundness.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconEmoji: {
    fontSize: 22,
  },
  categoryTitle: {
    fontFamily: Fonts.headlineBold,
    fontSize: 18,
  },
});
