import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Colors, Fonts, Spacing, Roundness } from '@/constants/theme';
import { useColorScheme } from 'react-native';

interface ColorBadgeProps {
  name: string;
  hex: string;
  colors: any;
}

function ColorBadge({ name, hex, colors }: ColorBadgeProps) {
  return (
    <View style={styles.colorBadgeContainer}>
      <View style={[styles.colorBlock, { backgroundColor: hex, borderColor: colors.outlineVariant }]} />
      <View style={styles.colorBadgeInfo}>
        <Text style={[styles.colorBadgeName, { color: colors.text }]}>{name}</Text>
        <Text style={[styles.colorBadgeHex, { color: colors.textSecondary }]}>{hex.toUpperCase()}</Text>
      </View>
    </View>
  );
}

export default function DesignSystemScreen() {
  const colorScheme = useColorScheme();
  const scheme = colorScheme === 'dark' ? 'dark' : 'light';
  const colors = Colors[scheme];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { borderBottomColor: colors.surfaceContainer }]}>
        <Text style={[styles.topBarSub, { color: colors.textSecondary }]}>ALEXANDRIA Presets</Text>
        <Text style={[styles.topBarTitle, { color: colors.text }]}>Design System</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Editorial Heading */}
        <View style={styles.section}>
          <Text style={[styles.editorialTitle, { color: colors.text }]}>The Digital Curator</Text>
          <Text style={[styles.editorialDesc, { color: colors.textSecondary }]}>
            A scholarly, premium reading experience. Dense information made effortless through serif authority, soft tactile tones, and generous whitespace.
          </Text>
        </View>

        {/* 1. Color Palette Spec */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>1. Color Tokens</Text>
          <View style={styles.divider} />
          <View style={styles.colorGrid}>
            <ColorBadge name="Primary Blue" hex={colors.primary} colors={colors} />
            <ColorBadge name="Parchment Background" hex={colors.background} colors={colors} />
            <ColorBadge name="Text Charcoal" hex={colors.text} colors={colors} />
            <ColorBadge name="Muted Secondary" hex={colors.secondary} colors={colors} />
            <ColorBadge name="Archival Gold" hex={colors.tertiary} colors={colors} />
            <ColorBadge name="Surface Low" hex={colors.surfaceLow} colors={colors} />
            <ColorBadge name="Surface High" hex={colors.surfaceHigh} colors={colors} />
            <ColorBadge name="Outline Border" hex={colors.outline} colors={colors} />
          </View>
        </View>

        {/* 2. Typography Specimens */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>2. Typography Hierarchy</Text>
          <View style={styles.divider} />
          
          <View style={styles.specimenRow}>
            <Text style={[styles.specimenLabel, { color: colors.textSecondary }]}>Headline</Text>
            <Text style={[styles.specimenHeading, { color: colors.text }]}>Welcome to GCEK</Text>
            <Text style={[styles.specimenDesc, { color: colors.textSecondary }]}>Noto Serif — generous leading</Text>
          </View>

          <View style={styles.specimenRow}>
            <Text style={[styles.specimenLabel, { color: colors.textSecondary }]}>Body Copy</Text>
            <Text style={[styles.specimenBody, { color: colors.text }]}>
              Attendance is updated every day at 5:00 PM. A minimum threshold is required.
            </Text>
            <Text style={[styles.specimenDesc, { color: colors.textSecondary }]}>Inter — modern clarity</Text>
          </View>

          <View style={styles.specimenRow}>
            <Text style={[styles.specimenLabel, { color: colors.textSecondary }]}>UI Labels</Text>
            <Text style={[styles.specimenUiLabel, { color: colors.text }]}>UNIVERSITY ID</Text>
            <Text style={[styles.specimenDesc, { color: colors.textSecondary }]}>Public Sans — uppercase metadata</Text>
          </View>
        </View>

        {/* 3. Corner Roundness Rules */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>3. Corner Roundness Specs</Text>
          <View style={styles.divider} />
          <View style={styles.roundnessRow}>
            <View style={[styles.roundnessSpecimen, { borderRadius: Roundness.sm, backgroundColor: colors.surfaceContainer }]}>
              <Text style={[styles.roundnessText, { color: colors.text }]}>Small (4px)</Text>
            </View>
            <View style={[styles.roundnessSpecimen, { borderRadius: Roundness.default, backgroundColor: colors.surfaceContainer }]}>
              <Text style={[styles.roundnessText, { color: colors.text }]}>Default (8px)</Text>
            </View>
            <View style={[styles.roundnessSpecimen, { borderRadius: Roundness.md, backgroundColor: colors.surfaceContainer }]}>
              <Text style={[styles.roundnessText, { color: colors.text }]}>Medium (12px)</Text>
            </View>
          </View>
        </View>

        {/* 4. Core Rules */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>4. Architectural Rules</Text>
          <View style={styles.divider} />
          <View style={[styles.rulesCard, { backgroundColor: colors.surfaceLow }]}>
            <Text style={[styles.ruleItem, { color: colors.text }]}>• Use whitespace as the primary layout structure.</Text>
            <Text style={[styles.ruleItem, { color: colors.text }]}>• One primary action per screen context.</Text>
            <Text style={[styles.ruleItem, { color: colors.text }]}>• No sharp corners (minimum sm/4px rounding).</Text>
            <Text style={[styles.ruleItem, { color: colors.text }]}>• Stack surface levels to display spatial depth rather than shadows.</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
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
  scrollContainer: {
    padding: Spacing.four,
    gap: Spacing.five,
  },
  section: {
    gap: Spacing.two,
  },
  editorialTitle: {
    fontFamily: Fonts.headlineBold,
    fontSize: 24,
    marginBottom: Spacing.one,
  },
  editorialDesc: {
    fontFamily: Fonts.body,
    fontSize: 14,
    lineHeight: 22,
  },
  sectionTitle: {
    fontFamily: Fonts.bodyBold,
    fontSize: 15,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(195, 198, 213, 0.15)',
    marginVertical: Spacing.half,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  colorBadgeContainer: {
    width: '47%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  colorBlock: {
    width: 36,
    height: 36,
    borderRadius: Roundness.sm,
    borderWidth: 1,
  },
  colorBadgeInfo: {
    flex: 1,
  },
  colorBadgeName: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 12,
  },
  colorBadgeHex: {
    fontFamily: Fonts.label,
    fontSize: 10,
    marginTop: 2,
  },
  specimenRow: {
    paddingVertical: Spacing.two,
    gap: Spacing.one,
  },
  specimenLabel: {
    fontFamily: Fonts.label,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  specimenHeading: {
    fontFamily: Fonts.headline,
    fontSize: 24,
  },
  specimenBody: {
    fontFamily: Fonts.body,
    fontSize: 14,
    lineHeight: 20,
  },
  specimenUiLabel: {
    fontFamily: Fonts.labelBold,
    fontSize: 13,
    letterSpacing: 1,
  },
  specimenDesc: {
    fontFamily: Fonts.body,
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 2,
  },
  roundnessRow: {
    flexDirection: 'row',
    gap: Spacing.three,
    justifyContent: 'space-between',
  },
  roundnessSpecimen: {
    flex: 1,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roundnessText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 12,
  },
  rulesCard: {
    padding: Spacing.three,
    borderRadius: Roundness.default,
    gap: Spacing.two,
  },
  ruleItem: {
    fontFamily: Fonts.body,
    fontSize: 13,
    lineHeight: 20,
  },
});
