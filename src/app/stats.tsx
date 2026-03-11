import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { COLORS, SPACING, RADIUS } from '../constants/theme';
import { BASINS } from '../constants/basins';
import {
  getRecentAttempts,
  getWatershedStats,
  QuizAttempt,
  WatershedStat,
} from '../lib/database';
import { getAllWatersheds } from '../lib/geo-utils';

export default function StatsScreen() {
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [stats, setStats] = useState<WatershedStat[]>([]);
  const totalWatersheds = getAllWatersheds().length;

  useEffect(() => {
    getRecentAttempts(20).then(setAttempts).catch(() => {});
    getWatershedStats().then(setStats).catch(() => {});
  }, []);

  const learnedCount = stats.filter(
    (s) => s.times_correct >= 3 && s.times_correct / (s.times_correct + s.times_missed) > 0.8
  ).length;

  const weakest = stats
    .filter((s) => s.times_missed > 0)
    .sort(
      (a, b) =>
        b.times_missed / (b.times_correct + b.times_missed) -
        a.times_missed / (a.times_correct + a.times_missed)
    )
    .slice(0, 10);

  const allWatersheds = getAllWatersheds();
  const getWatershedName = (huc12: string) =>
    allWatersheds.find((w) => w.huc12 === huc12)?.name || huc12;

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        {/* Overall progress */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Overall Progress</Text>
          <Text style={styles.bigNumber}>
            {learnedCount} / {totalWatersheds}
          </Text>
          <Text style={styles.cardSubtext}>watersheds learned</Text>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${(learnedCount / totalWatersheds) * 100}%` },
              ]}
            />
          </View>
        </View>

        {/* Per-basin progress */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Basin Progress</Text>
          {BASINS.map((basin) => {
            const basinWatersheds = allWatersheds.filter(
              (w) => w.huc8Code === basin.code
            );
            if (basinWatersheds.length === 0) return null;

            const basinLearned = basinWatersheds.filter((w) => {
              const s = stats.find((st) => st.huc12 === w.huc12);
              return (
                s &&
                s.times_correct >= 3 &&
                s.times_correct / (s.times_correct + s.times_missed) > 0.8
              );
            }).length;

            return (
              <View key={basin.code} style={styles.basinRow}>
                <View style={styles.basinHeader}>
                  <View
                    style={[styles.dot, { backgroundColor: basin.color }]}
                  />
                  <Text style={styles.basinName}>{basin.name}</Text>
                  <Text style={styles.basinCount}>
                    {basinLearned}/{basinWatersheds.length}
                  </Text>
                </View>
                <View style={styles.basinBar}>
                  <View
                    style={[
                      styles.basinFill,
                      {
                        width: `${(basinLearned / basinWatersheds.length) * 100}%`,
                        backgroundColor: basin.color,
                      },
                    ]}
                  />
                </View>
              </View>
            );
          })}
        </View>

        {/* Weakest watersheds */}
        {weakest.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Weakest Watersheds</Text>
            {weakest.map((s) => {
              const acc = Math.round(
                (s.times_correct / (s.times_correct + s.times_missed)) * 100
              );
              return (
                <View key={s.huc12} style={styles.weakRow}>
                  <Text style={styles.weakName}>
                    {getWatershedName(s.huc12)}
                  </Text>
                  <Text
                    style={[
                      styles.weakAcc,
                      acc < 50 ? styles.poor : styles.ok,
                    ]}
                  >
                    {acc}%
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Recent attempts */}
        {attempts.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Recent Quizzes</Text>
            {attempts.map((a) => (
              <View key={a.id} style={styles.attemptRow}>
                <View>
                  <Text style={styles.attemptMode}>
                    {a.mode.replace(/-/g, ' ')}
                  </Text>
                  <Text style={styles.attemptDate}>
                    {formatDate(a.completed_at)}
                  </Text>
                </View>
                <Text style={styles.attemptScore}>
                  {a.score}/{a.total}
                </Text>
              </View>
            ))}
          </View>
        )}

        {attempts.length === 0 && stats.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              No quiz attempts yet. Start playing to see your stats!
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  container: { flex: 1 },
  content: { padding: SPACING.md, gap: SPACING.md, paddingBottom: 40 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
  },
  cardTitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: SPACING.sm,
  },
  cardSubtext: {
    color: COLORS.textMuted,
    fontSize: 13,
    marginBottom: SPACING.sm,
  },
  bigNumber: {
    color: COLORS.text,
    fontSize: 36,
    fontWeight: '700',
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
  basinRow: { marginBottom: SPACING.sm },
  basinHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  basinName: { color: COLORS.text, fontSize: 14, flex: 1 },
  basinCount: { color: COLORS.textMuted, fontSize: 12 },
  basinBar: {
    height: 4,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 2,
    overflow: 'hidden',
  },
  basinFill: { height: '100%', borderRadius: 2 },
  weakRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  weakName: { color: COLORS.text, fontSize: 14 },
  weakAcc: { fontSize: 14, fontWeight: '600' },
  poor: { color: COLORS.error },
  ok: { color: COLORS.warning },
  attemptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceLight,
  },
  attemptMode: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  attemptDate: { color: COLORS.textMuted, fontSize: 12 },
  attemptScore: { color: COLORS.text, fontSize: 16, fontWeight: '600' },
  empty: { alignItems: 'center', paddingVertical: SPACING.xl },
  emptyText: { color: COLORS.textMuted, fontSize: 15, textAlign: 'center' },
});
