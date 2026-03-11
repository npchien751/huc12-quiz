import React, { useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  Modal,
  ScrollView,
} from 'react-native';
import { useAppStore } from '../lib/store';
import { COLORS, SPACING, RADIUS } from '../constants/theme';
import { saveQuizAttempt, updateWatershedStats } from '../lib/database';
import { getAllWatersheds } from '../lib/geo-utils';

interface Props {
  visible: boolean;
  onRetry: () => void;
  onHome: () => void;
}

export default function ResultsModal({ visible, onRetry, onHome }: Props) {
  const quiz = useAppStore((s) => s.quiz);

  useEffect(() => {
    if (!visible || !quiz || quiz.status !== 'finished') return;

    const timeUsed = Math.round((Date.now() - quiz.startedAt) / 1000);
    saveQuizAttempt(
      quiz.mode,
      quiz.basin === 'all' ? 'all' : quiz.basin,
      quiz.score,
      quiz.watersheds.length,
      timeUsed
    ).catch(console.error);

    updateWatershedStats(
      Array.from(quiz.found),
      Array.from(quiz.missed)
    ).catch(console.error);
  }, [visible, quiz?.status]);

  if (!quiz) return null;

  const total = quiz.watersheds.length;
  const correct = quiz.found.size;
  const missed = quiz.missed.size;
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;

  const missedWatersheds = quiz.watersheds.filter((w) =>
    quiz.missed.has(w.huc12)
  );

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>Quiz Complete!</Text>

          <View style={styles.scoreCard}>
            <Text style={styles.scoreMain}>
              {correct} / {total}
            </Text>
            <Text
              style={[
                styles.percentage,
                pct >= 80
                  ? styles.great
                  : pct >= 50
                  ? styles.ok
                  : styles.poor,
              ]}
            >
              {pct}%
            </Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{correct}</Text>
              <Text style={styles.statLabel}>Correct</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: COLORS.error }]}>
                {missed}
              </Text>
              <Text style={styles.statLabel}>Missed</Text>
            </View>
          </View>

          {missedWatersheds.length > 0 && (
            <View style={styles.missedSection}>
              <Text style={styles.missedTitle}>Missed Watersheds:</Text>
              <ScrollView style={styles.missedList}>
                {missedWatersheds.map((w) => (
                  <Text key={w.huc12} style={styles.missedItem}>
                    {w.name} ({w.huc8Name})
                  </Text>
                ))}
              </ScrollView>
            </View>
          )}

          <View style={styles.buttons}>
            <Pressable style={styles.retryButton} onPress={onRetry}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
            <Pressable style={styles.homeButton} onPress={onHome}>
              <Text style={styles.homeText}>Home</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modal: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  title: {
    color: COLORS.text,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  scoreCard: {
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  scoreMain: {
    color: COLORS.text,
    fontSize: 36,
    fontWeight: '700',
  },
  percentage: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: SPACING.xs,
  },
  great: { color: COLORS.success },
  ok: { color: COLORS.warning },
  poor: { color: COLORS.error },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: RADIUS.md,
  },
  statItem: { alignItems: 'center' },
  statValue: {
    color: COLORS.success,
    fontSize: 22,
    fontWeight: '700',
  },
  statLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  missedSection: {
    marginBottom: SPACING.md,
  },
  missedTitle: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  missedList: {
    maxHeight: 150,
  },
  missedItem: {
    color: COLORS.text,
    fontSize: 13,
    paddingVertical: 3,
  },
  buttons: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  retryButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.sm + 4,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  retryText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  homeButton: {
    flex: 1,
    backgroundColor: COLORS.surfaceLight,
    paddingVertical: SPACING.sm + 4,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  homeText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
  },
});
