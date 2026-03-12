import { create } from 'zustand';
import {
  QuizMode,
  QuizState,
  createQuizState,
  startQuiz,
  handleCorrectAnswer,
  handleWrongAnswer,
  handleSkip,
  handleTimerTick,
  handleSpeedRoundGuess,
} from './quiz-engine';
import {
  Watershed,
  getAllWatersheds,
  getWatershedsByBasin,
  matchesName,
} from './geo-utils';

interface AppStore {
  // Quiz configuration
  selectedBasin: string | 'all';
  selectedMode: QuizMode;

  // Quiz state
  quiz: QuizState | null;

  // Explore mode state
  revealedIds: Set<string>;
  showAllNames: boolean;

  // Actions
  setBasin: (basin: string | 'all') => void;
  setMode: (mode: QuizMode) => void;
  initQuiz: () => void;
  start: () => void;
  tapPolygon: (huc12: string) => void;
  submitGuess: (input: string) => { matchedHuc12: string | null };
  skip: () => void;
  tick: () => void;
  toggleReveal: (huc12: string) => void;
  toggleShowAll: () => void;
  reset: () => void;
}

export const useAppStore = create<AppStore>((set, get) => ({
  selectedBasin: 'all',
  selectedMode: 'explore',
  quiz: null,
  revealedIds: new Set(),
  showAllNames: false,

  setBasin: (basin) => set({ selectedBasin: basin }),
  setMode: (mode) => set({ selectedMode: mode }),

  initQuiz: () => {
    const { selectedBasin, selectedMode } = get();
    const watersheds =
      selectedBasin === 'all'
        ? getAllWatersheds()
        : getWatershedsByBasin(selectedBasin);

    const quiz = createQuizState({
      mode: selectedMode,
      basin: selectedBasin,
      watersheds,
    });

    set({
      quiz,
      revealedIds: new Set(),
      showAllNames: false,
    });
  },

  start: () => {
    const { quiz } = get();
    if (quiz) set({ quiz: startQuiz(quiz) });
  },

  tapPolygon: (huc12) => {
    const { quiz, revealedIds } = get();
    if (!quiz) return;

    if (quiz.mode === 'explore') {
      const newRevealed = new Set(revealedIds);
      if (newRevealed.has(huc12)) {
        newRevealed.delete(huc12);
      } else {
        newRevealed.add(huc12);
      }
      set({ revealedIds: newRevealed });
      return;
    }

    if (quiz.mode === 'tap-to-name' && quiz.status === 'active' && quiz.current) {
      if (huc12 === quiz.current.huc12) {
        set({ quiz: handleCorrectAnswer(quiz, huc12) });
      } else {
        set({ quiz: handleWrongAnswer(quiz, huc12) });
      }
      return;
    }
  },

  submitGuess: (input) => {
    const { quiz } = get();
    if (!quiz) return { matchedHuc12: null };

    if (quiz.mode === 'name-the-tap' && quiz.current) {
      if (matchesName(input, quiz.current.name)) {
        set({ quiz: handleCorrectAnswer(quiz, quiz.current.huc12) });
        return { matchedHuc12: quiz.current.huc12 };
      }
      return { matchedHuc12: null };
    }

    if (quiz.mode === 'speed-round') {
      const result = handleSpeedRoundGuess(quiz, input, matchesName);
      if (result.matchedHuc12) {
        set({ quiz: result.state });
      }
      return { matchedHuc12: result.matchedHuc12 };
    }

    return { matchedHuc12: null };
  },

  skip: () => {
    const { quiz } = get();
    if (quiz) set({ quiz: handleSkip(quiz) });
  },

  tick: () => {
    const { quiz } = get();
    if (quiz) set({ quiz: handleTimerTick(quiz) });
  },

  toggleReveal: (huc12) => {
    const { revealedIds } = get();
    const newRevealed = new Set(revealedIds);
    if (newRevealed.has(huc12)) {
      newRevealed.delete(huc12);
    } else {
      newRevealed.add(huc12);
    }
    set({ revealedIds: newRevealed });
  },

  toggleShowAll: () => set((s) => ({ showAllNames: !s.showAllNames })),

  reset: () => set({ quiz: null, revealedIds: new Set(), showAllNames: false }),
}));
