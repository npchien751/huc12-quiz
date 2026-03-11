import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TextInput, Pressable } from 'react-native';
import { useAppStore } from '../lib/store';
import { formatTime } from '../lib/quiz-engine';
import { COLORS, SPACING, RADIUS } from '../constants/theme';

interface Props {
  onGiveUp: () => void;
}

export default function QuizHUD({ onGiveUp }: Props) {
  const quiz = useAppStore((s) => s.quiz);
  const tick = useAppStore((s) => s.tick);
  const skip = useAppStore((s) => s.skip);
  const submitGuess = useAppStore((s) => s.submitGuess);
  const inputRef = useRef<TextInput>(null);
  const [inputText, setInputText] = React.useState('');

  // Timer
  useEffect(() => {
    if (!quiz || quiz.status !== 'active' || quiz.mode === 'explore') return;

    const interval = setInterval(() => {
      tick();
    }, 1000);

    return () => clearInterval(interval);
  }, [quiz?.status, quiz?.mode, tick]);

  if (!quiz || quiz.mode === 'explore') return null;

  const total = quiz.watersheds.length;
  const answered = quiz.found.size + quiz.missed.size;
  const needsInput = quiz.mode === 'name-the-tap' || quiz.mode === 'speed-round';

  const handleSubmit = () => {
    if (!inputText.trim()) return;
    const result = submitGuess(inputText.trim());
    if (result.matchedHuc12 || quiz.mode === 'name-the-tap') {
      setInputText('');
    }
    if (quiz.mode === 'name-the-tap' && !result.matchedHuc12) {
      // Wrong answer — flash or shake could go here
    }
  };

  const promptText =
    quiz.mode === 'tap-to-name' && quiz.current
      ? `Tap: ${quiz.current.name}`
      : quiz.mode === 'name-the-tap' && quiz.current
      ? 'Name the highlighted watershed'
      : quiz.mode === 'speed-round'
      ? 'Type watershed names!'
      : '';

  return (
    <>
      {/* Top bar */}
      <View style={styles.topBar}>
        {promptText ? (
          <Text style={styles.prompt} numberOfLines={1}>
            {promptText}
          </Text>
        ) : null}
        <View style={styles.statsRow}>
          <Text style={styles.score}>
            {quiz.score} / {total}
          </Text>
          <Text style={styles.progress}>
            {answered} answered
          </Text>
          {quiz.timeRemaining > 0 && (
            <Text
              style={[
                styles.timer,
                quiz.timeRemaining <= 30 && styles.timerWarning,
              ]}
            >
              {formatTime(quiz.timeRemaining)}
            </Text>
          )}
        </View>
      </View>

      {/* Bottom bar */}
      <View style={styles.bottomBar}>
        {needsInput && (
          <TextInput
            ref={inputRef}
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={handleSubmit}
            placeholder={
              quiz.mode === 'speed-round'
                ? 'Type a watershed name...'
                : 'Type the name...'
            }
            placeholderTextColor={COLORS.textMuted}
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="go"
          />
        )}
        <View style={styles.buttonRow}>
          {quiz.mode === 'tap-to-name' && (
            <Pressable style={styles.skipButton} onPress={skip}>
              <Text style={styles.skipText}>Skip</Text>
            </Pressable>
          )}
          {quiz.mode === 'name-the-tap' && (
            <Pressable style={styles.skipButton} onPress={skip}>
              <Text style={styles.skipText}>Skip</Text>
            </Pressable>
          )}
          <Pressable style={styles.giveUpButton} onPress={onGiveUp}>
            <Text style={styles.giveUpText}>Give Up</Text>
          </Pressable>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.overlay,
    paddingTop: 50,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  prompt: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  score: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
  },
  progress: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  timer: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  timerWarning: {
    color: COLORS.error,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.overlay,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: 34,
  },
  input: {
    backgroundColor: COLORS.surface,
    color: COLORS.text,
    fontSize: 18,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.sm,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: SPACING.sm,
  },
  skipButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: RADIUS.sm,
  },
  skipText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  giveUpButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.error + '33',
    borderRadius: RADIUS.sm,
  },
  giveUpText: {
    color: COLORS.error,
    fontSize: 14,
    fontWeight: '500',
  },
});
