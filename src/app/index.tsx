import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAppStore } from '../lib/store';
import { QuizMode } from '../lib/quiz-engine';
import BasinPicker from '../components/BasinPicker';
import { COLORS, SPACING, RADIUS } from '../constants/theme';
import { getLearnedCount, getDatabase } from '../lib/database';
import { getAllWatersheds } from '../lib/geo-utils';

const MODES: { key: QuizMode; label: string; desc: string }[] = [
  { key: 'explore', label: 'Explore', desc: 'Tap to reveal names. No timer.' },
  { key: 'tap-to-name', label: 'Tap to Name', desc: 'See the name, tap the polygon.' },
  { key: 'name-the-tap', label: 'Name the Tap', desc: 'See the polygon, type the name.' },
  { key: 'speed-round', label: 'Speed Round', desc: 'Type names as fast as you can!' },
];

export default function HomeScreen() {
  const router = useRouter();
  const selectedBasin = useAppStore((s) => s.selectedBasin);
  const selectedMode = useAppStore((s) => s.selectedMode);
  const setBasin = useAppStore((s) => s.setBasin);
  const setMode = useAppStore((s) => s.setMode);
  const initQuiz = useAppStore((s) => s.initQuiz);

  const [learned, setLearned] = useState(0);
  const totalWatersheds = getAllWatersheds().length;

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

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        <Text style={styles.title}>CT Watershed Quiz</Text>
        <Text style={styles.subtitle}>
          Learn Connecticut's {totalWatersheds} HUC-12 subwatersheds
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

        <Text style={styles.sectionTitle}>Select Basin</Text>
        <BasinPicker selected={selectedBasin} onSelect={setBasin} />

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
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
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
