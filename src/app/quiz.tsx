import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Pressable, Text } from 'react-native';
import { useRouter } from 'expo-router';
import WatershedMap from '../components/WatershedMap';
import QuizHUD from '../components/QuizHUD';
import ResultsModal from '../components/ResultsModal';
import { useAppStore } from '../lib/store';
import { COLORS, SPACING, RADIUS } from '../constants/theme';

export default function QuizScreen() {
  const router = useRouter();
  const quiz = useAppStore((s) => s.quiz);
  const start = useAppStore((s) => s.start);
  const reset = useAppStore((s) => s.reset);
  const initQuiz = useAppStore((s) => s.initQuiz);
  const toggleShowAll = useAppStore((s) => s.toggleShowAll);
  const showAllNames = useAppStore((s) => s.showAllNames);
  const [showResults, setShowResults] = useState(false);

  // Auto-start explore mode; show countdown for quiz modes
  useEffect(() => {
    if (!quiz) {
      router.replace('/');
      return;
    }
    if (quiz.mode === 'explore') {
      start();
    }
  }, []);

  // Detect quiz finish
  useEffect(() => {
    if (quiz?.status === 'finished') {
      setShowResults(true);
    }
  }, [quiz?.status]);

  if (!quiz) return null;

  const handleStart = () => {
    start();
  };

  const handleGiveUp = () => {
    // Mark remaining as missed and finish
    const store = useAppStore.getState();
    if (store.quiz) {
      let state = store.quiz;
      while (state.current && state.status === 'active') {
        const missed = new Set(state.missed);
        missed.add(state.current.huc12);
        const queue = [...state.queue];
        const next = queue.shift() || null;
        state = {
          ...state,
          missed,
          queue,
          current: next,
          status: next ? state.status : 'finished',
        };
      }
      if (state.status !== 'finished') {
        state = { ...state, status: 'finished' };
      }
      useAppStore.setState({ quiz: state });
    }
  };

  const handleRetry = () => {
    setShowResults(false);
    initQuiz();
    setTimeout(() => start(), 100);
  };

  const handleHome = () => {
    setShowResults(false);
    reset();
    router.replace('/');
  };

  return (
    <View style={styles.container}>
      <WatershedMap filterBasin={quiz.basin} />

      {/* Explore mode: show all toggle + back button */}
      {quiz.mode === 'explore' && (
        <View style={styles.exploreBar}>
          <Pressable style={styles.backButton} onPress={handleHome}>
            <Text style={styles.backText}>Back</Text>
          </Pressable>
          <Pressable
            style={[styles.toggleButton, showAllNames && styles.toggleActive]}
            onPress={toggleShowAll}
          >
            <Text style={styles.toggleText}>
              {showAllNames ? 'Hide All' : 'Show All'}
            </Text>
          </Pressable>
        </View>
      )}

      {/* Quiz not started yet: start overlay */}
      {quiz.mode !== 'explore' && quiz.status === 'idle' && (
        <View style={styles.startOverlay}>
          <View style={styles.startCard}>
            <Text style={styles.startTitle}>Ready?</Text>
            <Text style={styles.startSubtitle}>
              {quiz.watersheds.length} watersheds
            </Text>
            <Pressable style={styles.startButton} onPress={handleStart}>
              <Text style={styles.startButtonText}>Start</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* HUD overlay during active quiz */}
      {quiz.mode !== 'explore' && quiz.status === 'active' && (
        <QuizHUD onGiveUp={handleGiveUp} />
      )}

      <ResultsModal
        visible={showResults}
        onRetry={handleRetry}
        onHome={handleHome}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  exploreBar: {
    position: 'absolute',
    top: 50,
    left: SPACING.md,
    right: SPACING.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  backButton: {
    backgroundColor: COLORS.overlay,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
  },
  backText: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '500',
  },
  toggleButton: {
    backgroundColor: COLORS.overlay,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
  },
  toggleActive: {
    backgroundColor: COLORS.primary + '99',
  },
  toggleText: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '500',
  },
  startOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  startCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.xl,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    minWidth: 250,
  },
  startTitle: {
    color: COLORS.text,
    fontSize: 28,
    fontWeight: '700',
  },
  startSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 16,
    marginTop: SPACING.xs,
    marginBottom: SPACING.lg,
  },
  startButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl + SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
  },
  startButtonText: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: '700',
  },
});
