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
  getWatershedsByState,
  getWatershedsByHuc6,
  getWatershedsByBasin,
  matchesName,
} from './geo-utils';

export type FilterType = 'all' | 'state' | 'huc06' | 'huc08';

interface AppStore {
  // Quiz configuration
  filterType: FilterType;
  filterValue: string; // state code, huc6 code, huc8 code, or '' for 'all'
  selectedMode: QuizMode;

  // Quiz state
  quiz: QuizState | null;

  // Explore mode state
  revealedIds: Set<string>;
  showAllNames: boolean;

  // Actions
  setFilterType: (type: FilterType) => void;
  setFilterValue: (value: string) => void;
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

  // Derived helpers
  getSelectedWatersheds: () => Watershed[];
}

export const useAppStore = create<AppStore>((set, get) => ({
  filterType: 'all',
  filterValue: '',
  selectedMode: 'explore',
  quiz: null,
  revealedIds: new Set(),
  showAllNames: false,

  setFilterType: (type) => set({ filterType: type, filterValue: '' }),
  setFilterValue: (value) => set({ filterValue: value }),
  setMode: (mode) => set({ selectedMode: mode }),

  getSelectedWatersheds: () => {
    const { filterType, filterValue } = get();
    switch (filterType) {
      case 'state':  return filterValue ? getWatershedsByState(filterValue) : getAllWatersheds();
      case 'huc06':  return filterValue ? getWatershedsByHuc6(filterValue) : getAllWatersheds();
      case 'huc08':  return filterValue ? getWatershedsByBasin(filterValue) : getAllWatersheds();
      default:       return getAllWatersheds();
    }
  },

  initQuiz: () => {
    const { filterType, filterValue, selectedMode, getSelectedWatersheds } = get();
    const watersheds = getSelectedWatersheds();

    const quiz = createQuizState({
      mode: selectedMode,
      basin: filterType === 'huc08' ? filterValue : filterType === 'state' ? filterValue : 'all',
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
