import React, { useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAppStore, FilterType } from '../lib/store';
import { QuizMode } from '../lib/quiz-engine';
import BasinPicker from '../components/BasinPicker';
import { COLORS, SPACING, RADIUS } from '../constants/theme';
import { getLearnedCount, getDatabase } from '../lib/database';
import {
  getAllWatersheds,
  getAllHuc6Basins,
  getWatershedsByState,
  getWatershedsByHuc6,
  RegionItem,
} from '../lib/geo-utils';
import { STATES } from '../constants/basins';

const MODES: { key: QuizMode; label: string; desc: string }[] = [
  { key: 'explore', label: 'Explore', desc: 'Tap to reveal names. No timer.' },
  { key: 'tap-to-name', label: 'Tap to Name', desc: 'See the name, tap the polygon.' },
  { key: 'name-the-tap', label: 'Name the Tap', desc: 'See the polygon, type the name.' },
  { key: 'speed-round', label: 'Speed Round', desc: 'Type names as fast as you can!' },
];

const FILTER_TABS: { key: FilterType; label: string }[] = [
  { key: 'state', label: 'By State' },
  { key: 'huc06', label: 'By Watershed (HUC-06)' },
];

export default function HomeScreen() {
  const router = useRouter();
  const filterType = useAppStore((s) => s.filterType);
  const filterValue = useAppStore((s) => s.filterValue);
  const selectedMode = useAppStore((s) => s.selectedMode);
  const setFilterType = useAppStore((s) => s.setFilterType);
  const setFilterValue = useAppStore((s) => s.setFilterValue);
  const setMode = useAppStore((s) => s.setMode);
  const initQuiz = useAppStore((s) => s.initQuiz);

  const [learned, setLearned] = useState(0);
  const totalWatersheds = useMemo(() => getAllWatersheds().length, []);

  // Build the list items for the current tab
  const stateItems = useMemo<RegionItem[]>(() => {
    return STATES.map((s) => ({
      code: s.code,
      name: s.name,
      color: s.color,
      count: getWatershedsByState(s.code).length,
    }));
  }, []);

  const huc6Items = useMemo<RegionItem[]>(() => getAllHuc6Basins(), []);

  // Count for the selected filter value
  const selectedCount = useMemo(() => {
    if (filterValue === '' || filterType === 'all') return totalWatersheds;
    if (filterType === 'state') return getWatershedsByState(filterValue).length;
    if (filterType === 'huc06') return getWatershedsByHuc6(filterValue).length;
    return totalWatersheds;
  }, [filterType, filterValue, totalWatersheds]);

  useEffect(() => {
    getDatabase()
      .then(() => getLearnedCount())
      .then(setLearned)
      .catch(() => {});
  }, []);

  const handleStart = () => {
    initQuiz();
    router.push('/quiz');
  };

  const handleTabPress = (tab: FilterType) => {
    setFilterType(tab);
  };

  const items = filterType === 'huc06' ? huc6Items : stateItems;
  const allLabel = filterType === 'huc06' ? 'All New England' : 'All New England';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        <Text style={styles.title}>New England{'\n'}Watershed Quiz</Text>
        <Text style={styles.subtitle}>
          Learn all {totalWatersheds} HUC-12 subwatersheds
        </Text>

        {learned > 0 && (
          <View style={styles.progressCard}>
            <Text style={styles.progressText}>
              You've learned {learned} / {totalWatersheds} watersheds
            </Text>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${(learned / totalWatersheds) * 100}%` },
                ]}
              />
            </View>
          </View>
        )}

        {/* Filter type toggle */}
        <Text style={styles.sectionTitle}>Filter By</Text>
        <View style={styles.tabRow}>
          {FILTER_TABS.map((tab) => (
            <Pressable
              key={tab.key}
              style={[styles.tab, filterType === tab.key && styles.tabActive]}
              onPress={() => handleTabPress(tab.key)}
            >
              <Text
                style={[
                  styles.tabLabel,
                  filterType === tab.key && styles.tabLabelActive,
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Region picker */}
        <View style={styles.pickerWrapper}>
          <BasinPicker
            items={items}
            selected={filterValue === '' ? 'all' : filterValue}
            allLabel={allLabel}
            allCount={totalWatersheds}
            onSelect={(code) => setFilterValue(code === 'all' ? '' : code)}
          />
        </View>

        {selectedCount > 0 && filterValue !== '' && (
          <Text style={styles.selectionNote}>
            {selectedCount} watersheds selected
          </Text>
        )}

        {/* Quiz mode */}
        <Text style={[styles.sectionTitle, { marginTop: SPACING.lg }]}>
          Quiz Mode
        </Text>
        <View style={styles.modes}>
          {MODES.map((m) => (
            <Pressable
              key={m.key}
              style={[
                styles.modeItem,
                selectedMode === m.key && styles.modeSelected,
              ]}
              onPress={() => setMode(m.key)}
            >
              <Text
                style={[
                  styles.modeLabel,
                  selectedMode === m.key && styles.modeLabelSelected,
                ]}
              >
                {m.label}
              </Text>
              <Text style={styles.modeDesc}>{m.desc}</Text>
            </Pressable>
          ))}
        </View>

        <Pressable style={styles.startButton} onPress={handleStart}>
          <Text style={styles.startText}>
            {selectedMode === 'explore' ? 'Start Exploring' : 'Start Quiz'}
          </Text>
        </Pressable>

        <Pressable
          style={styles.statsLink}
          onPress={() => router.push('/stats')}
        >
          <Text style={styles.statsLinkText}>View Stats</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: SPACING.lg,
    paddingTop: 60,
  },
  title: {
    color: COLORS.text,
    fontSize: 30,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 36,
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 15,
    textAlign: 'center',
    marginTop: SPACING.xs,
    marginBottom: SPACING.lg,
  },
  progressCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.lg,
  },
  progressText: {
    color: COLORS.text,
    fontSize: 14,
    marginBottom: SPACING.sm,
  },
  progressBar: {
    height: 6,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.success,
    borderRadius: 3,
  },
  sectionTitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: SPACING.sm,
  },
  tabRow: {
    flexDirection: 'row',
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    backgroundColor: COLORS.surface,
  },
  tabActive: {
    backgroundColor: COLORS.primary + '22',
    borderWidth: 1,
    borderColor: COLORS.primary + '66',
  },
  tabLabel: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  tabLabelActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  pickerWrapper: {
    marginBottom: SPACING.xs,
  },
  selectionNote: {
    color: COLORS.textMuted,
    fontSize: 12,
    textAlign: 'right',
    marginBottom: SPACING.xs,
  },
  modes: {
    gap: SPACING.xs,
  },
  modeItem: {
    backgroundColor: COLORS.surface,
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
  },
  modeSelected: {
    backgroundColor: COLORS.primary + '22',
    borderWidth: 1,
    borderColor: COLORS.primary + '66',
  },
  modeLabel: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
  },
  modeLabelSelected: {
    color: COLORS.primary,
  },
  modeDesc: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  startButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    marginTop: SPACING.lg,
  },
  startText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '700',
  },
  statsLink: {
    alignItems: 'center',
    marginTop: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  statsLinkText: {
    color: COLORS.textSecondary,
    fontSize: 15,
    fontWeight: '500',
  },
});
